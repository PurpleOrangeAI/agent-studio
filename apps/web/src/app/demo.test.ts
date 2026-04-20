import { seededIds, seededRunById, seededRuns, seededStudioState, seededWorkflow } from '@agent-studio/demo';

import { buildWorkflowDemoState, demoAppState, getDemoWorkflowState } from './demo';

describe('demo workflow state', () => {
  it('resolves room data as a single workflow-owned unit', () => {
    const state = getDemoWorkflowState(demoAppState.defaultWorkflowId);

    expect(state.workflow.workflowId).toBe(demoAppState.defaultWorkflowId);
    expect(state.live.run.workflowId).toBe(state.workflow.workflowId);
    expect(state.replay.run.workflowId).toBe(state.workflow.workflowId);
    expect(state.optimize.baselineRun.workflowId).toBe(state.workflow.workflowId);
    expect(state.optimize.candidateRun.workflowId).toBe(state.workflow.workflowId);
  });

  it('keeps optimize promotion summary tied to the selected candidate when unrelated events are appended later', () => {
    const state = buildWorkflowDemoState({
      workflow: seededWorkflow,
      runsByNewest: [...seededRuns],
      runById: seededRunById,
      liveRunId: seededIds.improvedRunId,
      replayRunId: seededIds.degradedRunId,
      baselineRunId: seededIds.baselineRunId,
      optimizeRunId: seededIds.improvedRunId,
      candidatePlanId: seededIds.improvedPlanId,
      studioState: {
        ...seededStudioState,
        promotionHistory: [
          ...(seededStudioState.promotionHistory ?? []),
          {
            eventId: 'promo_unrelated_future',
            appliedAt: '2026-04-20T14:30:00.000Z',
            mode: 'rollback',
            summary: 'Unrelated future promotion event.',
            sourceExperimentId: 'exp_unrelated_future',
          },
        ],
      },
    });

    expect(state.optimize.promotionSummary).toBe(
      'Promoted the tighter fan-out plan after it matched the baseline output with lower spend.',
    );
    expect(state.optimize.promotionHistory.map((event) => event.eventId)).not.toContain('promo_unrelated_future');
  });
});
