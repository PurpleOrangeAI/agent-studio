import type {
  AgentDefinition,
  DirectiveMode,
  EvaluationRecord,
  ExecutionRecord,
  InterventionRecord,
  MetricDelta,
  MetricSample,
  OperationalContext,
  PhaseKind,
  PolicySnapshot,
  PromotionEvent,
  Replay,
  ReleaseDecision,
  RoleDirectiveMap,
  Run,
  RunStatus,
  RuntimeRegistration,
  SavedPlan,
  SpanRecord,
  StepExecution,
  SystemDefinition,
  TopologySnapshot,
  Workflow,
  WorkflowStep,
} from '@agent-studio/contracts';
import type { WorkflowDemoState } from './demo';

export interface ControlPlaneSystemState {
  system: SystemDefinition;
  agents: AgentDefinition[];
  topology: TopologySnapshot | null;
  executions: ExecutionRecord[];
  executionSpans: Record<string, SpanRecord[]>;
  executionMetrics: Record<string, MetricSample[]>;
  interventions: InterventionRecord[];
  evaluations: EvaluationRecord[];
  releases: ReleaseDecision[];
}

export interface ControlPlaneStorageInfo {
  mode: 'memory' | 'file' | 'blob';
  persistenceEnabled: boolean;
  filePath: string | null;
  blobPath?: string | null;
  detail: string;
}

export interface ControlPlaneState {
  runtimes: RuntimeRegistration[];
  systems: ControlPlaneSystemState[];
  systemsByWorkflowId: Record<string, ControlPlaneSystemState>;
  storage: ControlPlaneStorageInfo;
}

export interface AgentSummary {
  agent: AgentDefinition;
  spanCount: number;
  failedSpanCount: number;
  successRate: number;
  avgDurationMs: number;
  avgCredits: number;
  totalCredits: number;
  interventionCount: number;
  activeInterventionCount: number;
  lastActiveAt: string | null;
  latestSpan: SpanRecord | null;
  latestIntervention: InterventionRecord | null;
  pressureScore: number;
}

export interface SystemSummary {
  system: SystemDefinition;
  latestExecution: ExecutionRecord | null;
  latestEvaluation: EvaluationRecord | null;
  latestRelease: ReleaseDecision | null;
  agentCount: number;
  executionCount: number;
  interventionCount: number;
  activeInterventionCount: number;
  successRate: number;
  avgDurationMs: number;
  avgCredits: number;
  lastActiveAt: string | null;
  pressureAgentId: string | null;
}

export type AnalyticsWindow = '24h' | '7d' | '30d' | 'all';
export type AgentRosterFocus = 'all' | 'attention' | 'failures' | 'directives';
export type SystemCatalogFocus = 'all' | 'attention' | 'active' | 'healthy';

export interface SystemHistoryEvent {
  eventId: string;
  kind: 'execution' | 'directive' | 'evaluation' | 'release';
  occurredAt: string;
  status: string;
  title: string;
  summary: string;
  relatedAgentId: string | null;
  relatedExecutionId: string | null;
}

export interface FleetAnalyticsSummary {
  executionCount: number;
  executionStatusCounts: {
    running: number;
    succeeded: number;
    failed: number;
  };
  totalSpans: number;
  failedSpans: number;
  activeDirectives: number;
  eventCount: number;
  successRate: number;
  avgCredits: number;
  avgDurationMs: number;
  latestEventAt: string | null;
  hottestAgents: AgentSummary[];
  recentFailures: SystemHistoryEvent[];
}

export interface FleetSummary {
  systemCount: number;
  activeSystemCount: number;
  trackedAgentCount: number;
  executionCount: number;
  activeDirectiveCount: number;
  avgSuccessRate: number;
  avgCredits: number;
  avgDurationMs: number;
  hottestSystems: SystemSummary[];
  releaseWatchlist: SystemSummary[];
}

export type OperatorRoomId = 'overview' | 'connect' | 'live' | 'replay' | 'optimize';
export type RoomReadinessState = 'ready' | 'partial' | 'needs-data' | 'next';
export type SystemReadinessStage = 'register' | 'model' | 'trace' | 'release' | 'operational';

export interface RoomReadinessSummary {
  roomId: OperatorRoomId;
  state: RoomReadinessState;
  label: string;
  detail: string;
}

export interface SystemReadinessSummary {
  stageId: SystemReadinessStage;
  stageLabel: string;
  title: string;
  body: string;
  completedSteps: number;
  totalSteps: number;
  agentCount: number;
  executionCount: number;
  spanCount: number;
  interventionCount: number;
  evaluationCount: number;
  releaseCount: number;
  hasTopology: boolean;
  roomReadiness: RoomReadinessSummary[];
}

export interface LoadControlPlaneStateOptions {
  apiBaseUrl?: string;
  fetch?: typeof globalThis.fetch;
}

export interface IngestControlPlaneOptions {
  apiBaseUrl?: string;
  fetch?: typeof globalThis.fetch;
}

export interface ControlPlaneImportBundle {
  runtimes?: RuntimeRegistration[];
  systems?: SystemDefinition[];
  agents?: AgentDefinition[];
  topologies?: TopologySnapshot[];
  executions?: ExecutionRecord[];
  spans?: SpanRecord[];
  metrics?: MetricSample[];
  interventions?: InterventionRecord[];
  evaluations?: EvaluationRecord[];
  releases?: ReleaseDecision[];
}

export const ANALYTICS_WINDOW_OPTIONS: Array<{ id: AnalyticsWindow; label: string }> = [
  { id: '24h', label: '24h' },
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: 'all', label: 'All time' },
];

export const SYSTEM_CATALOG_FOCUS_OPTIONS: Array<{ id: SystemCatalogFocus; label: string }> = [
  { id: 'all', label: 'All systems' },
  { id: 'attention', label: 'Needs attention' },
  { id: 'active', label: 'Active now' },
  { id: 'healthy', label: 'Healthy' },
];

const ANALYTICS_WINDOW_MS: Record<Exclude<AnalyticsWindow, 'all'>, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

const DEFAULT_POLICY: PolicySnapshot = {
  mode: 'recommended',
  optimizationGoal: 'balanced',
  reviewPolicy: 'standard',
  maxElasticLanes: 1,
};

