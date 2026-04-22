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

export interface LoadControlPlaneStateOptions {
  apiBaseUrl?: string;
  fetch?: typeof globalThis.fetch;
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
