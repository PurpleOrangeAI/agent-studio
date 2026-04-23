import type {
  AgentDefinition,
  ArtifactRecord,
  EvaluationRecord,
  ExecutionRecord,
  InterventionRecord,
  OperationalContext,
  Replay,
  ReleaseDecision,
  Run,
  RuntimeRegistration,
  SpanRecord,
  StudioState,
  SystemDefinition,
  TopologySnapshot,
  Workflow,
} from '@agent-studio/contracts';
import {
  agentDefinitionSchema,
  artifactRecordSchema,
  evaluationRecordSchema,
  executionRecordSchema,
  interventionRecordSchema,
  metricSampleSchema,
  operationalContextSchema,
  replaySchema,
  releaseDecisionSchema,
  runSchema,
  runtimeRegistrationSchema,
  spanRecordSchema,
  studioStateSchema,
  systemDefinitionSchema,
  topologySnapshotSchema,
  workflowSchema,
  type MetricSample,
} from '@agent-studio/contracts';
import { seededOperationalContexts, seededReplays } from '@agent-studio/demo';

import { createSeededControlPlaneState } from './control-plane-seed.js';
import {
  cloneReplay,
  cloneRun,
  cloneStudioState,
  cloneWorkflow,
  createSeededDemoState,
  type DemoStateResponse,
} from './demo-state.js';

function cloneRecord<T>(value: T): T {
  return structuredClone(value);
}

function sortByLabel<T extends { label?: string; name?: string }>(values: T[]) {
  return [...values].sort((left, right) => {
    const leftLabel = left.label ?? left.name ?? '';
    const rightLabel = right.label ?? right.name ?? '';

    return leftLabel.localeCompare(rightLabel);
  });
}

export interface ApiStoreSnapshot {
  workflows: Workflow[];
  runs: Run[];
  replays: Replay[];
  operationalContexts: OperationalContext[];
  studioStates: Array<{
    workflowId: string;
    studioState: StudioState;
  }>;
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

interface ApiStoreOptions {
  snapshot?: ApiStoreSnapshot | null;
  onChange?: (snapshot: ApiStoreSnapshot) => void | Promise<void>;
}

export class ApiStore {
  private readonly workflows = new Map<string, Workflow>();
  private readonly runs = new Map<string, Run>();
  private readonly replays = new Map<string, Replay>();
  private readonly operationalContexts = new Map<string, OperationalContext>();
  private readonly studioStates = new Map<string, StudioState>();

  private readonly runtimes = new Map<string, RuntimeRegistration>();
  private readonly systems = new Map<string, SystemDefinition>();
  private readonly agents = new Map<string, AgentDefinition>();
  private readonly topologySnapshots = new Map<string, TopologySnapshot[]>();
  private readonly executions = new Map<string, ExecutionRecord>();
  private readonly spans = new Map<string, SpanRecord>();
  private readonly artifacts = new Map<string, ArtifactRecord>();
  private readonly metrics = new Map<string, MetricSample>();
  private readonly interventions = new Map<string, InterventionRecord>();
  private readonly evaluations = new Map<string, EvaluationRecord>();
  private readonly releaseDecisions = new Map<string, ReleaseDecision>();
  private readonly onChange?: (snapshot: ApiStoreSnapshot) => void | Promise<void>;
  private mutationDepth = 0;
  private pendingPersistence = Promise.resolve();

  constructor(seed = createSeededDemoState(), options: ApiStoreOptions = {}) {
    this.onChange = options.onChange;

    if (options.snapshot) {
      this.hydrateSnapshot(options.snapshot);
      this.overlaySeed(seed);
      return;
    }

    this.overlaySeed(seed);
  }

  private setTopologySnapshot(snapshotEntry: TopologySnapshot) {
    const current = this.topologySnapshots.get(snapshotEntry.systemId) ?? [];
    const next = current.filter((item) => item.snapshotId !== snapshotEntry.snapshotId);
    next.push(cloneRecord(snapshotEntry));
    this.topologySnapshots.set(snapshotEntry.systemId, next);
  }