function formatTokenLabel(value: string) {
  return value
    .split(/[._\s-]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function toRoleSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createSyntheticWorkflowId(systemId: string) {
  return `system:${systemId}`;
}

function coercePhaseKind(value?: string): PhaseKind {
  switch (value) {
    case 'search':
    case 'query':
    case 'capture':
    case 'analyze':
    case 'summarize':
    case 'deliver':
    case 'note':
      return value;
    default:
      return 'note';
  }
}

function coerceRunStatus(value?: string): RunStatus {
  switch (value) {
    case 'planned':
    case 'running':
    case 'succeeded':
    case 'failed':
    case 'skipped':
      return value;
    case 'active':
      return 'running';
    default:
      return 'planned';
  }
}

function parseDirectiveMode(action?: string): DirectiveMode | undefined {
  if (!action?.startsWith('directive.')) {
    return undefined;
  }

  const mode = action.slice('directive.'.length);

  if (mode === 'cheaper' || mode === 'review' || mode === 'promote') {
    return mode;
  }

  return undefined;
}

function readMetadataRecord(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  return metadata as Record<string, unknown>;
}

function readMetadataString(metadata: unknown, key: string) {
  const record = readMetadataRecord(metadata);
  const value = record?.[key];

  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function readMetricValue(metrics: MetricSample[], metric: string) {
  return metrics.find((sample) => sample.metric === metric)?.value;
}

function sortExecutionsByNewest(executions: ExecutionRecord[]) {
  return [...executions].sort((left, right) => compareByNewest(left.finishedAt ?? left.startedAt, right.finishedAt ?? right.startedAt));
}

export function getExecutionForRun(systemState: ControlPlaneSystemState | null | undefined, runId: string) {
  if (!systemState) {
    return null;
  }

  return systemState.executions.find((execution) => execution.runId === runId) ?? null;
}

export function getExecutionSpans(systemState: ControlPlaneSystemState | null | undefined, executionId?: string) {
  if (!systemState || !executionId) {
    return [];
  }

  return systemState.executionSpans[executionId] ?? [];
}

export function getExecutionMetrics(systemState: ControlPlaneSystemState | null | undefined, executionId?: string) {
  if (!systemState || !executionId) {
    return [];
  }

  return systemState.executionMetrics[executionId] ?? [];
}

export function getAgentLabel(systemState: ControlPlaneSystemState | null | undefined, agentId?: string) {
  if (!systemState || !agentId) {
    return null;
  }

  return systemState.agents.find((agent) => agent.agentId === agentId)?.label ?? null;
}

export function getLatestEvaluation(systemState: ControlPlaneSystemState | null | undefined) {
  if (!systemState) {
    return null;
  }

  return systemState.evaluations[0] ?? null;
}

export function getLatestReleaseDecision(systemState: ControlPlaneSystemState | null | undefined) {
  if (!systemState) {
    return null;
  }

  return systemState.releases[0] ?? null;
}

export function getMetricDelta(evaluation: EvaluationRecord | null | undefined, metric: string): MetricDelta | null {
  if (!evaluation?.metricDeltas?.length) {
    return null;
  }

  return evaluation.metricDeltas.find((item) => item.metric === metric) ?? null;
}

export function getWorkflowIdForSystem(systemState: ControlPlaneSystemState | null | undefined) {
  const metadata = systemState?.system.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const workflowId = (metadata as Record<string, unknown>).workflowId;

  return typeof workflowId === 'string' && workflowId.trim().length > 0 ? workflowId : null;
}

function buildWorkflowSteps(systemState: ControlPlaneSystemState): WorkflowStep[] {
  const topologyNodes = systemState.topology?.nodes ?? [];
  const topologyEdges = systemState.topology?.edges ?? [];
  const nodes =
    topologyNodes.length > 0
      ? topologyNodes.map((node) => ({
          id: node.nodeId,
          label: node.label,
          role: node.role ?? systemState.agents.find((agent) => agent.agentId === node.agentId)?.role ?? toRoleSlug(node.label),
          kind:
            systemState.executionSpans &&
            Object.values(systemState.executionSpans)
              .flat()
              .find((span) => span.nodeId === node.nodeId || (node.agentId && span.agentId === node.agentId))?.kind,
          objective:
            Object.values(systemState.executionSpans)
              .flat()
              .find((span) => span.nodeId === node.nodeId || (node.agentId && span.agentId === node.agentId))?.summary ??
            `Track ${node.label} inside ${systemState.system.name}.`,
          toolName: systemState.agents.find((agent) => agent.agentId === node.agentId)?.toolRefs?.[0],
        }))
      : systemState.agents.map((agent) => ({
          id: agent.agentId,
          label: agent.label,
          role: agent.role ?? toRoleSlug(agent.label),
          kind:
            Object.values(systemState.executionSpans)
              .flat()
              .find((span) => span.agentId === agent.agentId)?.kind ??
            agent.capabilities?.[0],
          objective:
            Object.values(systemState.executionSpans)
              .flat()
              .find((span) => span.agentId === agent.agentId)?.summary ??
            `Track ${agent.label} inside ${systemState.system.name}.`,
          toolName: agent.toolRefs?.[0],
        }));

  return nodes.map((node, index) => {
    const dependsOnStepIds =
      topologyEdges.length > 0
        ? topologyEdges.filter((edge) => edge.targetNodeId === node.id).map((edge) => edge.sourceNodeId)
        : index > 0
          ? [nodes[index - 1].id]
          : undefined;

    return {
      stepId: node.id,
      kind: coercePhaseKind(node.kind),
      title: node.label,
      objective: node.objective,
      assignedRole: node.role,
      dependsOnStepIds: dependsOnStepIds?.length ? dependsOnStepIds : undefined,
      toolName: node.toolName,
    };
  });
}

function buildSyntheticWorkflow(systemState: ControlPlaneSystemState): Workflow {
  const workflowId = createSyntheticWorkflowId(systemState.system.systemId);

  return {
    workspaceId: systemState.system.workspaceId,
    workflowId,
    name: systemState.system.name,
    description: systemState.system.description,
    status: systemState.system.status ?? 'active',
    createdAt: systemState.system.createdAt,
    updatedAt: systemState.system.updatedAt,
    steps: buildWorkflowSteps(systemState),
    policy: DEFAULT_POLICY,
  };
}

function buildRunFromExecution(workflowId: string, systemState: ControlPlaneSystemState, execution?: ExecutionRecord | null): Run {
  if (!execution) {
    const ts = systemState.system.updatedAt ?? systemState.system.createdAt ?? new Date().toISOString();

    return {
      runId: `run_${systemState.system.systemId}_pending`,
      workflowId,
      status: 'planned',
      startedAt: ts,
      experimentLabel: 'Awaiting first execution',
    };
  }

  return {
    runId: execution.runId ?? execution.executionId,
    workflowId,
    status: coerceRunStatus(execution.status),
    startedAt: execution.startedAt,
    finishedAt: execution.finishedAt,
    actualCredits: readMetricValue(getExecutionMetrics(systemState, execution.executionId), 'credits.actual'),
    durationMs: readMetricValue(getExecutionMetrics(systemState, execution.executionId), 'duration.ms'),
    experimentLabel:
      readMetadataString(execution.metadata, 'experimentLabel') ??
      readMetadataString(execution.metadata, 'scenarioLabel') ??
      `${systemState.system.name} ${formatTokenLabel(execution.status)}`,
  };
}

function buildRoleDirectives(systemState: ControlPlaneSystemState): RoleDirectiveMap | undefined {
  const directiveEntries: Array<[string, RoleDirectiveMap[string]]> = [];

  systemState.interventions
    .filter((intervention) => intervention.targetScopeType === 'agent')
    .forEach((intervention) => {
      const mode = parseDirectiveMode(intervention.action);
      const agent = systemState.agents.find((item) => item.agentId === intervention.targetScopeId);
      const role = agent?.role ?? toRoleSlug(agent?.label ?? intervention.targetScopeId);
      const phases = readMetadataRecord(intervention.configPatch)?.phases;

      if (!mode || !role) {
        return;
      }

      directiveEntries.push([
        role,
        {
          mode,
          phases: Array.isArray(phases)
            ? phases.filter((phase): phase is PhaseKind => typeof phase === 'string').map((phase) => coercePhaseKind(phase))
            : undefined,
          updatedAt: intervention.appliedAt ?? intervention.requestedAt,
        },
      ]);
    });

  const directives = Object.fromEntries(directiveEntries);

  return Object.keys(directives).length ? directives : undefined;
}

function buildStepExecutions(systemState: ControlPlaneSystemState, workflow: Workflow, execution?: ExecutionRecord | null): StepExecution[] {
  if (!execution) {
    return workflow.steps.map((step) => ({
      stepId: step.stepId,
      kind: step.kind,
      title: step.title,
      assignedRole: step.assignedRole,
      status: 'planned',
      summary: `No execution has been recorded for ${step.title} yet.`,
    }));
  }

  const spans = getExecutionSpans(systemState, execution.executionId);
  if (!spans.length) {
    return workflow.steps.map((step) => ({
      stepId: step.stepId,
      kind: step.kind,
      title: step.title,
      assignedRole: step.assignedRole,
      status: coerceRunStatus(execution.status),
      startedAt: execution.startedAt,
      finishedAt: execution.finishedAt,
      summary: `Execution ${execution.executionId} has no span breakdown yet.`,
    }));
  }

  return spans.map((span) => {
    const agent = span.agentId ? systemState.agents.find((item) => item.agentId === span.agentId) : undefined;
    const latestDirective =
      span.agentId != null
        ? systemState.interventions
            .filter((intervention) => intervention.targetScopeType === 'agent' && intervention.targetScopeId === span.agentId)
            .sort((left, right) => compareByNewest(left.appliedAt ?? left.requestedAt, right.appliedAt ?? right.requestedAt))[0]
        : undefined;
    const directivePhases = readMetadataRecord(latestDirective?.configPatch)?.phases;

    return {
      stepId: span.nodeId ?? span.agentId ?? span.spanId,
      kind: coercePhaseKind(span.kind),
      title: span.name,
      assignedRole: agent?.role ?? toRoleSlug(agent?.label ?? span.name),
      status: coerceRunStatus(span.status),
      startedAt: span.startedAt,
      finishedAt: span.finishedAt,
      durationMs: span.usage?.durationMs,
      actualCredits: span.usage?.credits,
      tokenUsage:
        span.usage?.inputTokens != null || span.usage?.outputTokens != null || span.usage?.totalTokens != null
          ? {
              inputTokens: span.usage?.inputTokens,
              outputTokens: span.usage?.outputTokens,
              totalTokens: span.usage?.totalTokens,
            }
          : undefined,
      toolCalls: span.usage?.toolCalls,
      directiveMode: parseDirectiveMode(latestDirective?.action),
      directivePhases: Array.isArray(directivePhases)
        ? directivePhases.filter((phase): phase is PhaseKind => typeof phase === 'string').map((phase) => coercePhaseKind(phase))
        : undefined,
      summary: span.summary ?? `Execution span for ${span.name}.`,
      error: span.status === 'failed' ? span.summary ?? `${span.name} failed.` : undefined,
    };
  });
}

function buildHealthyComparison(
  workflowId: string,
  selectedRun: Run,
  baselineRun: Run | null,
): OperationalContext['lastHealthyComparison'] | undefined {
  if (!baselineRun || baselineRun.runId === selectedRun.runId) {
    return undefined;
  }

  const creditsDelta =
    selectedRun.actualCredits != null && baselineRun.actualCredits != null ? selectedRun.actualCredits - baselineRun.actualCredits : undefined;
  const durationDelta =
    selectedRun.durationMs != null && baselineRun.durationMs != null ? selectedRun.durationMs - baselineRun.durationMs : undefined;

  const changedSignals = [
    creditsDelta != null && creditsDelta !== 0 ? `Spend shifted by ${creditsDelta > 0 ? '+' : ''}${creditsDelta} credits` : null,
    durationDelta != null && durationDelta !== 0 ? `Duration shifted by ${Math.round(durationDelta / 1000)} seconds` : null,
    selectedRun.status !== baselineRun.status ? `Status changed from ${baselineRun.status} to ${selectedRun.status}` : null,
  ].filter((value): value is string => value != null);

  return {
    runId: baselineRun.runId,
    label: baselineRun.experimentLabel ?? baselineRun.runId,
    startedAt: baselineRun.startedAt,
    finishedAt: baselineRun.finishedAt,
    creditsDelta,
    durationDelta,
    changedSignals,
    summary:
      changedSignals[0] ??
      `Using ${baselineRun.experimentLabel ?? baselineRun.runId} as the nearest healthy comparison for ${selectedRun.experimentLabel ?? selectedRun.runId}.`,
  };
}

function buildSimilarRuns(executions: ExecutionRecord[], selectedRun: Run, workflowId: string, systemState: ControlPlaneSystemState) {
  return sortExecutionsByNewest(executions)
    .filter((execution) => (execution.runId ?? execution.executionId) !== selectedRun.runId)
    .slice(0, 3)
    .map((execution) => {
      const comparedRun = buildRunFromExecution(workflowId, systemState, execution);
      const matchedSignals = [
        comparedRun.status === selectedRun.status ? `Both runs ended ${selectedRun.status}` : `Status diverged from ${selectedRun.status}`,
        comparedRun.actualCredits != null && selectedRun.actualCredits != null
          ? `Spend delta ${comparedRun.actualCredits - selectedRun.actualCredits > 0 ? '+' : ''}${(comparedRun.actualCredits - selectedRun.actualCredits).toFixed(0)}`
          : 'Metric comparison pending',
      ];

      return {
        runId: comparedRun.runId,
        label: comparedRun.experimentLabel ?? comparedRun.runId,
        status: comparedRun.status,
        startedAt: comparedRun.startedAt,
        finishedAt: comparedRun.finishedAt,
        actualCredits: comparedRun.actualCredits,
        durationMs: comparedRun.durationMs,
        similarityScore: comparedRun.status === selectedRun.status ? 0.86 : 0.62,
        matchedSignals,
      };
    });
}

function buildRecommendationEvidence(systemState: ControlPlaneSystemState, execution: ExecutionRecord | null | undefined, run: Run) {
  const spans = execution ? getExecutionSpans(systemState, execution.executionId) : [];
  const failedSpan = spans.find((span) => span.status === 'failed') ?? null;
  const latestIntervention = systemState.interventions[0] ?? null;
  const latestEvaluation = getLatestEvaluation(systemState);
  const latestRelease = getLatestReleaseDecision(systemState);

  const evidence = [
    failedSpan
      ? {
          evidenceId: `evidence_${failedSpan.spanId}`,
          title: `${failedSpan.name} is the current break`,
          body: failedSpan.summary ?? `${failedSpan.name} failed inside the current execution trace.`,
          sourceLabel: run.experimentLabel ?? run.runId,
          phase: coercePhaseKind(failedSpan.kind),
          relatedRunIds: [run.runId],
        }
      : null,
    latestIntervention
      ? {
          evidenceId: latestIntervention.interventionId,
          title: formatTokenLabel(latestIntervention.action),
          body: latestIntervention.reason,
          sourceLabel: 'Latest intervention',
          relatedRunIds: latestIntervention.relatedTraceId ? [latestIntervention.relatedTraceId] : undefined,
        }
      : null,
    latestEvaluation
      ? {
          evidenceId: latestEvaluation.evaluationId,
          title: `${formatTokenLabel(latestEvaluation.verdict)} evaluation`,
          body: latestEvaluation.summary ?? 'Latest evaluation imported into the control plane.',
          sourceLabel: 'Latest evaluation',
          relatedRunIds: [...latestEvaluation.baselineRefs, ...latestEvaluation.candidateRefs],
        }
      : null,
    latestRelease
      ? {
          evidenceId: latestRelease.releaseId,
          title: `${formatTokenLabel(latestRelease.decision)} release`,
          body: latestRelease.summary ?? 'Latest release decision imported into the control plane.',
          sourceLabel: 'Latest release',
          relatedRunIds: [latestRelease.candidateRef, latestRelease.baselineRef].filter((value): value is string => Boolean(value)),
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item != null);

  return evidence.length
    ? evidence
    : [
        {
          evidenceId: `evidence_${systemState.system.systemId}_pending`,
          title: 'Import more execution evidence',
          body: 'This system has enough registry data to render, but Replay and Optimize will get stronger once more spans, evaluations, and releases land.',
          sourceLabel: 'System registry',
          relatedRunIds: [run.runId],
        },
      ];
}

function buildReplayFromExecution(
  systemState: ControlPlaneSystemState,
  workflow: Workflow,
  run: Run,
  baselineRun: Run | null,
  execution?: ExecutionRecord | null,
): Replay {
  return {
    workflow,
    run,
    policy: workflow.policy,
    stepExecutions: buildStepExecutions(systemState, workflow, execution),
    studioState: {
      roleDirectives: buildRoleDirectives(systemState),
      promotionHistory: buildPromotionHistory(systemState),
      savedPlans: buildSavedPlans(systemState, workflow),
    },
    operationalContext: {
      workflowId: workflow.workflowId,
      runId: run.runId,
      generatedAt: execution?.finishedAt ?? execution?.startedAt ?? run.startedAt,
      similarRuns: buildSimilarRuns(systemState.executions, run, workflow.workflowId, systemState),
      lastHealthyComparison: buildHealthyComparison(workflow.workflowId, run, baselineRun),
      recommendationEvidence: buildRecommendationEvidence(systemState, execution, run),
    },
  };
}

function buildSavedPlans(systemState: ControlPlaneSystemState, workflow: Workflow): SavedPlan[] {
  const latestEvaluation = getLatestEvaluation(systemState);
  const latestRelease = getLatestReleaseDecision(systemState);
  const roleDirectives = buildRoleDirectives(systemState);
  const createdAt =
    latestRelease?.appliedAt ??
    latestRelease?.requestedAt ??
    latestEvaluation?.createdAt ??
    systemState.system.updatedAt ??
    systemState.system.createdAt ??
    new Date().toISOString();

  if (!latestEvaluation && !latestRelease && !roleDirectives) {
    return [];
  }

  return [
    {
      id:
        readMetadataString(latestEvaluation?.metadata, 'candidatePlanId') ??
        latestRelease?.candidateRef ??
        `plan_${systemState.system.systemId}_current`,
      name: latestRelease ? `${formatTokenLabel(latestRelease.decision)} candidate` : 'Control-plane candidate',
      createdAt,
      scenarioId: workflow.workflowId,
      previewPresetId: 'control-plane',
      executionPolicy: workflow.policy ?? DEFAULT_POLICY,
      roleDirectives,
      notes: latestEvaluation?.summary ?? latestRelease?.summary ?? `Current saved plan derived from ${systemState.system.name}.`,
    },
  ];
}

function buildPromotionHistory(systemState: ControlPlaneSystemState): PromotionEvent[] {
  return [...systemState.releases]
    .sort((left, right) => compareByNewest(left.appliedAt ?? left.requestedAt, right.appliedAt ?? right.requestedAt))
    .map((release) => {
      const metadata = readMetadataRecord(release.metadata);

      return {
        eventId: release.releaseId,
        appliedAt: release.appliedAt ?? release.requestedAt,
        mode: release.decision === 'rollback' ? 'rollback' : 'graduation',
        summary: release.summary ?? `${formatTokenLabel(release.decision)} release applied to ${systemState.system.name}.`,
        sourceExperimentId: release.evidenceRefs?.[0],
        planId: release.candidateRef,
        confidence: typeof metadata?.confidence === 'number' ? metadata.confidence : undefined,
        successDelta: typeof metadata?.successDelta === 'number' ? metadata.successDelta : undefined,
        creditsDelta: typeof metadata?.creditsDelta === 'number' ? metadata.creditsDelta : undefined,
        durationDelta: typeof metadata?.durationDelta === 'number' ? metadata.durationDelta : undefined,
      };
    });
}

export function buildSystemWorkflowState(systemState: ControlPlaneSystemState | null | undefined): WorkflowDemoState | null {
  if (!systemState) {
    return null;
  }

  const workflow = buildSyntheticWorkflow(systemState);
  const sortedExecutions = sortExecutionsByNewest(systemState.executions);
  const liveExecution = sortedExecutions[0] ?? null;
  const replayExecution = sortedExecutions.find((execution) => coerceRunStatus(execution.status) === 'failed') ?? liveExecution;
  const candidateExecution =
    (getLatestReleaseDecision(systemState)?.candidateRef
      ? sortedExecutions.find(
          (execution) =>
            execution.executionId === getLatestReleaseDecision(systemState)?.candidateRef ||
            execution.runId === getLatestReleaseDecision(systemState)?.candidateRef,
        ) ?? null
      : null) ??
    liveExecution;

  const liveRun = buildRunFromExecution(workflow.workflowId, systemState, liveExecution);
  const replayRun = buildRunFromExecution(workflow.workflowId, systemState, replayExecution);
  const candidateRun = buildRunFromExecution(workflow.workflowId, systemState, candidateExecution);

  const latestSuccessfulExecution =
    sortedExecutions.find(
      (execution) =>
        coerceRunStatus(execution.status) === 'succeeded' &&
        (execution.runId ?? execution.executionId) !== replayRun.runId &&
        (execution.runId ?? execution.executionId) !== candidateRun.runId,
    ) ??
    sortedExecutions.find((execution) => coerceRunStatus(execution.status) === 'succeeded') ??
    candidateExecution ??
    replayExecution;

  const baselineRun = buildRunFromExecution(workflow.workflowId, systemState, latestSuccessfulExecution);
  const savedPlans = buildSavedPlans(systemState, workflow);
  const promotionHistory = buildPromotionHistory(systemState);

  return {
    workflow,
    runsByNewest: sortedExecutions.map((execution) => buildRunFromExecution(workflow.workflowId, systemState, execution)),
    live: {
      run: liveRun,
      replay: buildReplayFromExecution(systemState, workflow, liveRun, baselineRun, liveExecution),
    },
    replay: {
      run: replayRun,
      replay: buildReplayFromExecution(systemState, workflow, replayRun, baselineRun, replayExecution),
      baselineRun,
    },
    optimize: {
      baselineRun,
      candidateRun,
      candidateReplay: buildReplayFromExecution(systemState, workflow, candidateRun, baselineRun, candidateExecution),
      candidatePlan: savedPlans[0] ?? null,
      promotionHistory,
      promotionSummary:
        getLatestReleaseDecision(systemState)?.summary ??
        getLatestEvaluation(systemState)?.summary ??
        promotionHistory[0]?.summary ??
        `Imported release evidence for ${systemState.system.name}.`,
    },
  };
}

function compareByNewest(left?: string, right?: string) {
  if (left && right) {
    return new Date(right).getTime() - new Date(left).getTime();
  }

  if (right) {
    return 1;
  }

  if (left) {
    return -1;
  }

  return 0;
}

function computeAverage(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function getTimestampMs(timestamp: string | null | undefined) {
  if (!timestamp) {
    return null;
  }

  const parsed = new Date(timestamp).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function isWithinWindow(timestamp: string | null | undefined, windowMs: number, referenceMs: number) {
  if (!timestamp) {
    return false;
  }

  const eventMs = getTimestampMs(timestamp);
  if (eventMs == null) {
    return false;
  }

  return referenceMs - eventMs <= windowMs;
}

function getSystemReferenceMs(systemState: ControlPlaneSystemState | null | undefined) {
  if (!systemState) {
    return Date.now();
  }

  const timestamps = [
    ...systemState.executions.flatMap((execution) => [execution.finishedAt ?? null, execution.startedAt]),
    ...Object.values(systemState.executionSpans)
      .flat()
      .flatMap((span) => [span.finishedAt ?? null, span.startedAt]),
    ...Object.values(systemState.executionMetrics)
      .flat()
      .map((sample) => sample.ts),
    ...systemState.interventions.flatMap((intervention) => [intervention.appliedAt ?? null, intervention.requestedAt]),
    ...systemState.evaluations.map((evaluation) => evaluation.createdAt),
    ...systemState.releases.flatMap((release) => [release.appliedAt ?? null, release.requestedAt]),
  ]
    .map((timestamp) => getTimestampMs(timestamp))
    .filter((timestamp): timestamp is number => timestamp != null);

  return timestamps.length ? Math.max(...timestamps) : Date.now();
}

function getAnalyticsWindowMs(window: AnalyticsWindow) {
  return window === 'all' ? null : ANALYTICS_WINDOW_MS[window];
}

export function getAnalyticsWindowLabel(window: AnalyticsWindow) {
  return ANALYTICS_WINDOW_OPTIONS.find((option) => option.id === window)?.label ?? 'All time';
}

export function filterSystemStateByWindow(
  systemState: ControlPlaneSystemState | null | undefined,
  window: AnalyticsWindow,
): ControlPlaneSystemState | null {
  if (!systemState) {
    return null;
  }

  const windowMs = getAnalyticsWindowMs(window);
  if (windowMs == null) {
    return systemState;
  }

  const referenceMs = getSystemReferenceMs(systemState);
  const executionIds = new Set(
    systemState.executions
      .filter((execution) => isWithinWindow(execution.finishedAt ?? execution.startedAt, windowMs, referenceMs))
      .map((execution) => execution.executionId),
  );

  return {
    ...systemState,
    executions: systemState.executions.filter((execution) => executionIds.has(execution.executionId)),
    executionSpans: Object.fromEntries(
      Object.entries(systemState.executionSpans)
        .filter(([executionId]) => executionIds.has(executionId))
        .map(([executionId, spans]) => [
          executionId,
          spans.filter((span) => isWithinWindow(span.finishedAt ?? span.startedAt, windowMs, referenceMs)),
        ]),
    ),
    executionMetrics: Object.fromEntries(
      Object.entries(systemState.executionMetrics)
        .filter(([executionId]) => executionIds.has(executionId))
        .map(([executionId, metrics]) => [
          executionId,
          metrics.filter((sample) => isWithinWindow(sample.ts, windowMs, referenceMs)),
        ]),
    ),
    interventions: systemState.interventions.filter((intervention) =>
      isWithinWindow(intervention.appliedAt ?? intervention.requestedAt, windowMs, referenceMs),
    ),
    evaluations: systemState.evaluations.filter((evaluation) =>
      isWithinWindow(evaluation.createdAt, windowMs, referenceMs),
    ),
    releases: systemState.releases.filter((release) =>
      isWithinWindow(release.appliedAt ?? release.requestedAt, windowMs, referenceMs),
    ),
  };
}

export function summarizeAgent(systemState: ControlPlaneSystemState | null | undefined, agentId: string): AgentSummary | null {
  if (!systemState) {
    return null;
  }

  const agent = systemState.agents.find((item) => item.agentId === agentId);
  if (!agent) {
    return null;
  }

  const spans = Object.values(systemState.executionSpans)
    .flat()
    .filter((span) => span.agentId === agentId)
    .sort((left, right) => compareByNewest(left.finishedAt ?? left.startedAt, right.finishedAt ?? right.startedAt));
  const interventions = systemState.interventions
    .filter((intervention) => intervention.targetScopeType === 'agent' && intervention.targetScopeId === agentId)
    .sort((left, right) => compareByNewest(left.appliedAt ?? left.requestedAt, right.appliedAt ?? right.requestedAt));
  const durationValues = spans.map((span) => span.usage?.durationMs).filter((value): value is number => value != null);
  const creditValues = spans.map((span) => span.usage?.credits).filter((value): value is number => value != null);
  const failedSpanCount = spans.filter((span) => span.status === 'failed').length;
  const successRate = spans.length ? (spans.length - failedSpanCount) / spans.length : 1;
  const avgDurationMs = computeAverage(durationValues);
  const avgCredits = computeAverage(creditValues);
  const totalCredits = creditValues.reduce((total, value) => total + value, 0);
  const activeInterventionCount = interventions.filter((intervention) => intervention.status === 'applied').length;
  const pressureScore = failedSpanCount * 4 + activeInterventionCount * 2 + Math.round(avgDurationMs / 1000);

  return {
    agent,
    spanCount: spans.length,
    failedSpanCount,
    successRate,
    avgDurationMs,
    avgCredits,
    totalCredits,
    interventionCount: interventions.length,
    activeInterventionCount,
    lastActiveAt: spans[0]?.finishedAt ?? spans[0]?.startedAt ?? null,
    latestSpan: spans[0] ?? null,
    latestIntervention: interventions[0] ?? null,
    pressureScore,
  };
}

export function summarizeAgents(systemState: ControlPlaneSystemState | null | undefined): AgentSummary[] {
  if (!systemState) {
    return [];
  }

  return systemState.agents
    .map((agent) => summarizeAgent(systemState, agent.agentId))
    .filter((summary): summary is AgentSummary => summary != null)
    .sort((left, right) => right.pressureScore - left.pressureScore || compareByNewest(left.lastActiveAt ?? undefined, right.lastActiveAt ?? undefined));
}

export function filterAgentSummaries(agentSummaries: AgentSummary[], focus: AgentRosterFocus): AgentSummary[] {
  switch (focus) {
    case 'attention':
      return agentSummaries.filter((summary) => summary.failedSpanCount > 0 || summary.activeInterventionCount > 0);
    case 'failures':
      return agentSummaries.filter((summary) => summary.failedSpanCount > 0);
    case 'directives':
      return agentSummaries.filter((summary) => summary.activeInterventionCount > 0);
    case 'all':
    default:
      return agentSummaries;
  }
}

export function summarizeSystem(systemState: ControlPlaneSystemState | null | undefined): SystemSummary | null {
  if (!systemState) {
    return null;
  }

  const sortedExecutions = [...systemState.executions].sort((left, right) =>
    compareByNewest(left.finishedAt ?? left.startedAt, right.finishedAt ?? right.startedAt),
  );
  const executionMetrics = Object.values(systemState.executionMetrics).flat();
  const durationSamples = executionMetrics.filter((sample) => sample.metric === 'duration.ms' && sample.scopeType === 'execution');
  const creditSamples = executionMetrics.filter((sample) => sample.metric === 'credits.actual' && sample.scopeType === 'execution');
  const agentSummaries = summarizeAgents(systemState);

  return {
    system: systemState.system,
    latestExecution: sortedExecutions[0] ?? null,
    latestEvaluation: getLatestEvaluation(systemState),
    latestRelease: getLatestReleaseDecision(systemState),
    agentCount: systemState.agents.length,
    executionCount: systemState.executions.length,
    interventionCount: systemState.interventions.length,
    activeInterventionCount: systemState.interventions.filter((intervention) => intervention.status === 'applied').length,
    successRate: sortedExecutions.length
      ? sortedExecutions.filter((execution) => execution.status === 'succeeded').length / sortedExecutions.length
      : 1,
    avgDurationMs: computeAverage(durationSamples.map((sample) => sample.value)),
    avgCredits: computeAverage(creditSamples.map((sample) => sample.value)),
    lastActiveAt: sortedExecutions[0]?.finishedAt ?? sortedExecutions[0]?.startedAt ?? null,
    pressureAgentId: agentSummaries[0]?.agent.agentId ?? null,
  };
}

export function summarizeFleet(systemStates: ControlPlaneSystemState[]): FleetSummary {
  const summaries = systemStates
    .map((systemState) => summarizeSystem(systemState))
    .filter((summary): summary is SystemSummary => summary != null);

  const hottestSystems = [...summaries]
    .sort(
      (left, right) =>
        right.activeInterventionCount - left.activeInterventionCount ||
        right.executionCount - left.executionCount ||
        compareByNewest(left.lastActiveAt ?? undefined, right.lastActiveAt ?? undefined),
    )
    .slice(0, 3);

  const releaseWatchlist = summaries
    .filter((summary) => {
      const releaseDecision = summary.latestRelease?.decision;
      const evaluationVerdict = summary.latestEvaluation?.verdict;
      return ['hold', 'rollback'].includes(releaseDecision ?? '') || ['hold', 'failed'].includes(evaluationVerdict ?? '');
    })
    .sort((left, right) =>
      compareByNewest(
        left.latestRelease?.appliedAt ?? left.latestRelease?.requestedAt ?? left.latestEvaluation?.createdAt,
        right.latestRelease?.appliedAt ?? right.latestRelease?.requestedAt ?? right.latestEvaluation?.createdAt,
      ),
    )
    .slice(0, 4);

  return {
    systemCount: summaries.length,
    activeSystemCount: summaries.filter((summary) => summary.executionCount > 0).length,
    trackedAgentCount: summaries.reduce((total, summary) => total + summary.agentCount, 0),
    executionCount: summaries.reduce((total, summary) => total + summary.executionCount, 0),
    activeDirectiveCount: summaries.reduce((total, summary) => total + summary.activeInterventionCount, 0),
    avgSuccessRate: computeAverage(summaries.map((summary) => summary.successRate)),
    avgCredits: computeAverage(summaries.map((summary) => summary.avgCredits)),
    avgDurationMs: computeAverage(summaries.map((summary) => summary.avgDurationMs)),
    hottestSystems,
    releaseWatchlist,
  };
}

function createRoomReadiness(roomId: OperatorRoomId, state: RoomReadinessState, label: string, detail: string): RoomReadinessSummary {
  return {
    roomId,
    state,
    label,
    detail,
  };
}

export function summarizeSystemReadiness(systemState: ControlPlaneSystemState | null | undefined): SystemReadinessSummary {
  const agentCount = systemState?.agents.length ?? 0;
  const executionCount = systemState?.executions.length ?? 0;
  const spanCount = Object.values(systemState?.executionSpans ?? {}).reduce((total, spans) => total + spans.length, 0);
  const interventionCount = systemState?.interventions.length ?? 0;
  const evaluationCount = systemState?.evaluations.length ?? 0;
  const releaseCount = systemState?.releases.length ?? 0;
  const hasTopology = Boolean(systemState?.topology?.nodes?.length ?? systemState?.topology);
  const hasReleaseEvidence = evaluationCount > 0 || releaseCount > 0;

  const completedSteps = [
    Boolean(systemState),
    agentCount > 0,
    hasTopology,
    executionCount > 0 && spanCount > 0,
    hasReleaseEvidence,
  ].filter(Boolean).length;

  let stageId: SystemReadinessStage = 'operational';
  let stageLabel = 'Operational';
  let title = 'System is ready to operate';
  let body = 'Use Overview to choose the right system, Live to inspect current pressure, Replay to explain failures, and Optimize to compare interventions and releases.';

  if (!systemState) {
    stageId = 'register';
    stageLabel = 'Needs registration';
    title = 'Register a runtime and system first';
    body = 'Create a durable home for the agent network before you import agents, traces, or release evidence.';
  } else if (agentCount === 0 || !hasTopology) {
    stageId = 'model';
    stageLabel = agentCount === 0 ? 'Needs agents' : 'Needs topology';
    title = agentCount === 0 ? 'Add the agent roster' : 'Add the system topology';
    body =
      agentCount === 0
        ? 'Ingest agents so Studio can identify who is in the system and which runtime each role belongs to.'
        : 'Ingest a topology snapshot so Live can show handoffs, dependencies, and the real command map.';
  } else if (executionCount === 0 || spanCount === 0) {
    stageId = 'trace';
    stageLabel = executionCount === 0 ? 'Needs executions' : 'Needs spans';
    title = executionCount === 0 ? 'Ingest the first execution' : 'Ingest span breakdowns';
    body =
      executionCount === 0
        ? 'Send at least one execution record so Studio can move from static inventory into a real operating surface.'
        : 'Send spans and metrics so Replay can expose the real break tree and Agent Studio can measure per-agent pressure.';
  } else if (!hasReleaseEvidence) {
    stageId = 'release';
    stageLabel = 'Needs release evidence';
    title = 'Add evaluations or release decisions';
    body = 'Optimize becomes useful only when the system has intervention, evaluation, and release evidence to compare.';
  }

  const roomReadiness: RoomReadinessSummary[] = [
    createRoomReadiness(
      'overview',
      systemState ? 'ready' : 'next',
      systemState ? 'Ready' : 'Start here',
      systemState
        ? 'Pick the system, inspect fleet pressure, and choose the next drill-in.'
        : 'Register or import the first system, then return here to operate it.',
    ),
    createRoomReadiness(
      'connect',
      stageId === 'operational' ? 'ready' : 'next',
      stageId === 'operational' ? 'Available' : 'Next step',
      stageId === 'operational'
        ? 'Use Connect when you add more systems or import more evidence.'
        : `${title}.`,
    ),
    createRoomReadiness(
      'live',
      agentCount === 0 ? 'needs-data' : hasTopology && executionCount > 0 ? 'ready' : 'partial',
      agentCount === 0 ? 'Needs agents' : hasTopology && executionCount > 0 ? 'Ready' : hasTopology ? 'Needs executions' : 'Add topology',
      agentCount === 0
        ? 'Live needs an agent roster before it becomes a real command surface.'
        : hasTopology && executionCount > 0
          ? 'Live can show the active system, topology, and current pressure.'
          : hasTopology
            ? 'Live can show the roster, but it needs executions to reflect the active system.'
            : 'Live can show the roster, but topology makes the command map practical.',
    ),
    createRoomReadiness(
      'replay',
      executionCount > 0 && spanCount > 0 ? 'ready' : 'needs-data',
      executionCount === 0 ? 'Needs executions' : spanCount === 0 ? 'Needs spans' : 'Ready',
      executionCount === 0
        ? 'Replay needs executions before it can compare runs.'
        : spanCount === 0
          ? 'Replay needs span breakdowns to explain what actually failed.'
          : 'Replay can trace the failing path and compare it to the healthy control.',
    ),
    createRoomReadiness(
      'optimize',
      hasReleaseEvidence ? 'ready' : interventionCount > 0 ? 'partial' : 'needs-data',
      hasReleaseEvidence ? 'Ready' : interventionCount > 0 ? 'Needs evaluations' : 'Needs release evidence',
      hasReleaseEvidence
        ? 'Optimize can compare interventions, evaluations, and release calls.'
        : interventionCount > 0
          ? 'You have directives, but Optimize still needs evaluations or release decisions.'
          : 'Optimize needs evaluations or release decisions before it becomes a real workbench.',
    ),
  ];

  return {
    stageId,
    stageLabel,
    title,
    body,
    completedSteps,
    totalSteps: 5,
    agentCount,
    executionCount,
    spanCount,
    interventionCount,
    evaluationCount,
    releaseCount,
    hasTopology,
    roomReadiness,
  };
}

export function filterSystemSummaries(summaries: SystemSummary[], focus: SystemCatalogFocus) {
  switch (focus) {
    case 'attention':
      return summaries.filter(
        (summary) =>
          summary.activeInterventionCount > 0 ||
          summary.latestExecution?.status === 'failed' ||
          ['hold', 'rollback'].includes(summary.latestRelease?.decision ?? '') ||
          ['hold', 'failed'].includes(summary.latestEvaluation?.verdict ?? ''),
      );
    case 'active':
      return summaries.filter(
        (summary) =>
          summary.latestExecution?.status === 'running' ||
          summary.latestExecution?.status === 'active' ||
          summary.executionCount > 0,
      );
    case 'healthy':
      return summaries.filter(
        (summary) =>
          summary.successRate >= 0.8 &&
          summary.activeInterventionCount === 0 &&
          !['hold', 'rollback'].includes(summary.latestRelease?.decision ?? ''),
      );
    case 'all':
    default:
      return summaries;
  }
}

export function sortSystemsByActivity(systems: ControlPlaneSystemState[]): ControlPlaneSystemState[] {
  return [...systems].sort((left, right) => {
    const leftSummary = summarizeSystem(left);
    const rightSummary = summarizeSystem(right);

    return compareByNewest(leftSummary?.lastActiveAt ?? undefined, rightSummary?.lastActiveAt ?? undefined);
  });
}

export function buildSystemHistoryEvents(systemState: ControlPlaneSystemState | null | undefined): SystemHistoryEvent[] {
  if (!systemState) {
    return [];
  }

  const executionEvents = systemState.executions.map((execution) => {
    const metrics = systemState.executionMetrics[execution.executionId] ?? [];
    const credits = readMetricValue(metrics, 'credits.actual');
    const durationMs = readMetricValue(metrics, 'duration.ms');
    const experimentLabel =
      readMetadataString(execution.metadata, 'experimentLabel') ??
      readMetadataString(execution.metadata, 'label') ??
      execution.runId ??
      execution.executionId;

    return {
      eventId: execution.executionId,
      kind: 'execution' as const,
      occurredAt: execution.finishedAt ?? execution.startedAt,
      status: execution.status,
      title: `${formatTokenLabel(execution.status)} execution · ${experimentLabel}`,
      summary: `${systemState.system.name} consumed ${credits?.toFixed(0) ?? '—'} credits over ${durationMs ? Math.round(durationMs / 1000) : '0'}s.`,
      relatedAgentId: null,
      relatedExecutionId: execution.executionId,
    };
  });

  const directiveEvents = systemState.interventions.map((intervention) => ({
    eventId: intervention.interventionId,
    kind: 'directive' as const,
    occurredAt: intervention.appliedAt ?? intervention.requestedAt,
    status: intervention.status ?? 'recorded',
    title: `${formatTokenLabel(intervention.action.replace(/\./g, ' '))} · ${
      intervention.targetScopeType === 'agent'
        ? getAgentLabel(systemState, intervention.targetScopeId) ?? intervention.targetScopeId
        : systemState.system.name
    }`,
    summary: intervention.reason ?? 'Directive intervention recorded without a written reason.',
    relatedAgentId: intervention.targetScopeType === 'agent' ? intervention.targetScopeId : null,
    relatedExecutionId: null,
  }));

  const evaluationEvents = systemState.evaluations.map((evaluation) => ({
    eventId: evaluation.evaluationId,
    kind: 'evaluation' as const,
    occurredAt: evaluation.createdAt,
    status: evaluation.verdict,
    title: `Evaluation · ${formatTokenLabel(evaluation.verdict)}`,
    summary: evaluation.summary ?? 'Evaluation recorded without a summary.',
    relatedAgentId: null,
    relatedExecutionId: evaluation.candidateRefs?.[0] ?? null,
  }));

  const releaseEvents = systemState.releases.map((release) => ({
    eventId: release.releaseId,
    kind: 'release' as const,
    occurredAt: release.appliedAt ?? release.requestedAt,
    status: release.decision,
    title: `Release · ${formatTokenLabel(release.decision)}`,
    summary: release.summary ?? 'Release decision recorded without a summary.',
    relatedAgentId: null,
    relatedExecutionId: release.candidateRef ?? null,
  }));

  return [...executionEvents, ...directiveEvents, ...evaluationEvents, ...releaseEvents].sort((left, right) =>
    compareByNewest(left.occurredAt, right.occurredAt),
  );
}

export function summarizeFleetAnalytics(systemState: ControlPlaneSystemState | null | undefined): FleetAnalyticsSummary | null {
  if (!systemState) {
    return null;
  }

  const spans = Object.values(systemState.executionSpans).flat();
  const history = buildSystemHistoryEvents(systemState);
  const hottestAgents = summarizeAgents(systemState).slice(0, 3);
  const executionMetrics = Object.values(systemState.executionMetrics).flat();
  const durationSamples = executionMetrics.filter((sample) => sample.metric === 'duration.ms' && sample.scopeType === 'execution');
  const creditSamples = executionMetrics.filter((sample) => sample.metric === 'credits.actual' && sample.scopeType === 'execution');
  const recentFailures = history.filter((event) =>
    ['failed', 'hold', 'rollback'].includes(event.status),
  );
  const succeededExecutions = systemState.executions.filter((execution) => execution.status === 'succeeded').length;

  return {
    executionCount: systemState.executions.length,
    executionStatusCounts: {
      running: systemState.executions.filter((execution) => execution.status === 'running').length,
      succeeded: succeededExecutions,
      failed: systemState.executions.filter((execution) => execution.status === 'failed').length,
    },
    totalSpans: spans.length,
    failedSpans: spans.filter((span) => span.status === 'failed').length,
    activeDirectives: systemState.interventions.filter((intervention) => intervention.status === 'applied').length,
    eventCount: history.length,
    successRate: systemState.executions.length ? succeededExecutions / systemState.executions.length : 1,
    latestEventAt: history[0]?.occurredAt ?? null,
    hottestAgents,
    recentFailures: recentFailures.slice(0, 4),
    avgCredits: computeAverage(creditSamples.map((sample) => sample.value)),
    avgDurationMs: computeAverage(durationSamples.map((sample) => sample.value)),
  };
}

function buildApiUrl(apiBaseUrl: string, pathname: string) {
  if (!apiBaseUrl) {
    return pathname;
  }

  return new URL(pathname, `${apiBaseUrl.replace(/\/+$/, '')}/`).toString();
}

async function fetchJson<T>(fetcher: typeof globalThis.fetch, apiBaseUrl: string, pathname: string): Promise<T> {
  const response = await fetcher(buildApiUrl(apiBaseUrl, pathname), {
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load ${pathname} (${response.status}).`);
  }

  return (await response.json()) as T;
}

async function fetchJsonOr<T>(
  fetcher: typeof globalThis.fetch,
  apiBaseUrl: string,
  pathname: string,
  fallback: T,
  allowedStatuses: number[] = [404],
): Promise<T> {
  const response = await fetcher(buildApiUrl(apiBaseUrl, pathname), {
    headers: {
      accept: 'application/json',
    },
  });

  if (allowedStatuses.includes(response.status)) {
    return fallback;
  }

  if (!response.ok) {
    throw new Error(`Failed to load ${pathname} (${response.status}).`);
  }

  return (await response.json()) as T;
}

async function postJson<TInput, TOutput>(
  fetcher: typeof globalThis.fetch,
  apiBaseUrl: string,
  pathname: string,
  payload: TInput,
): Promise<TOutput> {
  const response = await fetcher(buildApiUrl(apiBaseUrl, pathname), {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `Failed to POST ${pathname} (${response.status}).`);
  }

  return (await response.json()) as TOutput;
}

function readWorkflowId(system: SystemDefinition) {
  const metadata = system.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return undefined;
  }

  const workflowId = (metadata as Record<string, unknown>).workflowId;

  return typeof workflowId === 'string' && workflowId.trim().length > 0 ? workflowId : undefined;
}

export async function loadControlPlaneState(options: LoadControlPlaneStateOptions = {}): Promise<ControlPlaneState> {
  const fetcher = options.fetch ?? globalThis.fetch;
  if (!fetcher) {
    throw new Error('Fetch is not available in this environment.');
  }

  const apiBaseUrl = options.apiBaseUrl ?? import.meta.env.VITE_API_URL ?? '';
  const storagePayload = await fetchJson<{ item: ControlPlaneStorageInfo }>(
    fetcher,
    apiBaseUrl,
    '/api/control/meta',
  ).catch(() => ({
    item: {
      mode: 'memory' as const,
      persistenceEnabled: false,
      filePath: null,
      blobPath: null,
      detail: 'Ephemeral in-memory demo store.',
    },
  }));
  const runtimesPayload = await fetchJson<{ items: RuntimeRegistration[] }>(fetcher, apiBaseUrl, '/api/control/runtimes');
  const systemsPayload = await fetchJson<{ items: SystemDefinition[] }>(fetcher, apiBaseUrl, '/api/control/systems');

  const systems = await Promise.all(
    systemsPayload.items.map(async (system) => {
      const [agentsPayload, executionsPayload, interventionsPayload, evaluationsPayload, releasesPayload, topologyPayload] =
        await Promise.all([
          fetchJsonOr<{ items: AgentDefinition[] }>(
            fetcher,
            apiBaseUrl,
            `/api/control/systems/${system.systemId}/agents`,
            { items: [] },
          ),
          fetchJsonOr<{ items: ExecutionRecord[] }>(
            fetcher,
            apiBaseUrl,
            `/api/control/systems/${system.systemId}/executions`,
            { items: [] },
          ),
          fetchJsonOr<{ items: InterventionRecord[] }>(
            fetcher,
            apiBaseUrl,
            `/api/control/systems/${system.systemId}/interventions`,
            { items: [] },
          ),
          fetchJsonOr<{ items: EvaluationRecord[] }>(
            fetcher,
            apiBaseUrl,
            `/api/control/systems/${system.systemId}/evaluations`,
            { items: [] },
          ),
          fetchJsonOr<{ items: ReleaseDecision[] }>(
            fetcher,
            apiBaseUrl,
            `/api/control/systems/${system.systemId}/releases`,
            { items: [] },
          ),
          fetchJsonOr<{ item: TopologySnapshot | null }>(
            fetcher,
            apiBaseUrl,
            `/api/control/systems/${system.systemId}/topology`,
            { item: null },
          ),
        ]);

      const executionDetails = await Promise.all(
        executionsPayload.items.map(async (execution) => {
          const [spansPayload, metricsPayload] = await Promise.all([
            fetchJsonOr<{ items: SpanRecord[] }>(
              fetcher,
              apiBaseUrl,
              `/api/control/executions/${execution.executionId}/spans`,
              { items: [] },
            ),
            fetchJsonOr<{ items: MetricSample[] }>(
              fetcher,
              apiBaseUrl,
              `/api/control/executions/${execution.executionId}/metrics`,
              { items: [] },
            ),
          ]);

          return {
            executionId: execution.executionId,
            spans: spansPayload.items,
            metrics: metricsPayload.items,
          };
        }),
      );

      return {
        system,
        agents: agentsPayload.items,
        topology: topologyPayload.item,
        executions: executionsPayload.items,
        executionSpans: Object.fromEntries(executionDetails.map((detail) => [detail.executionId, detail.spans])),
        executionMetrics: Object.fromEntries(executionDetails.map((detail) => [detail.executionId, detail.metrics])),
        interventions: interventionsPayload.items,
        evaluations: evaluationsPayload.items,
        releases: releasesPayload.items,
      } satisfies ControlPlaneSystemState;
    }),
  );

  const systemsByWorkflowId = Object.fromEntries(
    systems.flatMap((systemState) => {
      const workflowId = readWorkflowId(systemState.system);

      return workflowId ? ([[workflowId, systemState]] as const) : [];
    }),
  );

  return {
    runtimes: runtimesPayload.items,
    systems,
    systemsByWorkflowId,
    storage: storagePayload.item,
  };
}

export async function ingestControlPlaneItems<T>(
  pathname: string,
  payload: T | T[],
  options: IngestControlPlaneOptions = {},
): Promise<void> {
  const fetcher = options.fetch ?? globalThis.fetch;
  if (!fetcher) {
    throw new Error('Fetch is not available in this environment.');
  }

  const apiBaseUrl = options.apiBaseUrl ?? import.meta.env.VITE_API_URL ?? '';

  await postJson(fetcher, apiBaseUrl, pathname, payload);
}

export async function ingestControlPlaneBundle(
  bundle: ControlPlaneImportBundle,
  options: IngestControlPlaneOptions = {},
): Promise<void> {
  const orderedWrites: Array<[string, unknown[] | undefined]> = [
    ['/api/control/ingest/runtimes', bundle.runtimes],
    ['/api/control/ingest/systems', bundle.systems],
    ['/api/control/ingest/agents', bundle.agents],
    ['/api/control/ingest/topologies', bundle.topologies],
    ['/api/control/ingest/executions', bundle.executions],
    ['/api/control/ingest/spans', bundle.spans],
    ['/api/control/ingest/metrics', bundle.metrics],
    ['/api/control/ingest/interventions', bundle.interventions],
    ['/api/control/ingest/evaluations', bundle.evaluations],
    ['/api/control/ingest/releases', bundle.releases],
  ];

  for (const [pathname, items] of orderedWrites) {
    if (!items?.length) {
      continue;
    }

    await ingestControlPlaneItems(pathname, items, options);
  }
}
