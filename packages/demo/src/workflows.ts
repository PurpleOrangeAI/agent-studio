import type { PolicySnapshot, RoleDirectiveMap, SavedPlan, StudioState, Workflow } from '@agent-studio/contracts';

export const seededIds = {
  workspaceId: 'workspace_demo',
  workflowId: 'workflow_ops_brief',
  baselineRunId: 'run_ops_2026_04_17_0800',
  degradedRunId: 'run_ops_2026_04_18_0800',
  improvedRunId: 'run_ops_2026_04_19_0800',
  baselineExperimentId: 'exp_ops_baseline',
  degradedExperimentId: 'exp_ops_degraded',
  improvedExperimentId: 'exp_ops_improved',
  baselinePlanId: 'plan_balanced_brief',
  improvedPlanId: 'plan_tighter_fanout',
  scenarioId: 'weekly_ops_brief',
  recommendedPresetId: 'recommended',
  leanPresetId: 'lean_ops',
  optimizedPresetId: 'optimized_brief',
} as const;

export const seededPolicy: PolicySnapshot = {
  mode: 'recommended',
  optimizationGoal: 'balanced',
  reviewPolicy: 'standard',
  maxElasticLanes: 2,
};

export const seededWorkflow = {
  workspaceId: seededIds.workspaceId,
  workspaceName: 'Demo Workspace',
  workflowId: seededIds.workflowId,
  name: 'Weekly Operations Brief',
  description:
    'Collect inbound signals, normalize evidence, synthesize a recommendation, review it, and publish the final brief.',
  status: 'active',
  schedule: '0 8 * * 1-5',
  createdAt: '2026-04-16T15:00:00.000Z',
  updatedAt: '2026-04-19T13:07:54.000Z',
  steps: [
    {
      stepId: 'capture-intake',
      kind: 'capture',
      title: 'Capture intake and context',
      objective: 'Normalize the incoming request, dedupe it against the active queue, and attach the operating context.',
      assignedRole: 'coordinator',
      modelTier: 'micro',
      toolName: 'queue.read',
    },
    {
      stepId: 'collect-evidence',
      kind: 'search',
      title: 'Collect supporting evidence',
      objective: 'Gather recent internal and external evidence, keeping source quality tags attached.',
      assignedRole: 'researcher',
      dependsOnStepIds: ['capture-intake'],
      modelTier: 'micro',
      toolName: 'evidence.search',
    },
    {
      stepId: 'normalize-evidence',
      kind: 'capture',
      title: 'Normalize notes into a fact table',
      objective: 'Convert raw evidence into a compact cited fact table with signal flags and exclusions.',
      assignedRole: 'annotator',
      dependsOnStepIds: ['collect-evidence'],
      modelTier: 'default',
      toolName: 'notes.normalize',
    },
    {
      stepId: 'synthesize-brief',
      kind: 'analyze',
      title: 'Synthesize the recommendation',
      objective: 'Turn the fact table into a recommendation with trade-offs, confidence, and next actions.',
      assignedRole: 'analyst',
      dependsOnStepIds: ['normalize-evidence'],
      modelTier: 'hard',
    },
    {
      stepId: 'guardrail-review',
      kind: 'note',
      title: 'Review policy and citation coverage',
      objective: 'Check policy, confirm evidence coverage, and decide whether the brief is ready to publish.',
      assignedRole: 'reviewer',
      dependsOnStepIds: ['synthesize-brief'],
      modelTier: 'default',
      toolName: 'review.check',
    },
    {
      stepId: 'publish-brief',
      kind: 'deliver',
      title: 'Publish the final brief',
      objective: 'Send the recommendation to the operator and persist the replayable artifact.',
      assignedRole: 'publisher',
      dependsOnStepIds: ['guardrail-review'],
      modelTier: 'default',
      toolName: 'brief.publish',
    },
  ],
  policy: {
    mode: 'custom',
    optimizationGoal: 'balanced',
    reviewPolicy: 'standard',
    maxElasticLanes: 1,
  },
} satisfies Workflow;

export const seededRoleDirectives = {
  coordinator: {
    mode: 'cheaper',
    phases: ['capture', 'search'],
    updatedAt: '2026-04-17T07:45:00.000Z',
  },
  researcher: {
    mode: 'cheaper',
    phases: ['search'],
    updatedAt: '2026-04-17T07:46:00.000Z',
  },
  annotator: {
    mode: 'review',
    phases: ['capture'],
    updatedAt: '2026-04-18T12:55:00.000Z',
  },
  analyst: {
    mode: 'review',
    phases: ['analyze', 'summarize'],
    updatedAt: '2026-04-19T08:05:00.000Z',
  },
  reviewer: {
    mode: 'review',
    phases: ['note'],
    updatedAt: '2026-04-19T08:06:00.000Z',
  },
  publisher: {
    mode: 'promote',
    phases: ['deliver'],
    updatedAt: '2026-04-19T08:07:00.000Z',
  },
} satisfies RoleDirectiveMap;