  private overlaySeed(seed: ReturnType<typeof createSeededDemoState>) {
    seed.workflows.forEach((workflow) => this.workflows.set(workflow.workflowId, cloneWorkflow(workflow)));

    Object.values(seed.workflowStates).forEach((state) => {
      this.studioStates.set(state.workflow.workflowId, cloneStudioState(state.live.replay.studioState ?? {}));
      state.runsByNewest.forEach((run) => this.runs.set(run.runId, cloneRun(run)));
    });

    seededReplays.forEach((replay) => {
      replaySchema.parse(replay);
      this.replays.set(replay.run.runId, cloneReplay(replay));
    });

    Object.values(seededOperationalContexts).forEach((context) => {
      const parsed = operationalContextSchema.parse(context);
      this.operationalContexts.set(parsed.runId ?? `${parsed.workflowId}:${parsed.generatedAt}`, cloneRecord(parsed));
    });

    const controlPlaneSeed = createSeededControlPlaneState(seed);
    controlPlaneSeed.runtimes.forEach((runtime) => this.runtimes.set(runtime.runtimeId, cloneRecord(runtime)));
    controlPlaneSeed.systems.forEach((system) => this.systems.set(system.systemId, cloneRecord(system)));
    controlPlaneSeed.agents.forEach((agent) => this.agents.set(agent.agentId, cloneRecord(agent)));
    controlPlaneSeed.topologySnapshots.forEach((snapshot) => this.setTopologySnapshot(snapshot));
    controlPlaneSeed.executions.forEach((execution) => this.executions.set(execution.executionId, cloneRecord(execution)));
    controlPlaneSeed.spans.forEach((span) => this.spans.set(span.spanId, cloneRecord(span)));
    controlPlaneSeed.artifacts.forEach((artifact) => this.artifacts.set(artifact.artifactId, cloneRecord(artifact)));
    controlPlaneSeed.metrics.forEach((metric) => this.metrics.set(metric.sampleId, cloneRecord(metric)));
    controlPlaneSeed.interventions.forEach((intervention) =>
      this.interventions.set(intervention.interventionId, cloneRecord(intervention)),
    );
    controlPlaneSeed.evaluations.forEach((evaluation) => this.evaluations.set(evaluation.evaluationId, cloneRecord(evaluation)));
    controlPlaneSeed.releaseDecisions.forEach((releaseDecision) =>
      this.releaseDecisions.set(releaseDecision.releaseId, cloneRecord(releaseDecision)),
    );
  }

  private hydrateSnapshot(snapshot: ApiStoreSnapshot) {
    snapshot.workflows.forEach((workflow) => this.workflows.set(workflow.workflowId, cloneWorkflow(workflow)));
    snapshot.runs.forEach((run) => this.runs.set(run.runId, cloneRun(run)));
    snapshot.replays.forEach((replay) => this.replays.set(replay.run.runId, cloneReplay(replay)));
    snapshot.operationalContexts.forEach((context) => {
      const key = context.runId ?? `${context.workflowId}:${context.generatedAt}`;
      this.operationalContexts.set(key, cloneRecord(context));
    });
    snapshot.studioStates.forEach((entry) => this.studioStates.set(entry.workflowId, cloneStudioState(entry.studioState)));
    snapshot.runtimes.forEach((runtime) => this.runtimes.set(runtime.runtimeId, cloneRecord(runtime)));
    snapshot.systems.forEach((system) => this.systems.set(system.systemId, cloneRecord(system)));
    snapshot.agents.forEach((agent) => this.agents.set(agent.agentId, cloneRecord(agent)));
    snapshot.topologySnapshots.forEach((snapshotEntry) => this.setTopologySnapshot(snapshotEntry));
    snapshot.executions.forEach((execution) => this.executions.set(execution.executionId, cloneRecord(execution)));
    snapshot.spans.forEach((span) => this.spans.set(span.spanId, cloneRecord(span)));
    snapshot.artifacts.forEach((artifact) => this.artifacts.set(artifact.artifactId, cloneRecord(artifact)));
    snapshot.metrics.forEach((metric) => this.metrics.set(metric.sampleId, cloneRecord(metric)));
    snapshot.interventions.forEach((intervention) =>
      this.interventions.set(intervention.interventionId, cloneRecord(intervention)),
    );
    snapshot.evaluations.forEach((evaluation) => this.evaluations.set(evaluation.evaluationId, cloneRecord(evaluation)));
    snapshot.releaseDecisions.forEach((releaseDecision) =>
      this.releaseDecisions.set(releaseDecision.releaseId, cloneRecord(releaseDecision)),
    );
  }

