import type {
  AgentDefinition,
  EvaluationRecord,
  ExecutionRecord,
  InterventionRecord,
  MetricDelta,
  MetricSample,
  ReleaseDecision,
  RuntimeRegistration,
  SpanRecord,
  SystemDefinition,
  TopologySnapshot,
} from '@agent-studio/contracts';

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

export interface ControlPlaneState {
  runtimes: RuntimeRegistration[];
  systems: ControlPlaneSystemState[];
  systemsByWorkflowId: Record<string, ControlPlaneSystemState>;
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

export function sortSystemsByActivity(systems: ControlPlaneSystemState[]): ControlPlaneSystemState[] {
  return [...systems].sort((left, right) => {
    const leftSummary = summarizeSystem(left);
    const rightSummary = summarizeSystem(right);

    return compareByNewest(leftSummary?.lastActiveAt ?? undefined, rightSummary?.lastActiveAt ?? undefined);
  });
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
  const runtimesPayload = await fetchJson<{ items: RuntimeRegistration[] }>(fetcher, apiBaseUrl, '/api/control/runtimes');
  const systemsPayload = await fetchJson<{ items: SystemDefinition[] }>(fetcher, apiBaseUrl, '/api/control/systems');

  const systems = await Promise.all(
    systemsPayload.items.map(async (system) => {
      const [agentsPayload, executionsPayload, interventionsPayload, evaluationsPayload, releasesPayload, topologyPayload] =
        await Promise.all([
          fetchJson<{ items: AgentDefinition[] }>(fetcher, apiBaseUrl, `/api/control/systems/${system.systemId}/agents`),
          fetchJson<{ items: ExecutionRecord[] }>(fetcher, apiBaseUrl, `/api/control/systems/${system.systemId}/executions`),
          fetchJson<{ items: InterventionRecord[] }>(fetcher, apiBaseUrl, `/api/control/systems/${system.systemId}/interventions`),
          fetchJson<{ items: EvaluationRecord[] }>(fetcher, apiBaseUrl, `/api/control/systems/${system.systemId}/evaluations`),
          fetchJson<{ items: ReleaseDecision[] }>(fetcher, apiBaseUrl, `/api/control/systems/${system.systemId}/releases`),
          fetchJson<{ item: TopologySnapshot }>(fetcher, apiBaseUrl, `/api/control/systems/${system.systemId}/topology`).catch(() => ({ item: null })),
        ]);

      const executionDetails = await Promise.all(
        executionsPayload.items.map(async (execution) => {
          const [spansPayload, metricsPayload] = await Promise.all([
            fetchJson<{ items: SpanRecord[] }>(fetcher, apiBaseUrl, `/api/control/executions/${execution.executionId}/spans`),
            fetchJson<{ items: MetricSample[] }>(fetcher, apiBaseUrl, `/api/control/executions/${execution.executionId}/metrics`),
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
