import type { OperationalContext, PhaseKind, RunStatus, StepExecution, Workflow, WorkflowStep } from '@agent-studio/contracts';
import { parseOperationalContext, parseReplay, parseRun, parseWorkflow } from '@agent-studio/sdk-js';
import {
  ensureIngestOperationalContextPayload,
  ensureIngestReplayPayload,
} from '@agent-studio/sdk-js';
import type { AssistantGraph, Run as LangGraphRun, ThreadState } from '@langchain/langgraph-sdk';

import type {
  LangGraphDeploymentSnapshot,
  LangGraphWorkflowOverrides,
} from './types.js';

export function mapWorkflowFromLangGraph(
  snapshot: LangGraphDeploymentSnapshot,
  workspace: WorkflowWorkspace,
  overrides?: LangGraphWorkflowOverrides,
): Workflow {
  const inferredSteps = inferWorkflowSteps(snapshot.assistantGraph, snapshot.history);
  const workflow = parseWorkflow({
    workspaceId: workspace.workspaceId,
    workspaceName: workspace.workspaceName,
    workflowId: overrides?.workflowId ?? buildWorkflowId(snapshot),
    name: overrides?.name ?? snapshot.assistant.name ?? humanize(snapshot.assistant.graph_id),
    description:
      overrides?.description ??
      snapshot.assistant.description ??
      readString(snapshot.assistant.metadata, 'description') ??
      `Imported read-only LangGraph deployment for ${snapshot.assistant.graph_id}.`,
    status: overrides?.status ?? 'active',
    schedule: readString(snapshot.assistant.metadata, 'schedule'),
    createdAt: snapshot.assistant.created_at,
    updatedAt: snapshot.assistant.updated_at,
    steps: inferredSteps,
  });

  return workflow;
}

export function mapRunFromLangGraph(snapshot: LangGraphDeploymentSnapshot, workflow: Workflow) {
  const finishedAt = isTerminalRun(snapshot.run.status) ? snapshot.run.updated_at : undefined;
  const run = parseRun({
    runId: snapshot.run.run_id,
    workflowId: workflow.workflowId,
    status: mapRunStatus(snapshot.run.status),
    startedAt: snapshot.run.created_at,
    finishedAt,
    durationMs: calculateDurationMs(snapshot.run.created_at, finishedAt),
  });

  return run;
}