  private runMutation<T>(operation: () => T): T {
    this.mutationDepth += 1;

    try {
      return operation();
    } finally {
      this.mutationDepth -= 1;
      if (this.mutationDepth === 0) {
        const maybePersist = this.onChange?.(this.buildSnapshot());

        if (maybePersist && typeof (maybePersist as Promise<void>).then === 'function') {
          const task = Promise.resolve(maybePersist).catch(() => undefined);
          this.pendingPersistence = this.pendingPersistence.then(() => task);
        }
      }
    }
  }

  flushPendingPersistence() {
    return this.pendingPersistence;
  }

  buildSnapshot(): ApiStoreSnapshot {
    return {
      workflows: this.listWorkflows(),
      runs: [...this.runs.values()].map((run) => cloneRun(run)),
      replays: [...this.replays.values()].map((replay) => cloneReplay(replay)),
      operationalContexts: [...this.operationalContexts.values()].map((context) => cloneRecord(context)),
      studioStates: [...this.studioStates.entries()].map(([workflowId, studioState]) => ({
        workflowId,
        studioState: cloneStudioState(studioState),
      })),
      runtimes: this.listRuntimes(),
      systems: this.listSystems(),
      agents: [...this.agents.values()].map((agent) => cloneRecord(agent)),
      topologySnapshots: [...this.topologySnapshots.values()].flatMap((snapshots) => snapshots.map((snapshot) => cloneRecord(snapshot))),
      executions: [...this.executions.values()].map((execution) => cloneRecord(execution)),
      spans: [...this.spans.values()].map((span) => cloneRecord(span)),
      artifacts: [...this.artifacts.values()].map((artifact) => cloneRecord(artifact)),
      metrics: [...this.metrics.values()].map((metric) => cloneRecord(metric)),
      interventions: [...this.interventions.values()].map((intervention) => cloneRecord(intervention)),
      evaluations: [...this.evaluations.values()].map((evaluation) => cloneRecord(evaluation)),
      releaseDecisions: [...this.releaseDecisions.values()].map((releaseDecision) => cloneRecord(releaseDecision)),
    };
  }

  listWorkflows(): Workflow[] {
    return sortByLabel([...this.workflows.values()]).map((workflow) => cloneWorkflow(workflow));
  }

  getWorkflow(workflowId: string): Workflow | undefined {
    const workflow = this.workflows.get(workflowId);

    return workflow ? cloneWorkflow(workflow) : undefined;
  }

  upsertWorkflow(workflow: Workflow): Workflow {
    return this.runMutation(() => {
      const parsed = workflowSchema.parse(workflow);
      this.workflows.set(parsed.workflowId, cloneWorkflow(parsed));

      if (!this.studioStates.has(parsed.workflowId)) {
        this.studioStates.set(parsed.workflowId, studioStateSchema.parse({}));
      }

      return cloneWorkflow(parsed);
    });
  }

  listRunsByWorkflow(workflowId: string): Run[] {
    return [...this.runs.values()]
      .filter((run) => run.workflowId === workflowId)
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
      .map((run) => cloneRun(run));
  }

  getRun(runId: string): Run | undefined {
    const run = this.runs.get(runId);

    return run ? cloneRun(run) : undefined;
  }

  upsertRun(run: Run): Run {
    return this.runMutation(() => {
      const parsed = runSchema.parse(run);
      this.runs.set(parsed.runId, cloneRun(parsed));

      return cloneRun(parsed);
    });
  }

  getReplay(runId: string): Replay | undefined {
    const replay = this.replays.get(runId);

    return replay ? cloneReplay(replay) : undefined;
  }

  upsertReplay(replay: Replay): Replay {
    return this.runMutation(() => {
      const parsed = replaySchema.parse(replay);
      this.workflows.set(parsed.workflow.workflowId, cloneWorkflow(parsed.workflow));
      this.runs.set(parsed.run.runId, cloneRun(parsed.run));
      this.replays.set(parsed.run.runId, cloneReplay(parsed));

      if (parsed.operationalContext?.runId) {
        this.operationalContexts.set(parsed.operationalContext.runId, cloneRecord(parsed.operationalContext));
      }

      if (parsed.studioState) {
        this.studioStates.set(parsed.workflow.workflowId, cloneStudioState(parsed.studioState));
      }

      return cloneReplay(parsed);
    });
  }

