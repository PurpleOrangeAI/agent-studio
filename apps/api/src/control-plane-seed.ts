import type {
  AgentDefinition,
  ArtifactRecord,
  EvaluationRecord,
  ExecutionRecord,
  InterventionRecord,
  MetricDelta,
  MetricSample,
  ReleaseDecision,
  Replay,
  RuntimeRegistration,
  SpanRecord,
  SystemDefinition,
  TopologyEdge,
  TopologyNode,
  TopologySnapshot,
  Workflow,
} from '@agent-studio/contracts';
import { seededReplayByRunId } from '@agent-studio/demo';

import { createSeededDemoState, type DemoStateResponse } from './demo-state.js';

export interface SeededControlPlaneState {
  runtimes: RuntimeRegistration[];
  systems: SystemDefinition[];
  agents: AgentDefinition[];
  topologySnapshots: TopologySnapshot[];
  executions: ExecutionRecord[];
  spans: SpanRecord[];
  artifacts: ArtifactRecord[];
  metrics: MetricSample[];
  interventions: InterventionRecord[];
  evaluations: EvaluationRecord[];
  releaseDecisions: ReleaseDecision[];
}

const DEMO_RUNTIME_ID = 'runtime_demo_seeded';
const DEMO_ADAPTER_ID = 'seeded-demo';
const DEMO_TIMESTAMP = '2026-04-20T13:12:00.000Z';

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function buildSystemId(workflowId: string) {
  return `system_${workflowId}`;
}

function buildAgentId(systemId: string, role: string) {
  return `agent_${slug(systemId)}_${slug(role)}`;
}

function buildNodeId(agentId: string) {
  return `node_${slug(agentId)}`;
}

function buildExecutionId(systemId: string, runId: string) {
  const systemToken = systemId.replace(/^system_/, '');
  const runToken = runId.replace(/^run_/, '');

  return `execution_${systemToken}_${runToken}`;
}

function buildRuntimeRegistration(seed: DemoStateResponse): RuntimeRegistration {
  const runtime = seed.runtimeOptions[0];

  return {
    runtimeId: DEMO_RUNTIME_ID,
    kind: runtime?.id ?? 'demo',
    adapterId: DEMO_ADAPTER_ID,
    adapterVersion: 'v1',
    label: runtime?.label ?? 'Seeded demo runtime',
    capabilities: ['workflow-import', 'topology-derivation', 'replay-seeding', 'operational-context'],
    sourceRef: 'seeded-demo-state',
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
    metadata: {
      detail: runtime?.detail ?? 'Read-only seeded control-plane dataset.',
    },
  };
}

function collectRoles(workflow: Workflow, replay: Replay) {
  return [...new Set([...workflow.steps.map((step) => step.assignedRole), ...replay.stepExecutions.map((step) => step.assignedRole)])];
}

function buildAgents(systemId: string, workflow: Workflow, replay: Replay): AgentDefinition[] {
  const phasesByRole = new Map<string, Set<string>>();

  workflow.steps.forEach((step) => {
    const phases = phasesByRole.get(step.assignedRole) ?? new Set<string>();
    phases.add(step.kind);
    phasesByRole.set(step.assignedRole, phases);
  });

  return collectRoles(workflow, replay).map((role, index) => ({
    agentId: buildAgentId(systemId, role),
    systemId,
    runtimeId: DEMO_RUNTIME_ID,
    label: role.replace(/\b\w/g, (char) => char.toUpperCase()),
    kind: index === 0 ? 'coordinator' : 'specialist',
    role,
    version: 'seeded-demo-v1',
    capabilities: [...(phasesByRole.get(role) ?? new Set<string>())].sort(),
    toolRefs: workflow.steps.filter((step) => step.assignedRole === role).flatMap((step) => (step.toolName ? [step.toolName] : [])),
    memoryRefs: [],
    status: 'active',
    metadata: {
      workflowId: workflow.workflowId,
      stepCount: workflow.steps.filter((step) => step.assignedRole === role).length,
    },
  }));
}

function buildTopologyEdges(workflow: Workflow, agentByRole: Map<string, AgentDefinition>): TopologyEdge[] {
  const stepById = new Map(workflow.steps.map((step) => [step.stepId, step] as const));
  const seen = new Set<string>();
  const edges: TopologyEdge[] = [];

  workflow.steps.forEach((step, index) => {
    const dependencyIds = step.dependsOnStepIds?.length ? step.dependsOnStepIds : index > 0 ? [workflow.steps[index - 1].stepId] : [];

    dependencyIds.forEach((dependencyId) => {
      const dependency = stepById.get(dependencyId);
      if (!dependency) {
        return;
      }

      const sourceAgent = agentByRole.get(dependency.assignedRole);
      const targetAgent = agentByRole.get(step.assignedRole);
      if (!sourceAgent || !targetAgent || sourceAgent.agentId === targetAgent.agentId) {
        return;
      }

      const key = `${sourceAgent.agentId}->${targetAgent.agentId}`;
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      edges.push({
        edgeId: `edge_${slug(key)}`,
        sourceNodeId: buildNodeId(sourceAgent.agentId),
        targetNodeId: buildNodeId(targetAgent.agentId),
        kind: 'handoff',
        label: `${dependency.title} -> ${step.title}`,
        metadata: {
          sourceStepId: dependency.stepId,
          targetStepId: step.stepId,
        },
      });
    });
  });

  return edges;
}