export function mapOperationalContextFromLangGraph(
  snapshot: LangGraphDeploymentSnapshot,
  workflow: Workflow,
  runId: string,
  now: string,
) {
  const peerRuns = snapshot.runs.filter((candidate) => candidate.run_id !== snapshot.run.run_id);
  const latestHealthyRun = peerRuns.find((candidate) => mapRunStatus(candidate.status) === 'succeeded');
  const relatedRunIds = [snapshot.run.run_id, ...peerRuns.slice(0, 2).map((candidate) => candidate.run_id)];
  const currentValueKeys = listObjectKeys(snapshot.currentState.values);
  const currentRunDuration = calculateDurationMs(snapshot.run.created_at, snapshot.run.updated_at) ?? 0;
  const healthyRunDuration = latestHealthyRun
    ? calculateDurationMs(latestHealthyRun.created_at, latestHealthyRun.updated_at) ?? 0
    : 0;

  return ensureIngestOperationalContextPayload(parseOperationalContext({
    workflowId: workflow.workflowId,
    runId,
    generatedAt: now,
    similarRuns: peerRuns.slice(0, 3).map((candidate, index) => ({
      runId: candidate.run_id,
      label: readString(candidate.metadata, 'label') ?? `Thread run ${candidate.run_id}`,
      status: mapRunStatus(candidate.status),
      startedAt: candidate.created_at,
      finishedAt: isTerminalRun(candidate.status) ? candidate.updated_at : undefined,
      durationMs: calculateDurationMs(candidate.created_at, isTerminalRun(candidate.status) ? candidate.updated_at : undefined),
      similarityScore: Math.max(0.55, 0.92 - index * 0.12),
      matchedSignals: buildMatchedSignals(snapshot.run, candidate),
    })),
    lastHealthyComparison: latestHealthyRun
      ? {
          runId: latestHealthyRun.run_id,
          label: readString(latestHealthyRun.metadata, 'label') ?? `Healthy thread run ${latestHealthyRun.run_id}`,
          startedAt: latestHealthyRun.created_at,
          finishedAt: isTerminalRun(latestHealthyRun.status) ? latestHealthyRun.updated_at : undefined,
          durationDelta: currentRunDuration - healthyRunDuration,
          changedSignals: [
            'Agent Studio replay is synthesized from LangGraph checkpoints',
            'Workflow shape comes from the deployed assistant graph when available',
          ],
          summary: 'Compared against the most recent healthy run available on the same LangGraph thread.',
        }
      : undefined,
    recommendationEvidence: [
      {
        evidenceId: `${runId}:deployment`,
        title: 'Workflow imported from deployed graph plus assistant configuration',
        body: `Assistant ${snapshot.assistant.assistant_id} on graph ${snapshot.assistant.graph_id} was mapped into a single Agent Studio workflow.`,
        sourceLabel: 'LangGraph assistant',
        phase: 'note',
        relatedRunIds: [runId],
      },
      {
        evidenceId: `${runId}:history`,
        title: 'Replay was synthesized from thread history and current state',
        body: `Used ${snapshot.history.length} checkpoint states and the latest thread state to build the replay timeline.`,
        sourceLabel: 'LangGraph thread history',
        phase: 'summarize',
        relatedRunIds: [runId],
      },
      {
        evidenceId: `${runId}:state`,
        title: 'Current state keys preserved the execution outcome context',
        body:
          currentValueKeys.length > 0
            ? `Latest thread state exposed keys: ${currentValueKeys.join(', ')}.`
            : 'Latest thread state did not expose named values, so replay context stayed minimal.',
        sourceLabel: 'LangGraph thread state',
        phase: 'deliver',
        relatedRunIds,
      },
    ],
  }));
}

export function mapReplayFromLangGraph(
  snapshot: LangGraphDeploymentSnapshot,
  workflow: Workflow,
  run: ReturnType<typeof mapRunFromLangGraph>,
  operationalContext: OperationalContext,
) {
  const stepExecutions = buildStepExecutions(snapshot, workflow, run.status);

  return ensureIngestReplayPayload(parseReplay({
    workflow,
    run,
    stepExecutions,
    operationalContext,
  }));
}

type WorkflowWorkspace = {
  workspaceId: string;
  workspaceName?: string;
};

function buildWorkflowId(snapshot: LangGraphDeploymentSnapshot): string {
  return `langgraph:${snapshot.assistant.graph_id}:${snapshot.assistant.assistant_id}`;
}

function inferWorkflowSteps(
  assistantGraph: AssistantGraph | undefined,
  history: ThreadState[],
): WorkflowStep[] {
  const graphSteps = buildStepsFromGraph(assistantGraph);
  if (graphSteps.length > 0) {
    return graphSteps;
  }

  const historySteps = uniqueHistoryNodeIds(history).map((stepId, index, source) => ({
    stepId,
    kind: inferPhaseKind(stepId),
    title: humanize(stepId),
    objective: `Replay checkpoint ${index + 1} synthesized from LangGraph thread history.`,
    assignedRole: inferAssignedRole(inferPhaseKind(stepId)),
    dependsOnStepIds: index === 0 ? undefined : [source[index - 1]],
    toolName: inferToolName(stepId),
  }));

  if (historySteps.length > 0) {
    return historySteps;
  }

  return [
    {
      stepId: 'graph_execution',
      kind: 'analyze',
      title: 'Graph Execution',
      objective: 'Execute the deployed LangGraph graph.',
      assignedRole: 'operator',
    },
  ];
}

