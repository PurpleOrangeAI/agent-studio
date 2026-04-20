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

export function normalizeWorkflow(payload: unknown): Workflow {
  return workflowSchema.parse(payload);
}

export function normalizeRun(payload: unknown): Run {
  return runSchema.parse(payload);
}

export function normalizeOperationalContext(payload: unknown): OperationalContext {
  const operationalContext = operationalContextSchema.parse(payload);

  if (!operationalContext.runId) {
    throw new Error('runId is required for this API surface.');
  }

  return operationalContext;
}

export function normalizeReplay(payload: unknown): Replay {
  const replay = replaySchema.parse(payload);

  if (replay.operationalContext && !replay.operationalContext.runId) {
    throw new Error('operationalContext.runId is required for this API surface.');
  }

  return replay;
}
