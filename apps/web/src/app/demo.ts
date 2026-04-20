import {
  seededDemoDataset,
  seededIds,
  seededReplayByRunId,
  seededRunById,
  seededRuns,
  seededStudioState,
  validateSeededDemoDataset,
} from '@agent-studio/demo';
import type { PromotionEvent, Replay, Run, SavedPlan, StudioState, Workflow } from '@agent-studio/contracts';

validateSeededDemoDataset();

type RunById = Record<string, Run>;

interface BuildWorkflowDemoStateInput {
  workflow: Workflow;
  runsByNewest: Run[];
  runById: RunById;
  liveRunId: string;
  replayRunId: string;
  baselineRunId: string;
  optimizeRunId: string;
  candidatePlanId: string;
  studioState: StudioState;
}

export interface WorkflowDemoState {
  workflow: Workflow;
  runsByNewest: Run[];
  live: {
    run: Run;
    replay: Replay;
  };
  replay: {
    run: Run;
    replay: Replay;
    baselineRun: Run;
  };
  optimize: {
    baselineRun: Run;
    candidateRun: Run;
    candidateReplay: Replay;
    candidatePlan: SavedPlan | null;
    promotionHistory: PromotionEvent[];
    promotionSummary: string;
  };
}

function requireRun(runById: RunById, runId: string): Run {
  const run = runById[runId];

  if (!run) {
    throw new Error(`Missing run ${runId}`);
  }

  return run;
}

function requireReplay(run: Run): Replay {
  const replay = seededReplayByRunId[run.runId as keyof typeof seededReplayByRunId];

  if (!replay) {
    throw new Error(`Missing replay for run ${run.runId}`);
  }

  return replay;
}

function findCandidatePromotionHistory(
  studioState: StudioState,
  candidatePlan: SavedPlan | null,
  candidateRun: Run,
): PromotionEvent[] {
  const promotions = studioState.promotionHistory ?? [];
  const candidatePlanId = candidatePlan?.id;
  const candidateExperimentId = candidateRun.experimentId;

  return promotions.filter((promotion) => {
    if (candidatePlanId && promotion.planId === candidatePlanId) {
      return true;
    }

    if (candidateExperimentId && promotion.sourceExperimentId === candidateExperimentId) {
      return true;
    }

    return false;
  });
}

export function buildWorkflowDemoState({
  workflow,
  runsByNewest,
  runById,
  liveRunId,
  replayRunId,
  baselineRunId,
  optimizeRunId,
  candidatePlanId,
  studioState,
}: BuildWorkflowDemoStateInput): WorkflowDemoState {
  const liveRun = requireRun(runById, liveRunId);
  const replayRun = requireRun(runById, replayRunId);
  const baselineRun = requireRun(runById, baselineRunId);
  const candidateRun = requireRun(runById, optimizeRunId);
  const candidatePlan = studioState.savedPlans?.find((plan) => plan.id === candidatePlanId) ?? null;
  const promotionHistory = findCandidatePromotionHistory(studioState, candidatePlan, candidateRun);
  const promotionSummary =
    promotionHistory[promotionHistory.length - 1]?.summary ?? 'Promotion history not available for this candidate.';

  return {
    workflow,
    runsByNewest,
    live: {
      run: liveRun,
      replay: requireReplay(liveRun),
    },
    replay: {
      run: replayRun,
      replay: requireReplay(replayRun),
      baselineRun,
    },
    optimize: {
      baselineRun,
      candidateRun,
      candidateReplay: requireReplay(candidateRun),
      candidatePlan,
      promotionHistory,
      promotionSummary,
    },
  };
}

const workflowStates: Record<string, WorkflowDemoState> = {
  [seededDemoDataset.workflow.workflowId]: buildWorkflowDemoState({
    workflow: seededDemoDataset.workflow,
    runsByNewest: [...seededRuns].sort((left, right) => right.startedAt.localeCompare(left.startedAt)),
    runById: seededRunById,
    liveRunId: seededIds.improvedRunId,
    replayRunId: seededIds.degradedRunId,
    baselineRunId: seededIds.baselineRunId,
    optimizeRunId: seededIds.improvedRunId,
    candidatePlanId: seededIds.improvedPlanId,
    studioState: seededStudioState,
  }),
};

const workflowList = Object.values(workflowStates).map((state) => state.workflow);

export function getDemoWorkflowState(workflowId: string): WorkflowDemoState {
  return workflowStates[workflowId] ?? workflowStates[workflowList[0]?.workflowId ?? seededDemoDataset.workflow.workflowId];
}

export const demoAppState = {
  runtimeOptions: [
    {
      id: 'demo',
      label: 'Seeded demo runtime',
      detail: 'Read-only public walkthrough with realistic workflow history.',
    },
  ],
  defaultWorkflowId: workflowList[0]?.workflowId ?? seededDemoDataset.workflow.workflowId,
  workflows: workflowList,
} as const;
