import {
  operationalContextSchema,
  replaySchema,
  runSchema,
  workflowSchema,
  type OperationalContext,
  type Replay,
  type Run,
  type Workflow,
} from '@agent-studio/contracts';

export type IngestOperationalContextPayload = OperationalContext & {
  runId: string;
};

export type IngestReplayPayload = Omit<Replay, 'operationalContext'> & {
  operationalContext?: IngestOperationalContextPayload;
};

export function parseWorkflow(payload: unknown): Workflow {
  return workflowSchema.parse(payload);
}

export function parseRun(payload: unknown): Run {
  return runSchema.parse(payload);
}

export function parseOperationalContext(payload: unknown): OperationalContext {
  const operationalContext = operationalContextSchema.parse(payload);

  if (!operationalContext.runId) {
    throw new Error('runId is required for this API surface.');
  }

  return operationalContext;
}

export function parseReplay(payload: unknown): Replay {
  const replay = replaySchema.parse(payload);

  if (replay.operationalContext && !replay.operationalContext.runId) {
    throw new Error('operationalContext.runId is required for this API surface.');
  }

  return replay;
}

export function ensureIngestOperationalContextPayload(
  operationalContext: OperationalContext,
): IngestOperationalContextPayload {
  if (!operationalContext.runId) {
    throw new Error('runId is required for this API surface.');
  }

  return operationalContext as IngestOperationalContextPayload;
}

export function ensureIngestReplayPayload(replay: Replay): IngestReplayPayload {
  if (replay.operationalContext && !replay.operationalContext.runId) {
    throw new Error('operationalContext.runId is required for this API surface.');
  }

  return replay as IngestReplayPayload;
}

export const normalizeWorkflow = parseWorkflow;
export const normalizeRun = parseRun;
export const normalizeOperationalContext = parseOperationalContext;
export const normalizeReplay = parseReplay;