  getOperationalContext(runId: string): OperationalContext | undefined {
    const operationalContext = this.operationalContexts.get(runId);

    return operationalContext ? cloneRecord(operationalContext) : undefined;
  }

  upsertOperationalContext(operationalContext: OperationalContext): OperationalContext {
    return this.runMutation(() => {
      const parsed = operationalContextSchema.parse(operationalContext);
      const key = parsed.runId ?? `${parsed.workflowId}:${parsed.generatedAt}`;
      this.operationalContexts.set(key, cloneRecord(parsed));

      return cloneRecord(parsed);
    });
  }

  getStudioState(workflowId: string): StudioState | undefined {
    const studioState = this.studioStates.get(workflowId);

    return studioState ? cloneStudioState(studioState) : undefined;
  }

  listRuntimes(): RuntimeRegistration[] {
    return sortByLabel([...this.runtimes.values()]).map((runtime) => cloneRecord(runtime));
  }

  getRuntime(runtimeId: string): RuntimeRegistration | undefined {
    const runtime = this.runtimes.get(runtimeId);

    return runtime ? cloneRecord(runtime) : undefined;
  }

  upsertRuntime(runtime: RuntimeRegistration): RuntimeRegistration {
    return this.runMutation(() => {
      const parsed = runtimeRegistrationSchema.parse(runtime);
      this.runtimes.set(parsed.runtimeId, cloneRecord(parsed));

      return cloneRecord(parsed);
    });
  }

  upsertRuntimes(runtimes: RuntimeRegistration[]) {
    return this.runMutation(() => runtimes.map((runtime) => this.upsertRuntime(runtime)));
  }

  listSystems(): SystemDefinition[] {
    return sortByLabel([...this.systems.values()]).map((system) => cloneRecord(system));
  }

  getSystem(systemId: string): SystemDefinition | undefined {
    const system = this.systems.get(systemId);

    return system ? cloneRecord(system) : undefined;
  }

  upsertSystem(system: SystemDefinition): SystemDefinition {
    return this.runMutation(() => {
      const parsed = systemDefinitionSchema.parse(system);
      this.systems.set(parsed.systemId, cloneRecord(parsed));

      return cloneRecord(parsed);
    });
  }

  upsertSystems(systems: SystemDefinition[]) {
    return this.runMutation(() => systems.map((system) => this.upsertSystem(system)));
  }

  listAgentsBySystem(systemId: string): AgentDefinition[] {
    return sortByLabel([...this.agents.values()].filter((agent) => agent.systemId === systemId)).map((agent) => cloneRecord(agent));
  }

  getAgent(agentId: string): AgentDefinition | undefined {
    const agent = this.agents.get(agentId);

    return agent ? cloneRecord(agent) : undefined;
  }

  upsertAgent(agent: AgentDefinition): AgentDefinition {
    return this.runMutation(() => {
      const parsed = agentDefinitionSchema.parse(agent);
      this.agents.set(parsed.agentId, cloneRecord(parsed));

      return cloneRecord(parsed);
    });
  }

  upsertAgents(agents: AgentDefinition[]) {
    return this.runMutation(() => agents.map((agent) => this.upsertAgent(agent)));
  }

  getLatestTopologySnapshot(systemId: string): TopologySnapshot | undefined {
    const snapshots = this.topologySnapshots.get(systemId) ?? [];
    const latest = [...snapshots].sort((left, right) => right.capturedAt.localeCompare(left.capturedAt))[0];

    return latest ? cloneRecord(latest) : undefined;
  }

  upsertTopologySnapshot(snapshot: TopologySnapshot): TopologySnapshot {
    return this.runMutation(() => {
      const parsed = topologySnapshotSchema.parse(snapshot);
      const current = this.topologySnapshots.get(parsed.systemId) ?? [];
      const next = current.filter((item) => item.snapshotId !== parsed.snapshotId);
      next.push(cloneRecord(parsed));
      this.topologySnapshots.set(parsed.systemId, next);

      return cloneRecord(parsed);
    });
  }

  upsertTopologySnapshots(snapshots: TopologySnapshot[]) {
    return this.runMutation(() => snapshots.map((snapshot) => this.upsertTopologySnapshot(snapshot)));
  }

  listExecutionsBySystem(systemId: string): ExecutionRecord[] {
    return [...this.executions.values()]
      .filter((execution) => execution.systemId === systemId)
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
      .map((execution) => cloneRecord(execution));
  }

