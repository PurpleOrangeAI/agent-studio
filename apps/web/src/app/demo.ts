import {
  seededDemoDataset,
  seededIds,
  seededReplayByRunId,
  seededRunById,
  seededRuns,
  seededStudioState,
  validateSeededDemoDataset,
} from '@agent-studio/demo';
import type { Replay, Run, SavedPlan, Workflow } from '@agent-studio/contracts';

validateSeededDemoDataset();

const runsByNewest = [...seededRuns].sort((left, right) => right.startedAt.localeCompare(left.startedAt));

const workflow = seededDemoDataset.workflow;
const liveRun = seededRunById[seededIds.improvedRunId];
const replayRun = seededRunById[seededIds.degradedRunId];
const baselineRun = seededRunById[seededIds.baselineRunId];
const optimizeRun = seededRunById[seededIds.improvedRunId];
const candidatePlan = seededStudioState.savedPlans?.find((plan) => plan.id === seededIds.improvedPlanId) ?? null;
const latestPromotion = seededStudioState.promotionHistory?.[seededStudioState.promotionHistory.length - 1] ?? null;

function requireReplay(run: Run): Replay {
  const replay = seededReplayByRunId[run.runId as keyof typeof seededReplayByRunId];

  if (!replay) {
    throw new Error(`Missing replay for run ${run.runId}`);
  }

  return replay;
}

export const demoAppState = {
  runtimeOptions: [
    {
      id: 'demo',
      label: 'Seeded demo runtime',
      detail: 'Read-only public walkthrough with realistic workflow history.',
    },
  ],
  workflows: [workflow] satisfies Workflow[],
  runsByNewest,
  workflow,
  liveRun,
  replayRun,
  baselineRun,
  optimizeRun,
  liveReplay: requireReplay(liveRun),
  replayReplay: requireReplay(replayRun),
  optimizeReplay: requireReplay(optimizeRun),
  candidatePlan,
  latestPromotion,
} as const;

export type DemoAppState = typeof demoAppState;
export type CandidatePlan = SavedPlan | null;
