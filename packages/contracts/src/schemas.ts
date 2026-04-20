import { z } from 'zod';

import type {
  ExperimentRecord,
  OperationalContext,
  OperationalContextHealthyComparison,
  OperationalContextSimilarRun,
  PolicySnapshot,
  PromotionEvent,
  RecommendationEvidenceItem,
  Replay,
  RoleDirective,
  Run,
  RunExperimentAttribution,
  SavedPlan,
  StepExecution,
  StudioState,
  TokenUsage,
  Workflow,
  WorkflowStep,
  Workspace,
} from './types.js';

const nonEmptyString = z.string().trim().min(1);
const isoDatetime = z.string().datetime({ offset: true });
const nonNegativeInt = z.number().int().nonnegative();
const nonNegativeNumber = z.number().nonnegative();

export const phaseKindSchema = z.enum([
  'search',
  'query',
  'capture',
  'analyze',
  'summarize',
  'deliver',
  'note',
]);

export const directiveModeSchema = z.enum(['cheaper', 'review', 'promote']);
export const executionModeSchema = z.enum(['recommended', 'custom']);
export const optimizationGoalSchema = z.enum(['balanced', 'cost_saver', 'quality_first']);
export const reviewPolicySchema = z.enum(['lean', 'standard', 'strict']);
export const runStatusSchema = z.enum(['planned', 'running', 'succeeded', 'failed', 'skipped']);
export const promotionModeSchema = z.enum([
  'preset',
  'steering',
  'full',
  'phase',
  'preset_phase',
  'learning',
  'graduation',
  'rollback',
]);

export const workspaceSchema: z.ZodType<Workspace> = z.object({
  workspaceId: nonEmptyString,
  workspaceName: nonEmptyString.optional(),
});

export const workflowStepSchema: z.ZodType<WorkflowStep> = z.object({
  stepId: nonEmptyString,
  kind: phaseKindSchema,
  title: nonEmptyString,
  objective: nonEmptyString,
  assignedRole: nonEmptyString,
  dependsOnStepIds: z.array(nonEmptyString).optional(),
  modelTier: nonEmptyString.optional(),
  toolName: nonEmptyString.optional(),
});

export const policySnapshotSchema: z.ZodType<PolicySnapshot> = z.object({
  mode: executionModeSchema,
  optimizationGoal: optimizationGoalSchema,
  reviewPolicy: reviewPolicySchema,
  maxElasticLanes: nonNegativeInt,
});

export const roleDirectiveSchema: z.ZodType<RoleDirective> = z.object({
  mode: directiveModeSchema,
  phases: z.array(phaseKindSchema).optional(),
  updatedAt: isoDatetime.optional(),
});

export const roleDirectiveMapSchema = z.record(nonEmptyString, roleDirectiveSchema);

export const tokenUsageSchema: z.ZodType<TokenUsage> = z.object({
  inputTokens: nonNegativeInt.optional(),
  outputTokens: nonNegativeInt.optional(),
  totalTokens: nonNegativeInt.optional(),
});

export const stepExecutionSchema: z.ZodType<StepExecution> = z.object({
  stepId: nonEmptyString,
  kind: phaseKindSchema,
  title: nonEmptyString,
  assignedRole: nonEmptyString,
  status: z.union([runStatusSchema, nonEmptyString]),
  startedAt: isoDatetime.optional(),
  finishedAt: isoDatetime.optional(),
  durationMs: nonNegativeInt.optional(),
  modelTier: nonEmptyString.optional(),
  modelSource: nonEmptyString.optional(),
  directiveMode: directiveModeSchema.optional(),
  directivePhases: z.array(phaseKindSchema).optional(),
  toolCalls: nonNegativeInt.optional(),
  actualCredits: nonNegativeNumber.optional(),
  tokenUsage: tokenUsageSchema.optional(),
  summary: nonEmptyString.optional(),
  error: nonEmptyString.optional(),
});