  getExecution(executionId: string): ExecutionRecord | undefined {
    const execution = this.executions.get(executionId);

    return execution ? cloneRecord(execution) : undefined;
  }

  upsertExecution(execution: ExecutionRecord): ExecutionRecord {
    return this.runMutation(() => {
      const parsed = executionRecordSchema.parse(execution);
      this.executions.set(parsed.executionId, cloneRecord(parsed));

      return cloneRecord(parsed);
    });
  }

  upsertExecutions(executions: ExecutionRecord[]) {
    return this.runMutation(() => executions.map((execution) => this.upsertExecution(execution)));
  }

  listSpansByExecution(executionId: string): SpanRecord[] {
    return [...this.spans.values()]
      .filter((span) => span.executionId === executionId)
      .sort((left, right) => left.startedAt.localeCompare(right.startedAt))
      .map((span) => cloneRecord(span));
  }

  upsertSpan(span: SpanRecord): SpanRecord {
    return this.runMutation(() => {
      const parsed = spanRecordSchema.parse(span);
      this.spans.set(parsed.spanId, cloneRecord(parsed));

      return cloneRecord(parsed);
    });
  }

  upsertSpans(spans: SpanRecord[]) {
    return this.runMutation(() => spans.map((span) => this.upsertSpan(span)));
  }

  listArtifactsByExecution(executionId: string): ArtifactRecord[] {
    return [...this.artifacts.values()]
      .filter((artifact) => artifact.executionId === executionId)
      .map((artifact) => cloneRecord(artifact));
  }

  upsertArtifact(artifact: ArtifactRecord): ArtifactRecord {
    return this.runMutation(() => {
      const parsed = artifactRecordSchema.parse(artifact);
      this.artifacts.set(parsed.artifactId, cloneRecord(parsed));

      return cloneRecord(parsed);
    });
  }

  upsertArtifacts(artifacts: ArtifactRecord[]) {
    return this.runMutation(() => artifacts.map((artifact) => this.upsertArtifact(artifact)));
  }

  listMetricsByScope(scopeType: string, scopeId: string): MetricSample[] {
    return [...this.metrics.values()]
      .filter((metric) => metric.scopeType === scopeType && metric.scopeId === scopeId)
      .sort((left, right) => left.ts.localeCompare(right.ts))
      .map((metric) => cloneRecord(metric));
  }

  upsertMetric(metric: MetricSample): MetricSample {
    return this.runMutation(() => {
      const parsed = metricSampleSchema.parse(metric);
      this.metrics.set(parsed.sampleId, cloneRecord(parsed));

      return cloneRecord(parsed);
    });
  }

  upsertMetrics(metrics: MetricSample[]) {
    return this.runMutation(() => metrics.map((metric) => this.upsertMetric(metric)));
  }