function buildTopologySnapshot(systemId: string, workflow: Workflow, replay: Replay, executionId: string): TopologySnapshot {
  const agents = buildAgents(systemId, workflow, replay);
  const agentByRole = new Map(agents.map((agent) => [agent.role ?? agent.label, agent] as const));
  const nodes: TopologyNode[] = agents.map((agent) => ({
    nodeId: buildNodeId(agent.agentId),
    agentId: agent.agentId,
    runtimeId: agent.runtimeId,
    label: agent.label,
    kind: agent.kind,
    role: agent.role,
    clusterId: agent.kind === 'coordinator' ? 'command' : 'specialists',
    metadata: {
      capabilities: agent.capabilities,
      toolRefs: agent.toolRefs,
    },
  }));

  return {
    snapshotId: `topology_${slug(systemId)}_${slug(executionId)}`,
    systemId,
    capturedAt: replay.run.finishedAt ?? replay.run.startedAt,
    sourceExecutionId: executionId,
    nodes,
    edges: buildTopologyEdges(workflow, agentByRole),
    layoutHints: {
      layout: 'clustered-ring',
      primaryCluster: 'command',
    },
    metadata: {
      workflowId: workflow.workflowId,
      derivedFrom: 'seeded-demo-workflow',
    },
  };
}

function buildSpanRecords(systemId: string, replay: Replay, agentByRole: Map<string, AgentDefinition>): SpanRecord[] {
  const executionId = buildExecutionId(systemId, replay.run.runId);
  const spanIdByStepId = new Map<string, string>();

  return replay.stepExecutions.map((step, index) => {
    const agent = agentByRole.get(step.assignedRole);
    const spanId = `span_${slug(executionId)}_${slug(step.stepId)}_${index + 1}`;
    const parentStepId = replay.workflow.steps.find((workflowStep) => workflowStep.stepId === step.stepId)?.dependsOnStepIds?.[0];
    const parentSpanId = parentStepId ? spanIdByStepId.get(parentStepId) : index > 0 ? spanIdByStepId.get(replay.stepExecutions[index - 1].stepId) : undefined;

    spanIdByStepId.set(step.stepId, spanId);

    return {
      spanId,
      traceId: replay.run.runId,
      executionId,
      parentSpanId,
      agentId: agent?.agentId,
      nodeId: agent ? buildNodeId(agent.agentId) : undefined,
      name: step.title,
      kind: step.kind,
      status: step.status,
      startedAt: step.startedAt ?? replay.run.startedAt,
      finishedAt: step.finishedAt ?? replay.run.finishedAt,
      summary: step.summary ?? step.error,
      usage: {
        inputTokens: step.tokenUsage?.inputTokens,
        outputTokens: step.tokenUsage?.outputTokens,
        totalTokens: step.tokenUsage?.totalTokens,
        credits: step.actualCredits,
        durationMs: step.durationMs,
        toolCalls: step.toolCalls,
      },
      attrs: {
        assignedRole: step.assignedRole,
        modelTier: step.modelTier,
        modelSource: step.modelSource,
        directiveMode: step.directiveMode,
        directivePhases: step.directivePhases,
        error: step.error,
      },
    };
  });
}

function buildArtifacts(systemId: string, replay: Replay, spans: SpanRecord[], agentByRole: Map<string, AgentDefinition>): ArtifactRecord[] {
  const executionId = buildExecutionId(systemId, replay.run.runId);
  const artifacts: ArtifactRecord[] = spans.map((span, index) => ({
    artifactId: `artifact_${slug(span.spanId)}_summary`,
    kind: 'step-summary',
    scopeType: 'span',
    scopeId: span.spanId,
    executionId,
    spanId: span.spanId,
    agentId: span.agentId,
    summary: span.summary ?? `Summary for ${span.name}`,
    metadata: {
      order: index + 1,
      workflowId: replay.workflow.workflowId,
    },
  }));

  replay.operationalContext?.recommendationEvidence.forEach((evidence) => {
    const agent = evidence.phase
      ? agentByRole.get(
          replay.stepExecutions.find((step) => step.kind === evidence.phase)?.assignedRole ??
            replay.workflow.steps.find((step) => step.kind === evidence.phase)?.assignedRole ??
            '',
        )
      : undefined;

    artifacts.push({
      artifactId: `artifact_${slug(executionId)}_${slug(evidence.evidenceId)}`,
      kind: 'evidence',
      scopeType: 'execution',
      scopeId: executionId,
      executionId,
      agentId: agent?.agentId,
      summary: evidence.body,
      derivedFromArtifactIds: [],
      metadata: {
        title: evidence.title,
        sourceLabel: evidence.sourceLabel,
        phase: evidence.phase,
        relatedRunIds: evidence.relatedRunIds,
      },
    });
  });

  return artifacts;
}