export const runExperimentAttributionSchema: z.ZodType<RunExperimentAttribution> = z.object({
  experimentId: nonEmptyString.optional(),
  experimentLabel: nonEmptyString.optional(),
  branchName: nonEmptyString.optional(),
  parentExperimentId: nonEmptyString.optional(),
  matchedSavedExperiment: z.boolean().optional(),
  scenarioId: nonEmptyString.optional(),
  scenarioLabel: nonEmptyString.optional(),
  previewPresetId: nonEmptyString.optional(),
  previewPresetLabel: nonEmptyString.optional(),
});

export const runSchema: z.ZodType<Run> = z.object({
  runId: nonEmptyString,
  workflowId: nonEmptyString,
  status: z.union([runStatusSchema, nonEmptyString]),
  startedAt: isoDatetime,
  finishedAt: isoDatetime.optional(),
  estimatedCredits: nonNegativeNumber.optional(),
  actualCredits: nonNegativeNumber.optional(),
  durationMs: nonNegativeInt.optional(),
  experimentId: nonEmptyString.optional(),
  experimentLabel: nonEmptyString.optional(),
  branchName: nonEmptyString.optional(),
  parentExperimentId: nonEmptyString.optional(),
  matchedSavedExperiment: z.boolean().optional(),
  scenarioId: nonEmptyString.optional(),
  scenarioLabel: nonEmptyString.optional(),
  previewPresetId: nonEmptyString.optional(),
  previewPresetLabel: nonEmptyString.optional(),
});

export const workflowSchema: z.ZodType<Workflow> = z.object({
  workspaceId: nonEmptyString,
  workspaceName: nonEmptyString.optional(),
  workflowId: nonEmptyString,
  name: nonEmptyString,
  description: nonEmptyString.optional(),
  status: nonEmptyString,
  schedule: nonEmptyString.optional(),
  createdAt: isoDatetime.optional(),
  updatedAt: isoDatetime.optional(),
  steps: z.array(workflowStepSchema),
  policy: policySnapshotSchema.optional(),
});

export const experimentRecordSchema: z.ZodType<ExperimentRecord> = z.object({
  id: nonEmptyString,
  scenarioId: nonEmptyString,
  previewPresetId: nonEmptyString,
  createdAt: isoDatetime,
  notes: nonEmptyString.optional(),
  branchName: nonEmptyString.optional(),
  parentExperimentId: nonEmptyString.optional(),
  roleDirectives: roleDirectiveMapSchema.optional(),
});

export const savedPlanSchema: z.ZodType<SavedPlan> = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  createdAt: isoDatetime,
  scenarioId: nonEmptyString,
  previewPresetId: nonEmptyString,
  executionPolicy: policySnapshotSchema,
  roleDirectives: roleDirectiveMapSchema.optional(),
  intentLabel: nonEmptyString.optional(),
  parentPlanId: nonEmptyString.optional(),
  sourceExperimentId: nonEmptyString.optional(),
  sourceExperimentLabel: nonEmptyString.optional(),
  notes: nonEmptyString.optional(),
});

export const promotionEventSchema: z.ZodType<PromotionEvent> = z.object({
  eventId: nonEmptyString,
  appliedAt: isoDatetime,
  mode: promotionModeSchema,
  summary: nonEmptyString,
  sourceExperimentId: nonEmptyString.optional(),
  sourceExperimentLabel: nonEmptyString.optional(),
  planId: nonEmptyString.optional(),
  parentPlanId: nonEmptyString.optional(),
  phase: phaseKindSchema.optional(),
  autoApplied: z.boolean().optional(),
  confidence: z.number().min(0).max(100).optional(),
  successDelta: z.number().optional(),
  creditsDelta: z.number().optional(),
  durationDelta: z.number().optional(),
});

export const studioStateSchema: z.ZodType<StudioState> = z.object({
  selectedScenarioId: nonEmptyString.optional(),
  previewPresetId: nonEmptyString.optional(),
  roleDirectives: roleDirectiveMapSchema.optional(),
  experimentHistory: z.array(experimentRecordSchema).optional(),
  savedPlans: z.array(savedPlanSchema).optional(),
  promotionHistory: z.array(promotionEventSchema).optional(),
});