  listInterventionsBySystem(systemId: string): InterventionRecord[] {
    const agents = this.listAgentsBySystem(systemId);
    const executions = this.listExecutionsBySystem(systemId);
    const agentIds = new Set(agents.map((agent) => agent.agentId));
    const traceIds = new Set(executions.map((execution) => execution.traceId));

    return [...this.interventions.values()]
      .filter((intervention) => {
        if (intervention.targetScopeType === 'system' && intervention.targetScopeId === systemId) {
          return true;
        }

        if (intervention.targetScopeType === 'agent' && agentIds.has(intervention.targetScopeId)) {
          return true;
        }

        return intervention.relatedTraceId ? traceIds.has(intervention.relatedTraceId) : false;
      })
      .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt))
      .map((intervention) => cloneRecord(intervention));
  }

  upsertIntervention(intervention: InterventionRecord): InterventionRecord {
    return this.runMutation(() => {
      const parsed = interventionRecordSchema.parse(intervention);
      this.interventions.set(parsed.interventionId, cloneRecord(parsed));

      return cloneRecord(parsed);
    });
  }

  upsertInterventions(interventions: InterventionRecord[]) {
    return this.runMutation(() => interventions.map((intervention) => this.upsertIntervention(intervention)));
  }

  listEvaluationsBySystem(systemId: string): EvaluationRecord[] {
    return [...this.evaluations.values()]
      .filter((evaluation) => evaluation.targetScopeType === 'system' && evaluation.targetScopeId === systemId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((evaluation) => cloneRecord(evaluation));
  }

  upsertEvaluation(evaluation: EvaluationRecord): EvaluationRecord {
    return this.runMutation(() => {
      const parsed = evaluationRecordSchema.parse(evaluation);
      this.evaluations.set(parsed.evaluationId, cloneRecord(parsed));

      return cloneRecord(parsed);
    });
  }

  upsertEvaluations(evaluations: EvaluationRecord[]) {
    return this.runMutation(() => evaluations.map((evaluation) => this.upsertEvaluation(evaluation)));
  }

  listReleaseDecisionsBySystem(systemId: string): ReleaseDecision[] {
    return [...this.releaseDecisions.values()]
      .filter((releaseDecision) => releaseDecision.systemId === systemId)
      .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt))
      .map((releaseDecision) => cloneRecord(releaseDecision));
  }

  upsertReleaseDecision(releaseDecision: ReleaseDecision): ReleaseDecision {
    return this.runMutation(() => {
      const parsed = releaseDecisionSchema.parse(releaseDecision);
      this.releaseDecisions.set(parsed.releaseId, cloneRecord(parsed));

      return cloneRecord(parsed);
    });
  }

  upsertReleaseDecisions(releaseDecisions: ReleaseDecision[]) {
    return this.runMutation(() => releaseDecisions.map((releaseDecision) => this.upsertReleaseDecision(releaseDecision)));
  }

  private buildDemoWorkflowState(workflow: Workflow): DemoStateResponse['workflowStates'][string] | null {
    const runsByNewest = this.listRunsByWorkflow(workflow.workflowId);
    const liveRun = runsByNewest.find((run) => run.status === 'succeeded') ?? runsByNewest[0];
    const replayRun = runsByNewest.find((run) => run.status === 'failed') ?? runsByNewest[1] ?? runsByNewest[0];
    const baselineRun = runsByNewest.find((run) => run.runId !== liveRun?.runId && run.status === 'succeeded') ?? liveRun;
    const candidateRun = liveRun ?? runsByNewest[0];
    const liveReplay = liveRun ? this.getReplay(liveRun.runId) : undefined;
    const replayReplay = replayRun ? this.getReplay(replayRun.runId) : undefined;
    const candidateReplay = candidateRun ? this.getReplay(candidateRun.runId) : undefined;

    if (!liveRun || !replayRun || !baselineRun || !candidateRun || !liveReplay || !replayReplay || !candidateReplay) {
      return null;
    }

    const studioState = this.getStudioState(workflow.workflowId);
    const candidatePlan =
      studioState?.savedPlans?.find((plan) => plan.sourceExperimentId === candidateRun.experimentId) ??
      studioState?.savedPlans?.[0] ??
      null;
    const promotionHistory =
      studioState?.promotionHistory?.filter((event) => {
        if (candidatePlan?.id && event.planId === candidatePlan.id) {
          return true;
        }

        if (candidateRun.experimentId && event.sourceExperimentId === candidateRun.experimentId) {
          return true;
        }

        return false;
      }) ?? [];
    const promotionSummary =
      promotionHistory[promotionHistory.length - 1]?.summary ?? 'Promotion history not available for this candidate.';

    return {
      workflow,
      runsByNewest,
      live: {
        run: liveRun,
        replay: liveReplay,
      },
      replay: {
        run: replayRun,
        replay: replayReplay,
        baselineRun,
      },
      optimize: {
        baselineRun,
        candidateRun,
        candidateReplay,
        candidatePlan,
        promotionHistory,
        promotionSummary,
      },
    };
  }

  buildDemoState(): DemoStateResponse {
    const workflowEntries = this.listWorkflows().flatMap((workflow) => {
      const workflowState = this.buildDemoWorkflowState(workflow);

      return workflowState ? ([[workflow.workflowId, workflowState]] as const) : [];
    });
    const workflowStates = Object.fromEntries(workflowEntries);
    const workflows = workflowEntries.map(([, workflowState]) => workflowState.workflow);
    const defaultWorkflowId = workflows[0]?.workflowId ?? createSeededDemoState().defaultWorkflowId;

    return {
      runtimeOptions: [
        {
          id: 'demo',
          label: 'Seeded demo runtime',
          detail: 'Read-only public walkthrough with realistic workflow history.',
        },
      ],
      defaultWorkflowId,
      workflows,
      workflowStates,
    };
  }
}
