export type PhaseKind =
  | 'search'
  | 'query'
  | 'capture'
  | 'analyze'
  | 'summarize'
  | 'deliver'
  | 'note';

export type DirectiveMode = 'cheaper' | 'review' | 'promote';
export type ExecutionMode = 'recommended' | 'custom';
export type OptimizationGoal = 'balanced' | 'cost_saver' | 'quality_first';
export type ReviewPolicy = 'lean' | 'standard' | 'strict';
export type RunStatus = 'planned' | 'running' | 'succeeded' | 'failed' | 'skipped';
export type PromotionMode =
  | 'preset'
  | 'steering'
  | 'full'
  | 'phase'
  | 'preset_phase'
  | 'learning'
  | 'graduation'
  | 'rollback';

export interface Workspace {
  workspaceId: string;
  workspaceName?: string;
}

export interface WorkflowStep {
  stepId: string;
  kind: PhaseKind;
  title: string;
  objective: string;
  assignedRole: string;
  dependsOnStepIds?: string[];
  modelTier?: string;
  toolName?: string;
}

export interface PolicySnapshot {
  mode: ExecutionMode;
  optimizationGoal: OptimizationGoal;
  reviewPolicy: ReviewPolicy;
  maxElasticLanes: number;
}

export interface RoleDirective {
  mode: DirectiveMode;
  phases?: PhaseKind[];
  updatedAt?: string;
}

export type RoleDirectiveMap = Record<string, RoleDirective>;

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface StepExecution {
  stepId: string;
  kind: PhaseKind;
  title: string;
  assignedRole: string;
  status: RunStatus;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  modelTier?: string;
  modelSource?: string;
  directiveMode?: DirectiveMode;
  directivePhases?: PhaseKind[];
  toolCalls?: number;
  actualCredits?: number;
  tokenUsage?: TokenUsage;
  summary?: string;
  error?: string;
}

export interface RunExperimentAttribution {
  experimentId?: string;
  experimentLabel?: string;
  branchName?: string;
  parentExperimentId?: string;
  matchedSavedExperiment?: boolean;
  scenarioId?: string;
  scenarioLabel?: string;
  previewPresetId?: string;
  previewPresetLabel?: string;
}

export interface Run extends RunExperimentAttribution {
  runId: string;
  workflowId: string;
  status: RunStatus;
  startedAt: string;
  finishedAt?: string;
  estimatedCredits?: number;
  actualCredits?: number;
  durationMs?: number;
}

export interface Workflow extends Workspace {
  workflowId: string;
  name: string;
  description?: string;
  status: string;
  schedule?: string;
  createdAt?: string;
  updatedAt?: string;
  steps: WorkflowStep[];
  policy?: PolicySnapshot;
}

export interface ExperimentRecord {
  id: string;
  scenarioId: string;
  previewPresetId: string;
  createdAt: string;
  notes?: string;
  branchName?: string;
  parentExperimentId?: string;
  roleDirectives?: RoleDirectiveMap;
}

export interface SavedPlan {
  id: string;
  name: string;
  createdAt: string;
  scenarioId: string;
  previewPresetId: string;
  executionPolicy: PolicySnapshot;
  roleDirectives?: RoleDirectiveMap;
  intentLabel?: string;
  parentPlanId?: string;
  sourceExperimentId?: string;
  sourceExperimentLabel?: string;
  notes?: string;
}

export interface PromotionEvent {
  eventId: string;
  appliedAt: string;
  mode: PromotionMode;
  summary: string;
  sourceExperimentId?: string;
  sourceExperimentLabel?: string;
  planId?: string;
  parentPlanId?: string;
  phase?: PhaseKind;
  autoApplied?: boolean;
  confidence?: number;
  successDelta?: number;
  creditsDelta?: number;
  durationDelta?: number;
}

export interface StudioState {
  selectedScenarioId?: string;
  previewPresetId?: string;
  roleDirectives?: RoleDirectiveMap;
  experimentHistory?: ExperimentRecord[];
  savedPlans?: SavedPlan[];
  promotionHistory?: PromotionEvent[];
}

export interface OperationalContextSimilarRun {
  runId: string;
  label: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  actualCredits?: number;
  durationMs?: number;
  similarityScore: number;
  matchedSignals: string[];
}

export interface OperationalContextHealthyComparison {
  runId: string;
  label: string;
  startedAt: string;
  finishedAt?: string;
  creditsDelta?: number;
  durationDelta?: number;
  changedSignals: string[];
  summary: string;
}

export interface RecommendationEvidenceItem {
  evidenceId: string;
  title: string;
  body: string;
  sourceLabel: string;
  phase?: PhaseKind;
  relatedRunIds?: string[];
}

export interface OperationalContext {
  workflowId: string;
  runId?: string;
  generatedAt: string;
  similarRuns: OperationalContextSimilarRun[];
  lastHealthyComparison?: OperationalContextHealthyComparison;
  recommendationEvidence: RecommendationEvidenceItem[];
}

export interface Replay {
  workflow: Workflow;
  run: Run;
  stepExecutions: StepExecution[];
  policy?: PolicySnapshot;
  studioState?: StudioState;
  operationalContext?: OperationalContext;
}