function buildExecutionMetrics(execution: ExecutionRecord, replay: Replay, spans: SpanRecord[]): MetricSample[] {
  const finishedAt = execution.finishedAt ?? execution.startedAt;
  const metrics: MetricSample[] = [
    {
      sampleId: `metric_${slug(execution.executionId)}_credits`,
      metric: 'credits.actual',
      unit: 'credits',
      value: replay.run.actualCredits ?? 0,
      ts: finishedAt,
      scopeType: 'execution',
      scopeId: execution.executionId,
    },
    {
      sampleId: `metric_${slug(execution.executionId)}_duration`,
      metric: 'duration.ms',
      unit: 'ms',
      value: replay.run.durationMs ?? 0,
      ts: finishedAt,
      scopeType: 'execution',
      scopeId: execution.executionId,
    },
    {
      sampleId: `metric_${slug(execution.executionId)}_success`,
      metric: 'success.rate',
      unit: 'ratio',
      value: replay.run.status === 'succeeded' ? 1 : 0,
      ts: finishedAt,
      scopeType: 'execution',
      scopeId: execution.executionId,
    },
  ];

  spans.forEach((span) => {
    if (span.usage?.durationMs != null) {
      metrics.push({
        sampleId: `metric_${slug(span.spanId)}_duration`,
        metric: 'span.duration.ms',
        unit: 'ms',
        value: span.usage.durationMs,
        ts: span.finishedAt ?? span.startedAt,
        scopeType: 'span',
        scopeId: span.spanId,
      });
    }

    if (span.usage?.credits != null) {
      metrics.push({
        sampleId: `metric_${slug(span.spanId)}_credits`,
        metric: 'span.credits',
        unit: 'credits',
        value: span.usage.credits,
        ts: span.finishedAt ?? span.startedAt,
        scopeType: 'span',
        scopeId: span.spanId,
      });
    }
  });

  return metrics;
}

function buildMetricDeltas(workflowState: DemoStateResponse['workflowStates'][string]): MetricDelta[] {
  const baseline = workflowState.optimize.baselineRun;
  const candidate = workflowState.optimize.candidateRun;

  return [
    {
      metric: 'credits.actual',
      unit: 'credits',
      baselineValue: baseline.actualCredits ?? 0,
      candidateValue: candidate.actualCredits ?? 0,
      delta: (candidate.actualCredits ?? 0) - (baseline.actualCredits ?? 0),
    },
    {
      metric: 'duration.ms',
      unit: 'ms',
      baselineValue: baseline.durationMs ?? 0,
      candidateValue: candidate.durationMs ?? 0,
      delta: (candidate.durationMs ?? 0) - (baseline.durationMs ?? 0),
    },
  ];
}

