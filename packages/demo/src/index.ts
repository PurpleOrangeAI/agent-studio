import {
  operationalContextSchema,
  replaySchema,
  runSchema,
  studioStateSchema,
  workflowSchema,
} from '@agent-studio/contracts';

import { seededOperationalContexts } from './recommendations.js';
import { seededReplayByRunId, seededReplays, seededRunById, seededRuns } from './runs.js';
import {
  seededIds,
  seededStudioState,
  seededStudioStateByRunId,
  seededWorkflow,
  seededWorkflowByRunId,
} from './workflows.js';

export {
  seededIds,
  seededOperationalContexts,
  seededReplayByRunId,
  seededReplays,
  seededRunById,
  seededRuns,
  seededStudioState,
  seededStudioStateByRunId,
  seededWorkflow,
  seededWorkflowByRunId,
};

export const seededDemoDataset = {
  workflow: seededWorkflow,
  runs: seededRuns,
  replays: seededReplays,
  operationalContexts: seededOperationalContexts,
  studioState: seededStudioState,
} as const;

type PolicyLike = {
  mode: string;
  optimizationGoal: string;
  reviewPolicy: string;
  maxElasticLanes: number;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function policySignature(policy: PolicyLike) {
  return `${policy.mode}|${policy.optimizationGoal}|${policy.reviewPolicy}|${policy.maxElasticLanes}`;
}

export function validateSeededDemoDataset(dataset: typeof seededDemoDataset = seededDemoDataset) {
  workflowSchema.parse(dataset.workflow);
  studioStateSchema.parse(dataset.studioState);

  const runById = new Map<string, (typeof dataset.runs)[number]>();
  for (const run of dataset.runs) {
    runSchema.parse(run);
    assert(!runById.has(run.runId), `Duplicate runId found: ${run.runId}`);
    runById.set(run.runId, run);
  }

  assert(runById.size === dataset.runs.length, 'Runs must have unique runIds');

  const replayByRunId = new Map<string, (typeof dataset.replays)[number]>();
  for (const replay of dataset.replays) {
    replaySchema.parse(replay);
    assert(!replayByRunId.has(replay.run.runId), `Duplicate replay found for runId: ${replay.run.runId}`);
    replayByRunId.set(replay.run.runId, replay);

    const linkedRun = runById.get(replay.run.runId);
    assert(linkedRun, `Replay references missing runId: ${replay.run.runId}`);
    assert(replay.run.workflowId === replay.workflow.workflowId, `Replay run/workflow mismatch for ${replay.run.runId}`);
    assert(replay.workflow.workflowId === dataset.workflow.workflowId, `Replay workflowId must match dataset workflowId for ${replay.run.runId}`);
    assert(replay.run.previewPresetId === replay.studioState?.previewPresetId, `Replay studio state preview preset must match run for ${replay.run.runId}`);
    assert(replay.run.scenarioId === replay.studioState?.selectedScenarioId, `Replay studio state scenario must match run for ${replay.run.runId}`);

    const workflowPolicy = replay.workflow.policy;
    const replayPolicy = replay.policy;
    assert(
      Boolean(workflowPolicy) === Boolean(replayPolicy),
      `Replay policy and workflow policy must both exist or both be omitted for ${replay.run.runId}`,
    );
    if (workflowPolicy && replayPolicy) {
      assert(
        policySignature(workflowPolicy) === policySignature(replayPolicy),
        `Replay policy and workflow policy must match for ${replay.run.runId}`,
      );
    }

    const workflowStepById = new Map(replay.workflow.steps.map((step) => [step.stepId, step] as const));
    const workflowStepIds = replay.workflow.steps.map((step) => step.stepId);
    const executionStepIds = replay.stepExecutions.map((step) => step.stepId);
    assert(workflowStepIds.length === executionStepIds.length, `Replay step count mismatch for ${replay.run.runId}`);
    assert(new Set(workflowStepIds).size === workflowStepIds.length, `Workflow stepIds must be unique for ${replay.run.runId}`);
    assert(new Set(executionStepIds).size === executionStepIds.length, `Replay stepIds must be unique for ${replay.run.runId}`);

    workflowStepIds.forEach((stepId, index) => {
      assert(executionStepIds[index] === stepId, `Replay step order mismatch for ${replay.run.runId}`);
      const workflowStep = workflowStepById.get(stepId);
      const executionStep = replay.stepExecutions[index];
      assert(workflowStep, `Replay workflow is missing step ${stepId} for ${replay.run.runId}`);
      assert(executionStep.kind === workflowStep.kind, `Replay step kind mismatch for ${stepId}`);
      assert(executionStep.title === workflowStep.title, `Replay step title mismatch for ${stepId}`);
      assert(executionStep.assignedRole === workflowStep.assignedRole, `Replay step role mismatch for ${stepId}`);
    });
  }

  assert(replayByRunId.size === dataset.replays.length, 'Replays must have unique runIds');
  assert(replayByRunId.size === runById.size, 'Every run must have exactly one replay');

  const contextRunIds = new Set<string>();
  for (const [runId, context] of Object.entries(dataset.operationalContexts)) {
    operationalContextSchema.parse(context);
    assert(!contextRunIds.has(runId), `Duplicate operational context found for runId: ${runId}`);
    contextRunIds.add(runId);
    assert(context.runId === runId, `Operational context key must match its runId: ${runId}`);
    assert(runById.has(runId), `Operational context references missing runId: ${runId}`);
    assert(context.workflowId === dataset.workflow.workflowId, `Operational context workflowId must match dataset workflowId for ${runId}`);
    assert(replayByRunId.has(runId), `Operational context must have a matching replay for ${runId}`);
  }

  assert(contextRunIds.size === runById.size, 'Every run must have exactly one operational context');

  return dataset;
}