export const seededStudioState: StudioState = {
  selectedScenarioId: seededIds.scenarioId,
  previewPresetId: seededIds.optimizedPresetId,
  roleDirectives: seededRoleDirectives,
  experimentHistory: [
    {
      id: seededIds.baselineExperimentId,
      scenarioId: seededIds.scenarioId,
      previewPresetId: seededIds.recommendedPresetId,
      createdAt: '2026-04-17T07:40:00.000Z',
      notes: 'Baseline control run used to establish a stable weekly reference.',
    },
    {
      id: seededIds.degradedExperimentId,
      scenarioId: seededIds.scenarioId,
      previewPresetId: seededIds.leanPresetId,
      createdAt: '2026-04-18T12:40:00.000Z',
      parentExperimentId: seededIds.baselineExperimentId,
      notes: 'Lean review removed the citation gate and produced a failed replay.',
    },
    {
      id: seededIds.improvedExperimentId,
      scenarioId: seededIds.scenarioId,
      previewPresetId: seededIds.optimizedPresetId,
      createdAt: '2026-04-19T07:58:00.000Z',
      parentExperimentId: seededIds.baselineExperimentId,
      notes: 'Candidate tightened source fan-out without weakening the review step.',
    },
  ],
  savedPlans: [
    {
      id: seededIds.baselinePlanId,
      name: 'Balanced brief',
      createdAt: '2026-04-17T07:42:00.000Z',
      scenarioId: seededIds.scenarioId,
      previewPresetId: seededIds.recommendedPresetId,
      executionPolicy: seededPolicy,
      intentLabel: 'Stable weekly operations brief',
      sourceExperimentId: seededIds.baselineExperimentId,
      sourceExperimentLabel: 'Baseline control',
      notes: 'Reference plan with balanced fan-out and standard review.',
    },
    {
      id: seededIds.improvedPlanId,
      name: 'Tighter fan-out',
      createdAt: '2026-04-19T08:00:00.000Z',
      scenarioId: seededIds.scenarioId,
      previewPresetId: seededIds.optimizedPresetId,
      executionPolicy: {
        mode: 'custom',
        optimizationGoal: 'balanced',
        reviewPolicy: 'standard',
        maxElasticLanes: 1,
      },
      roleDirectives: {
        researcher: {
          mode: 'cheaper',
          phases: ['search'],
          updatedAt: '2026-04-19T07:59:00.000Z',
        },
        reviewer: {
          mode: 'review',
          phases: ['note'],
          updatedAt: '2026-04-19T08:00:00.000Z',
        },
      },
      parentPlanId: seededIds.baselinePlanId,
      sourceExperimentId: seededIds.improvedExperimentId,
      sourceExperimentLabel: 'Guardrailed candidate',
      intentLabel: 'Lower-cost weekly brief without quality loss',
      notes: 'The candidate plan trims duplicate source fan-out but keeps the review gate intact.',
    },
  ],
  promotionHistory: [
    {
      eventId: 'promo_ops_learning',
      appliedAt: '2026-04-17T08:20:00.000Z',
      mode: 'learning',
      summary: 'Captured the baseline as the stable control sample.',
      sourceExperimentId: seededIds.baselineExperimentId,
      sourceExperimentLabel: 'Baseline control',
      confidence: 78,
      successDelta: 0,
      creditsDelta: 0,
      durationDelta: 0,
    },
    {
      eventId: 'promo_ops_phase_review',
      appliedAt: '2026-04-18T13:25:00.000Z',
      mode: 'phase',
      summary: 'Moved the citation check into a dedicated review step after the lean replay failed.',
      sourceExperimentId: seededIds.degradedExperimentId,
      sourceExperimentLabel: 'Lean review candidate',
      planId: seededIds.improvedPlanId,
      phase: 'note',
      autoApplied: true,
      confidence: 84,
      successDelta: 1,
      creditsDelta: 3,
      durationDelta: 132000,
    },
    {
      eventId: 'promo_ops_graduation',
      appliedAt: '2026-04-19T08:30:00.000Z',
      mode: 'graduation',
      summary: 'Promoted the tighter fan-out plan after it matched the baseline output with lower spend.',
      sourceExperimentId: seededIds.improvedExperimentId,
      sourceExperimentLabel: 'Guardrailed candidate',
      planId: seededIds.improvedPlanId,
      parentPlanId: seededIds.baselinePlanId,
      autoApplied: false,
      confidence: 93,
      successDelta: 1,
      creditsDelta: -12,
      durationDelta: -86000,
    },
  ],
} satisfies StudioState;

