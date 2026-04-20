import {
  operationalContextSchema,
  replaySchema,
  runSchema,
  studioStateSchema,
  workflowSchema,
} from '@agent-studio/contracts';

import { seededOperationalContexts } from './recommendations.js';
import { seededReplayByRunId, seededReplays, seededRuns } from './runs.js';
import { seededIds, seededStudioState, seededWorkflow } from './workflows.js';

export {
  seededIds,
  seededOperationalContexts,
  seededReplayByRunId,
  seededReplays,
  seededRuns,
  seededStudioState,
  seededWorkflow,
};

export const seededDemoDataset = {
  workflow: seededWorkflow,
  runs: seededRuns,
  replays: seededReplays,
  operationalContexts: seededOperationalContexts,
  studioState: seededStudioState,
} as const;

export function validateSeededDemoDataset(dataset: typeof seededDemoDataset = seededDemoDataset) {
  workflowSchema.parse(dataset.workflow);
  studioStateSchema.parse(dataset.studioState);

  for (const run of dataset.runs) {
    runSchema.parse(run);
  }

  for (const replay of dataset.replays) {
    replaySchema.parse(replay);
  }

  for (const context of Object.values(dataset.operationalContexts)) {
    operationalContextSchema.parse(context);
  }

  return dataset;
}