export const operationalContextSimilarRunSchema: z.ZodType<OperationalContextSimilarRun> = z.object({
  runId: nonEmptyString,
  label: nonEmptyString,
  status: nonEmptyString,
  startedAt: isoDatetime,
  finishedAt: isoDatetime.optional(),
  actualCredits: nonNegativeNumber.optional(),
  durationMs: nonNegativeInt.optional(),
  similarityScore: z.number().min(0).max(1),
  matchedSignals: z.array(nonEmptyString),
});

export const operationalContextHealthyComparisonSchema: z.ZodType<OperationalContextHealthyComparison> = z.object({
  runId: nonEmptyString,
  label: nonEmptyString,
  startedAt: isoDatetime,
  finishedAt: isoDatetime.optional(),
  creditsDelta: z.number().optional(),
  durationDelta: z.number().optional(),
  changedSignals: z.array(nonEmptyString),
  summary: nonEmptyString,
});

export const recommendationEvidenceItemSchema: z.ZodType<RecommendationEvidenceItem> = z.object({
  evidenceId: nonEmptyString,
  title: nonEmptyString,
  body: nonEmptyString,
  sourceLabel: nonEmptyString,
  phase: phaseKindSchema.optional(),
  relatedRunIds: z.array(nonEmptyString).optional(),
});

export const operationalContextSchema: z.ZodType<OperationalContext> = z.object({
  workflowId: nonEmptyString,
  runId: nonEmptyString.optional(),
  generatedAt: isoDatetime,
  similarRuns: z.array(operationalContextSimilarRunSchema),
  lastHealthyComparison: operationalContextHealthyComparisonSchema.optional(),
  recommendationEvidence: z.array(recommendationEvidenceItemSchema),
});

export const replaySchema: z.ZodType<Replay> = z.object({
  workflow: workflowSchema,
  run: runSchema,
  stepExecutions: z.array(stepExecutionSchema),
  policy: policySnapshotSchema.optional(),
  studioState: studioStateSchema.optional(),
  operationalContext: operationalContextSchema.optional(),
});