function createHistoricalRoleDirectives(day: '2026-04-17' | '2026-04-18'): RoleDirectiveMap {
  return {
    coordinator: {
      mode: 'cheaper',
      phases: ['capture', 'search'],
      updatedAt: `${day}T07:45:00.000Z`,
    },
    researcher: {
      mode: 'cheaper',
      phases: ['search'],
      updatedAt: `${day}T07:46:00.000Z`,
    },
    annotator: {
      mode: 'review',
      phases: ['capture'],
      updatedAt: `${day}T12:55:00.000Z`,
    },
    analyst: {
      mode: 'review',
      phases: ['analyze', 'summarize'],
      updatedAt: `${day}T08:05:00.000Z`,
    },
    reviewer: {
      mode: 'review',
      phases: ['note'],
      updatedAt: `${day}T08:06:00.000Z`,
    },
    publisher: {
      mode: 'promote',
      phases: ['deliver'],
      updatedAt: `${day}T08:07:00.000Z`,
    },
  };
}

const baselineSavedPlan = seededStudioState.savedPlans?.find((plan) => plan.id === seededIds.baselinePlanId);
const baselineExperiment = seededStudioState.experimentHistory?.find(
  (experiment) => experiment.id === seededIds.baselineExperimentId,
);
const degradedExperiment = seededStudioState.experimentHistory?.find(
  (experiment) => experiment.id === seededIds.degradedExperimentId,
);
const baselinePromotion = seededStudioState.promotionHistory?.find(
  (event) => event.eventId === 'promo_ops_learning',
);

const degradedSavedPlan: SavedPlan = {
  id: 'plan_lean_review',
  name: 'Lean review',
  createdAt: '2026-04-18T12:45:00.000Z',
  scenarioId: seededIds.scenarioId,
  previewPresetId: seededIds.leanPresetId,
  executionPolicy: {
    mode: 'custom',
    optimizationGoal: 'cost_saver',
    reviewPolicy: 'lean',
    maxElasticLanes: 1,
  },
  intentLabel: 'Lower-cost weekly brief',
  sourceExperimentId: seededIds.degradedExperimentId,
  sourceExperimentLabel: 'Lean review failure',
  notes: 'Removed the citation gate and was not safe to keep.',
};

export const seededWorkflowByRunId = {
  [seededIds.baselineRunId]: {
    ...seededWorkflow,
    updatedAt: '2026-04-17T13:09:20.000Z',
    policy: seededPolicy,
  },
  [seededIds.degradedRunId]: {
    ...seededWorkflow,
    updatedAt: '2026-04-18T13:10:40.000Z',
    policy: {
      mode: 'custom',
      optimizationGoal: 'cost_saver',
      reviewPolicy: 'lean',
      maxElasticLanes: 1,
    },
  },
  [seededIds.improvedRunId]: seededWorkflow,
} satisfies Record<string, Workflow>;

export const seededStudioStateByRunId = {
  [seededIds.baselineRunId]: {
    ...seededStudioState,
    previewPresetId: seededIds.recommendedPresetId,
    roleDirectives: createHistoricalRoleDirectives('2026-04-17'),
    experimentHistory: baselineExperiment ? [baselineExperiment] : [],
    savedPlans: baselineSavedPlan ? [baselineSavedPlan] : [],
    promotionHistory: baselinePromotion ? [baselinePromotion] : [],
  },
  [seededIds.degradedRunId]: {
    ...seededStudioState,
    previewPresetId: seededIds.leanPresetId,
    roleDirectives: createHistoricalRoleDirectives('2026-04-18'),
    experimentHistory: baselineExperiment && degradedExperiment ? [baselineExperiment, degradedExperiment] : [],
    savedPlans: baselineSavedPlan ? [baselineSavedPlan, degradedSavedPlan] : [degradedSavedPlan],
    promotionHistory: baselinePromotion ? [baselinePromotion] : [],
  },
  [seededIds.improvedRunId]: seededStudioState,
} satisfies Record<string, StudioState>;