function buildStepsFromGraph(assistantGraph: AssistantGraph | undefined): WorkflowStep[] {
  if (!assistantGraph) {
    return [];
  }

  const nodes = assistantGraph.nodes
    .map((node) => normalizeNodeId(node.name ?? node.id))
    .filter((nodeId) => nodeId.length > 0 && !isControlNode(nodeId));
  const uniqueNodeIds = [...new Set(nodes)];
  const edgeSources = new Set(uniqueNodeIds);

  return uniqueNodeIds.map((nodeId) => {
    const kind = inferPhaseKind(nodeId);
    const dependsOnStepIds = assistantGraph.edges
      .map((edge) => normalizeNodeId(edge.source))
      .filter((sourceId, index) => {
        const targetId = normalizeNodeId(assistantGraph.edges[index]?.target);
        return targetId === nodeId && edgeSources.has(sourceId) && !isControlNode(sourceId);
      });

    return {
      stepId: nodeId,
      kind,
      title: humanize(nodeId),
      objective: `Execute ${humanize(nodeId)} inside the deployed LangGraph graph.`,
      assignedRole: inferAssignedRole(kind),
      dependsOnStepIds: dependsOnStepIds.length > 0 ? dependsOnStepIds : undefined,
      toolName: inferToolName(nodeId),
    };
  });
}

function uniqueHistoryNodeIds(history: ThreadState[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const state of history) {
    const nodeId = inferNodeIdFromState(state);
    if (!nodeId || seen.has(nodeId)) {
      continue;
    }

    seen.add(nodeId);
    ordered.push(nodeId);
  }

  return ordered;
}

function buildStepExecutions(
  snapshot: LangGraphDeploymentSnapshot,
  workflow: Workflow,
  runStatus: RunStatus,
): StepExecution[] {
  const workflowStepById = new Map(workflow.steps.map((step) => [step.stepId, step] as const));
  const history = snapshot.history.length > 0 ? snapshot.history : [snapshot.currentState];

  return history.map((state, index) => {
    const inferredNodeId = inferNodeIdFromState(state) ?? workflow.steps[index]?.stepId ?? `checkpoint_${index + 1}`;
    const fallbackKind = inferPhaseKind(inferredNodeId);
    const mappedStep = workflowStepById.get(inferredNodeId) ?? workflow.steps[index];
    const stepId = mappedStep?.stepId ?? inferredNodeId;
    const kind = mappedStep?.kind ?? fallbackKind;
    const title = mappedStep?.title ?? humanize(stepId);
    const assignedRole = mappedStep?.assignedRole ?? inferAssignedRole(kind);
    const startedAt = index === 0 ? snapshot.run.created_at : coerceIso(history[index - 1]?.created_at) ?? snapshot.run.created_at;
    const finishedAt = coerceIso(state.created_at) ?? (index === history.length - 1 ? snapshot.run.updated_at : undefined);
    const taskError = firstTaskError(state);

    return {
      stepId,
      kind,
      title,
      assignedRole,
      status:
        taskError != null
          ? 'failed'
          : index === history.length - 1
            ? runStatus
            : 'succeeded',
      startedAt,
      finishedAt,
      durationMs: calculateDurationMs(startedAt, finishedAt),
      modelSource: 'langgraph',
      toolCalls: countWrites(state),
      summary: summarizeState(state, title),
      error: taskError ?? undefined,
    };
  });
}

function summarizeState(state: ThreadState, title: string): string {
  const writeTargets = listWriteTargets(state);
  if (writeTargets.length > 0) {
    return `${title} wrote ${writeTargets.join(', ')} into the LangGraph thread state.`;
  }

  const valueKeys = listObjectKeys(state.values);
  if (valueKeys.length > 0) {
    return `${title} updated ${valueKeys.join(', ')} in the LangGraph thread state.`;
  }

  return `${title} was reconstructed from LangGraph checkpoint history.`;
}

function buildMatchedSignals(currentRun: LangGraphRun, candidate: LangGraphRun): string[] {
  const signals = ['Same thread', 'Same deployed assistant'];
  if (currentRun.status !== candidate.status) {
    signals.push('Different outcome');
  }

  return signals;
}