export const contractExamples = {
  workspace: {
    workspaceId: 'workspace_demo',
    workspaceName: 'Demo Workspace',
  },
  policy: {
    mode: 'recommended',
    optimizationGoal: 'balanced',
    reviewPolicy: 'standard',
    maxElasticLanes: 2,
  },
  workflow: {
    workspaceId: 'workspace_demo',
    workspaceName: 'Demo Workspace',
    workflowId: 'workflow_market-brief',
    name: 'Market Brief',
    description: 'Collect sources, analyze changes, and deliver a short brief.',
    status: 'active',
    schedule: '0 9 * * 1-5',
    createdAt: '2026-04-20T12:00:00.000Z',
    updatedAt: '2026-04-20T12:15:00.000Z',
    steps: [
      {
        stepId: 'search-sources',
        kind: 'search',
        title: 'Search latest sources',
        objective: 'Find recent market updates from trusted sources.',
        assignedRole: 'researcher',
        modelTier: 'micro',
        toolName: 'web.search',
      },
      {
        stepId: 'analyze-signals',
        kind: 'analyze',
        title: 'Analyze signals',
        objective: 'Turn findings into a concise point of view.',
        assignedRole: 'analyst',
        dependsOnStepIds: ['search-sources'],
        modelTier: 'hard',
      },
      {
        stepId: 'deliver-brief',
        kind: 'deliver',
        title: 'Deliver brief',
        objective: 'Send the final brief to the operator inbox.',
        assignedRole: 'operator',
        dependsOnStepIds: ['analyze-signals'],
        modelTier: 'default',
        toolName: 'email.send',
      },
    ],
    policy: {
      mode: 'recommended',
      optimizationGoal: 'balanced',
      reviewPolicy: 'standard',
      maxElasticLanes: 2,
    },
  },
  run: {
    runId: 'run_2026_04_20_0900',
    workflowId: 'workflow_market-brief',
    status: 'succeeded',
    startedAt: '2026-04-20T14:00:00.000Z',
    finishedAt: '2026-04-20T14:04:10.000Z',
    estimatedCredits: 18,
    actualCredits: 16,
    durationMs: 250000,
    experimentId: 'exp_balanced',
    experimentLabel: 'Balanced baseline',
    branchName: 'baseline',
    scenarioId: 'daily_brief',
    scenarioLabel: 'Daily brief',
    previewPresetId: 'recommended',
    previewPresetLabel: 'Recommended',
    matchedSavedExperiment: true,
  },
  replay: {
    workflow: {
      workspaceId: 'workspace_demo',
      workspaceName: 'Demo Workspace',
      workflowId: 'workflow_market-brief',
      name: 'Market Brief',
      description: 'Collect sources, analyze changes, and deliver a short brief.',
      status: 'active',
      schedule: '0 9 * * 1-5',
      createdAt: '2026-04-20T12:00:00.000Z',
      updatedAt: '2026-04-20T12:15:00.000Z',
      steps: [
        {
          stepId: 'search-sources',
          kind: 'search',
          title: 'Search latest sources',
          objective: 'Find recent market updates from trusted sources.',
          assignedRole: 'researcher',
          modelTier: 'micro',
          toolName: 'web.search',
        },
        {
          stepId: 'analyze-signals',
          kind: 'analyze',
          title: 'Analyze signals',
          objective: 'Turn findings into a concise point of view.',
          assignedRole: 'analyst',
          dependsOnStepIds: ['search-sources'],
          modelTier: 'hard',
        },
        {
          stepId: 'deliver-brief',
          kind: 'deliver',
          title: 'Deliver brief',
          objective: 'Send the final brief to the operator inbox.',
          assignedRole: 'operator',
          dependsOnStepIds: ['analyze-signals'],
          modelTier: 'default',
          toolName: 'email.send',
        },
      ],
      policy: {
        mode: 'recommended',
        optimizationGoal: 'balanced',
        reviewPolicy: 'standard',
        maxElasticLanes: 2,
      },
    },
    run: {
      runId: 'run_2026_04_20_0900',
      workflowId: 'workflow_market-brief',
      status: 'succeeded',
      startedAt: '2026-04-20T14:00:00.000Z',
      finishedAt: '2026-04-20T14:04:10.000Z',
      estimatedCredits: 18,
      actualCredits: 16,
      durationMs: 250000,
      experimentId: 'exp_balanced',
      experimentLabel: 'Balanced baseline',
      branchName: 'baseline',
      scenarioId: 'daily_brief',
      scenarioLabel: 'Daily brief',
      previewPresetId: 'recommended',
      previewPresetLabel: 'Recommended',
      matchedSavedExperiment: true,
    },
    stepExecutions: [
      {
        stepId: 'search-sources',
        kind: 'search',
        title: 'Search latest sources',
        assignedRole: 'researcher',
        status: 'succeeded',
        startedAt: '2026-04-20T14:00:00.000Z',
        finishedAt: '2026-04-20T14:01:10.000Z',
        durationMs: 70000,
        modelTier: 'micro',
        modelSource: 'web',
        toolCalls: 2,
        actualCredits: 3,
        tokenUsage: {
          inputTokens: 1200,
          outputTokens: 500,
          totalTokens: 1700,
        },
        summary: 'Collected five current sources and ranked them by relevance.',
      },
      {
        stepId: 'analyze-signals',
        kind: 'analyze',
        title: 'Analyze signals',
        assignedRole: 'analyst',
        status: 'succeeded',
        startedAt: '2026-04-20T14:01:12.000Z',
        finishedAt: '2026-04-20T14:03:20.000Z',
        durationMs: 128000,
        modelTier: 'hard',
        modelSource: 'gpt-5.4',
        directiveMode: 'review',
        directivePhases: ['analyze'],
        toolCalls: 0,
        actualCredits: 10,
        tokenUsage: {
          inputTokens: 4800,
          outputTokens: 900,
          totalTokens: 5700,
        },
        summary: 'Identified two durable changes and one weak signal to monitor.',
      },
      {
        stepId: 'deliver-brief',
        kind: 'deliver',
        title: 'Deliver brief',
        assignedRole: 'operator',
        status: 'succeeded',
        startedAt: '2026-04-20T14:03:21.000Z',
        finishedAt: '2026-04-20T14:04:10.000Z',
        durationMs: 49000,
        modelTier: 'default',
        modelSource: 'email',
        toolCalls: 1,
        actualCredits: 3,
        summary: 'Delivered a three-point brief with citations.',
      },
    ],
    policy: {
      mode: 'recommended',
      optimizationGoal: 'balanced',
      reviewPolicy: 'standard',
      maxElasticLanes: 2,
    },
    studioState: {
      selectedScenarioId: 'daily_brief',
      previewPresetId: 'recommended',
      roleDirectives: {
        analyst: {
          mode: 'review',
          phases: ['analyze'],
          updatedAt: '2026-04-20T13:55:00.000Z',
        },
      },
      experimentHistory: [
        {
          id: 'exp_balanced',
          scenarioId: 'daily_brief',
          previewPresetId: 'recommended',
          createdAt: '2026-04-20T13:50:00.000Z',
          notes: 'Baseline control branch.',
        },
      ],
      savedPlans: [
        {
          id: 'plan_reduce_review',
          name: 'Reduce review pressure',
          createdAt: '2026-04-20T13:57:00.000Z',
          scenarioId: 'daily_brief',
          previewPresetId: 'lean_ops',
          executionPolicy: {
            mode: 'custom',
            optimizationGoal: 'cost_saver',
            reviewPolicy: 'lean',
            maxElasticLanes: 1,
          },
          notes: 'Candidate for lighter daily briefs.',
        },
      ],
      promotionHistory: [
        {
          eventId: 'promo_001',
          appliedAt: '2026-04-20T14:10:00.000Z',
          mode: 'learning',
          summary: 'Captured the run as baseline evidence.',
          sourceExperimentId: 'exp_balanced',
          sourceExperimentLabel: 'Balanced baseline',
          confidence: 76,
          successDelta: 4,
          creditsDelta: -2,
        },
      ],
    },
    operationalContext: {
      workflowId: 'workflow_market-brief',
      runId: 'run_2026_04_20_0900',
      generatedAt: '2026-04-20T14:05:00.000Z',
      similarRuns: [
        {
          runId: 'run_2026_04_18_0900',
          label: 'Previous daily brief',
          status: 'succeeded',
          startedAt: '2026-04-18T14:00:00.000Z',
          finishedAt: '2026-04-18T14:04:40.000Z',
          actualCredits: 15,
          durationMs: 280000,
          similarityScore: 0.91,
          matchedSignals: ['Same workflow', 'Same policy preset'],
        },
      ],
      lastHealthyComparison: {
        runId: 'run_2026_04_18_0900',
        label: 'Previous daily brief',
        startedAt: '2026-04-18T14:00:00.000Z',
        finishedAt: '2026-04-18T14:04:40.000Z',
        creditsDelta: 1,
        durationDelta: -30000,
        changedSignals: ['Fewer sources', 'Shorter analysis loop'],
        summary: 'The current run was slightly cheaper and faster without reducing output quality.',
      },
      recommendationEvidence: [
        {
          evidenceId: 'evidence_001',
          title: 'Analysis is the dominant spend driver',
          body: 'The analyze phase used most credits while preserving high success, so it is the best place to test cheaper routing next.',
          sourceLabel: 'Replay aggregate',
          phase: 'analyze',
          relatedRunIds: ['run_2026_04_20_0900', 'run_2026_04_18_0900'],
        },
      ],
    },
  },
} as const;