export function createSeededControlPlaneState(seed: DemoStateResponse = createSeededDemoState()): SeededControlPlaneState {
  const runtime = buildRuntimeRegistration(seed);
  const systems: SystemDefinition[] = [];
  const agents: AgentDefinition[] = [];
  const topologySnapshots: TopologySnapshot[] = [];
  const executions: ExecutionRecord[] = [];
  const spans: SpanRecord[] = [];
  const artifacts: ArtifactRecord[] = [];
  const metrics: MetricSample[] = [];
  const interventions: InterventionRecord[] = [];
  const evaluations: EvaluationRecord[] = [];
  const releaseDecisions: ReleaseDecision[] = [];

  Object.values(seed.workflowStates).forEach((workflowState) => {
    const workflow = workflowState.workflow;
    const systemId = buildSystemId(workflow.workflowId);
    const liveReplay = workflowState.live.replay;
    const agentRecords = buildAgents(systemId, workflow, liveReplay);
    const agentByRole = new Map(agentRecords.map((agent) => [agent.role ?? agent.label, agent] as const));
    const liveExecutionId = buildExecutionId(systemId, workflowState.live.run.runId);

    systems.push({
      systemId,
      workspaceId: workflow.workspaceId,
      name: workflow.name,
      description: workflow.description,
      runtimeIds: [DEMO_RUNTIME_ID],
      status: workflow.status,
      primaryRuntimeId: DEMO_RUNTIME_ID,
      policyRefs: workflow.policy
        ? [`policy_${slug(workflow.workflowId)}_${slug(workflow.policy.mode)}_${slug(workflow.policy.reviewPolicy)}`]
        : undefined,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      metadata: {
        workflowId: workflow.workflowId,
        schedule: workflow.schedule,
      },
    });

    agents.push(...agentRecords);

    topologySnapshots.push(buildTopologySnapshot(systemId, workflow, liveReplay, liveExecutionId));

    workflowState.runsByNewest.forEach((run) => {
      const replay = seededReplayByRunId[run.runId as keyof typeof seededReplayByRunId];
      if (!replay) {
        return;
      }

      const execution: ExecutionRecord = {
        executionId: buildExecutionId(systemId, run.runId),
        systemId,
        runtimeId: DEMO_RUNTIME_ID,
        traceId: run.runId,
        sessionId: workflow.workflowId,
        workflowId: workflow.workflowId,
        runId: run.runId,
        status: run.status,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        sourceRef: run.runId,
        metadata: {
          experimentId: run.experimentId,
          experimentLabel: run.experimentLabel,
          scenarioId: run.scenarioId,
          previewPresetId: run.previewPresetId,
        },
      };

      const spanRecords = buildSpanRecords(systemId, replay, agentByRole);
      executions.push(execution);
      spans.push(...spanRecords);
      artifacts.push(...buildArtifacts(systemId, replay, spanRecords, agentByRole));
      metrics.push(...buildExecutionMetrics(execution, replay, spanRecords));
    });

    const roleDirectives = workflowState.live.replay.studioState?.roleDirectives ?? {};
    Object.entries(roleDirectives).forEach(([role, directive]) => {
      const agent = agentByRole.get(role);
      if (!agent) {
        return;
      }

      interventions.push({
        interventionId: `intervention_${slug(systemId)}_${slug(role)}_${slug(directive.mode)}`,
        targetScopeType: 'agent',
        targetScopeId: agent.agentId,
        actor: 'seeded-demo',
        action: `directive.${directive.mode}`,
        reason: `Imported ${directive.mode} directive for ${role}.`,
        requestedAt: directive.updatedAt ?? DEMO_TIMESTAMP,
        appliedAt: directive.updatedAt ?? DEMO_TIMESTAMP,
        outcome: 'active',
        status: 'applied',
        relatedTraceId: workflowState.live.run.runId,
        configPatch: {
          phases: directive.phases,
        },
        metadata: {
          systemId,
        },
      });
    });

    evaluations.push({
      evaluationId: `evaluation_${slug(systemId)}_${slug(workflowState.optimize.candidateRun.runId)}`,
      targetScopeType: 'system',
      targetScopeId: systemId,
      baselineRefs: [workflowState.optimize.baselineRun.runId],
      candidateRefs: [workflowState.optimize.candidateRun.runId],
      metricDeltas: buildMetricDeltas(workflowState),
      verdict: 'promote',
      createdAt: workflowState.optimize.candidateRun.finishedAt ?? DEMO_TIMESTAMP,
      summary: workflowState.optimize.promotionSummary,
      metadata: {
        candidatePlanId: workflowState.optimize.candidatePlan?.id,
      },
    });

    workflowState.optimize.promotionHistory.forEach((promotion, index) => {
      releaseDecisions.push({
        releaseId: promotion.eventId || `release_${slug(systemId)}_${index + 1}`,
        systemId,
        candidateRef:
          promotion.planId ??
          promotion.sourceExperimentId ??
          workflowState.optimize.candidateRun.runId,
        baselineRef: workflowState.optimize.baselineRun.runId,
        decision: promotion.mode === 'rollback' ? 'rollback' : 'promote',
        evidenceRefs: promotion.sourceExperimentId ? [promotion.sourceExperimentId] : undefined,
        rollbackPlan: promotion.mode === 'rollback' ? promotion.summary : undefined,
        requestedAt: promotion.appliedAt,
        appliedAt: promotion.appliedAt,
        status: 'applied',
        summary: promotion.summary,
        metadata: {
          mode: promotion.mode,
          confidence: promotion.confidence,
          creditsDelta: promotion.creditsDelta,
          durationDelta: promotion.durationDelta,
          successDelta: promotion.successDelta,
        },
      });
    });
  });

  return {
    runtimes: [runtime],
    systems,
    agents,
    topologySnapshots,
    executions,
    spans,
    artifacts,
    metrics,
    interventions,
    evaluations,
    releaseDecisions,
  };
}
