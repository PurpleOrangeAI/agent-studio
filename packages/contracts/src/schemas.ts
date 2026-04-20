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
  status: runStatusSchema,
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
  status: runStatusSchema,
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