function mapRunStatus(status: string): RunStatus {
  switch (status) {
    case 'pending':
      return 'planned';
    case 'running':
      return 'running';
    case 'success':
      return 'succeeded';
    case 'error':
    case 'timeout':
    case 'interrupted':
      return 'failed';
    default:
      return 'failed';
  }
}

function isTerminalRun(status: string): boolean {
  return status !== 'pending' && status !== 'running';
}

function inferNodeIdFromState(state: ThreadState): string | undefined {
  const writeTargets = listWriteTargets(state);
  if (writeTargets[0]) {
    return writeTargets[0];
  }

  const taskName = state.tasks.find((task) => typeof task.name === 'string' && task.name.length > 0)?.name;
  if (taskName) {
    return normalizeNodeId(taskName);
  }

  const nextNode = state.next.find((candidate) => typeof candidate === 'string' && candidate.length > 0);
  if (nextNode) {
    return normalizeNodeId(nextNode);
  }

  return undefined;
}

function listWriteTargets(state: ThreadState): string[] {
  const writes =
    state.metadata && typeof state.metadata === 'object' && !Array.isArray(state.metadata)
      ? (state.metadata as Record<string, unknown>).writes
      : undefined;

  if (!writes || typeof writes !== 'object' || Array.isArray(writes)) {
    return [];
  }

  return Object.keys(writes as Record<string, unknown>).map((key) => normalizeNodeId(key));
}

function countWrites(state: ThreadState): number {
  return listWriteTargets(state).length;
}

function firstTaskError(state: ThreadState): string | null {
  for (const task of state.tasks) {
    if (typeof task.error === 'string' && task.error.length > 0) {
      return task.error;
    }
  }

  return null;
}

function inferPhaseKind(label: string): PhaseKind {
  const normalized = label.toLowerCase();
  if (matchesAny(normalized, ['search', 'retrieve', 'source', 'lookup', 'research'])) {
    return 'search';
  }
  if (matchesAny(normalized, ['query', 'ask'])) {
    return 'query';
  }
  if (matchesAny(normalized, ['capture', 'collect', 'ingest'])) {
    return 'capture';
  }
  if (matchesAny(normalized, ['summary', 'summarize', 'synthesis'])) {
    return 'summarize';
  }
  if (matchesAny(normalized, ['deliver', 'publish', 'email', 'send', 'notify'])) {
    return 'deliver';
  }
  if (matchesAny(normalized, ['review', 'guard', 'note', 'check'])) {
    return 'note';
  }
  return 'analyze';
}

function inferAssignedRole(kind: PhaseKind): string {
  switch (kind) {
    case 'search':
    case 'query':
    case 'capture':
      return 'researcher';
    case 'analyze':
    case 'summarize':
      return 'analyst';
    case 'deliver':
      return 'operator';
    case 'note':
      return 'reviewer';
  }
}

function inferToolName(label: string): string | undefined {
  const normalized = label.toLowerCase();
  if (matchesAny(normalized, ['search', 'retrieve', 'lookup'])) {
    return 'web.search';
  }
  if (matchesAny(normalized, ['email', 'deliver', 'send', 'notify'])) {
    return 'email.send';
  }
  return undefined;
}

function normalizeNodeId(value: string | number | undefined): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9:_-]/g, '_');
}

function isControlNode(nodeId: string): boolean {
  return nodeId.startsWith('__');
}

function humanize(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function matchesAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}

function calculateDurationMs(startedAt?: string, finishedAt?: string): number | undefined {
  if (!startedAt || !finishedAt) {
    return undefined;
  }

  const duration = Date.parse(finishedAt) - Date.parse(startedAt);
  return Number.isFinite(duration) && duration >= 0 ? duration : undefined;
}

function coerceIso(value?: string | null): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readString(record: unknown, key: string): string | undefined {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return undefined;
  }

  const value = (record as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function listObjectKeys(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }

  return Object.keys(value as Record<string, unknown>);
}

export { mapRunStatus };
