export type MetadataMap = Record<string, unknown>;
export type MetricDimensionValue = string | number | boolean;
export type MetricDimensions = Record<string, MetricDimensionValue>;

export interface RuntimeRegistration {
  runtimeId: string;
  kind: string;
  adapterId: string;
  adapterVersion?: string;
  label: string;
  capabilities?: string[];
  sourceRef?: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: MetadataMap;
}

export interface SystemDefinition {
  systemId: string;
  workspaceId: string;
  name: string;
  description?: string;
  runtimeIds: string[];
  status?: string;
  primaryRuntimeId?: string;
  policyRefs?: string[];
  createdAt?: string;
  updatedAt?: string;
  metadata?: MetadataMap;
}

export interface AgentDefinition {
  agentId: string;
  systemId: string;
  runtimeId: string;
  label: string;
  kind: string;
  role?: string;
  version?: string;
  capabilities?: string[];
  toolRefs?: string[];
  memoryRefs?: string[];
  status?: string;
  metadata?: MetadataMap;
}

export interface TopologyNode {
  nodeId: string;
  agentId?: string;
  runtimeId?: string;
  label: string;
  kind: string;
  role?: string;
  clusterId?: string;
  metadata?: MetadataMap;
}

export interface TopologyEdge {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  kind: string;
  label?: string;
  metadata?: MetadataMap;
}

export interface TopologySnapshot {
  snapshotId: string;
  systemId: string;
  capturedAt: string;
  sourceExecutionId?: string;
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  layoutHints?: MetadataMap;
  metadata?: MetadataMap;
}

export interface UsageStats {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  credits?: number;
  durationMs?: number;
  toolCalls?: number;
}

export interface ExecutionRecord {
  executionId: string;
  systemId: string;
  runtimeId: string;
  traceId: string;
  sessionId?: string;
  workflowId?: string;
  runId?: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  sourceRef?: string;
  metadata?: MetadataMap;
}

export interface SpanLink {
  spanId: string;
  relation?: string;
}

export interface SpanRecord {
  spanId: string;
  traceId: string;
  executionId: string;
  parentSpanId?: string;
  agentId?: string;
  nodeId?: string;
  name: string;
  kind: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  summary?: string;
  usage?: UsageStats;
  attrs?: MetadataMap;
  links?: SpanLink[];
}

export interface ArtifactRecord {
  artifactId: string;
  kind: string;
  scopeType: string;
  scopeId: string;
  executionId?: string;
  spanId?: string;
  agentId?: string;
  contentRef?: string;
  summary?: string;
  derivedFromArtifactIds?: string[];
  metadata?: MetadataMap;
}

export interface MetricSample {
  sampleId: string;
  metric: string;
  unit: string;
  value: number;
  ts: string;
  scopeType: string;
  scopeId: string;
  dimensions?: MetricDimensions;
}

export interface InterventionRecord {
  interventionId: string;
  targetScopeType: string;
  targetScopeId: string;
  actor: string;
  action: string;
  reason: string;
  requestedAt: string;
  appliedAt?: string;
  outcome?: string;
  status?: string;
  relatedTraceId?: string;
  relatedSpanId?: string;
  configPatch?: MetadataMap;
  metadata?: MetadataMap;
}

export interface MetricDelta {
  metric: string;
  unit?: string;
  baselineValue?: number;
  candidateValue?: number;
  delta?: number;
}

export interface EvaluationRecord {
  evaluationId: string;
  targetScopeType: string;
  targetScopeId: string;
  baselineRefs: string[];
  candidateRefs: string[];
  metricDeltas?: MetricDelta[];
  configPatch?: MetadataMap;
  verdict: string;
  createdAt: string;
  summary?: string;
  metadata?: MetadataMap;
}

export interface ReleaseDecision {
  releaseId: string;
  systemId: string;
  candidateRef: string;
  baselineRef?: string;
  decision: string;
  evidenceRefs?: string[];
  rollbackPlan?: string;
  requestedAt: string;
  appliedAt?: string;
  status?: string;
  summary?: string;
  metadata?: MetadataMap;
}
