import { z } from 'zod';

import type {
  AgentDefinition,
  ArtifactRecord,
  EvaluationRecord,
  ExecutionRecord,
  InterventionRecord,
  MetricDelta,
  MetricSample,
  ReleaseDecision,
  RuntimeRegistration,
  SpanLink,
  SpanRecord,
  SystemDefinition,
  TopologyEdge,
  TopologyNode,
  TopologySnapshot,
  UsageStats,
} from './control-plane-types.js';

const nonEmptyString = z.string().trim().min(1);
const isoDatetime = z.string().datetime({ offset: true });
const nonNegativeInt = z.number().int().nonnegative();
const metadataSchema = z.record(z.string(), z.unknown());
const dimensionValueSchema = z.union([z.string(), z.number(), z.boolean()]);
const metricDimensionsSchema = z.record(z.string(), dimensionValueSchema);

export const runtimeRegistrationSchema: z.ZodType<RuntimeRegistration> = z.object({
  runtimeId: nonEmptyString,
  kind: nonEmptyString,
  adapterId: nonEmptyString,
  adapterVersion: nonEmptyString.optional(),
  label: nonEmptyString,
  capabilities: z.array(nonEmptyString).optional(),
  sourceRef: nonEmptyString.optional(),
  createdAt: isoDatetime.optional(),
  updatedAt: isoDatetime.optional(),
  metadata: metadataSchema.optional(),
});

export const systemDefinitionSchema: z.ZodType<SystemDefinition> = z.object({
  systemId: nonEmptyString,
  workspaceId: nonEmptyString,
  name: nonEmptyString,
  description: nonEmptyString.optional(),
  runtimeIds: z.array(nonEmptyString),
  status: nonEmptyString.optional(),
  primaryRuntimeId: nonEmptyString.optional(),
  policyRefs: z.array(nonEmptyString).optional(),
  createdAt: isoDatetime.optional(),
  updatedAt: isoDatetime.optional(),
  metadata: metadataSchema.optional(),
});

export const agentDefinitionSchema: z.ZodType<AgentDefinition> = z.object({
  agentId: nonEmptyString,
  systemId: nonEmptyString,
  runtimeId: nonEmptyString,
  label: nonEmptyString,
  kind: nonEmptyString,
  role: nonEmptyString.optional(),
  version: nonEmptyString.optional(),
  capabilities: z.array(nonEmptyString).optional(),
  toolRefs: z.array(nonEmptyString).optional(),
  memoryRefs: z.array(nonEmptyString).optional(),
  status: nonEmptyString.optional(),
  metadata: metadataSchema.optional(),
});

export const topologyNodeSchema: z.ZodType<TopologyNode> = z.object({
  nodeId: nonEmptyString,
  agentId: nonEmptyString.optional(),
  runtimeId: nonEmptyString.optional(),
  label: nonEmptyString,
  kind: nonEmptyString,
  role: nonEmptyString.optional(),
  clusterId: nonEmptyString.optional(),
  metadata: metadataSchema.optional(),
});

export const topologyEdgeSchema: z.ZodType<TopologyEdge> = z.object({
  edgeId: nonEmptyString,
  sourceNodeId: nonEmptyString,
  targetNodeId: nonEmptyString,
  kind: nonEmptyString,
  label: nonEmptyString.optional(),
  metadata: metadataSchema.optional(),
});

export const topologySnapshotSchema: z.ZodType<TopologySnapshot> = z.object({
  snapshotId: nonEmptyString,
  systemId: nonEmptyString,
  capturedAt: isoDatetime,
  sourceExecutionId: nonEmptyString.optional(),
  nodes: z.array(topologyNodeSchema),
  edges: z.array(topologyEdgeSchema),
  layoutHints: metadataSchema.optional(),
  metadata: metadataSchema.optional(),
});

export const usageStatsSchema: z.ZodType<UsageStats> = z.object({
  inputTokens: nonNegativeInt.optional(),
  outputTokens: nonNegativeInt.optional(),
  totalTokens: nonNegativeInt.optional(),
  credits: z.number().nonnegative().optional(),
  durationMs: nonNegativeInt.optional(),
  toolCalls: nonNegativeInt.optional(),
});

export const executionRecordSchema: z.ZodType<ExecutionRecord> = z.object({
  executionId: nonEmptyString,
  systemId: nonEmptyString,
  runtimeId: nonEmptyString,
  traceId: nonEmptyString,
  sessionId: nonEmptyString.optional(),
  workflowId: nonEmptyString.optional(),
  runId: nonEmptyString.optional(),
  status: nonEmptyString,
  startedAt: isoDatetime,
  finishedAt: isoDatetime.optional(),
  sourceRef: nonEmptyString.optional(),
  metadata: metadataSchema.optional(),
});

export const spanLinkSchema: z.ZodType<SpanLink> = z.object({
  spanId: nonEmptyString,
  relation: nonEmptyString.optional(),
});

export const spanRecordSchema: z.ZodType<SpanRecord> = z.object({
  spanId: nonEmptyString,
  traceId: nonEmptyString,
  executionId: nonEmptyString,
  parentSpanId: nonEmptyString.optional(),
  agentId: nonEmptyString.optional(),
  nodeId: nonEmptyString.optional(),
  name: nonEmptyString,
  kind: nonEmptyString,
  status: nonEmptyString,
  startedAt: isoDatetime,
  finishedAt: isoDatetime.optional(),
  summary: nonEmptyString.optional(),
  usage: usageStatsSchema.optional(),
  attrs: metadataSchema.optional(),
  links: z.array(spanLinkSchema).optional(),
});

export const artifactRecordSchema: z.ZodType<ArtifactRecord> = z.object({
  artifactId: nonEmptyString,
  kind: nonEmptyString,
  scopeType: nonEmptyString,
  scopeId: nonEmptyString,
  executionId: nonEmptyString.optional(),
  spanId: nonEmptyString.optional(),
  agentId: nonEmptyString.optional(),
  contentRef: nonEmptyString.optional(),
  summary: nonEmptyString.optional(),
  derivedFromArtifactIds: z.array(nonEmptyString).optional(),
  metadata: metadataSchema.optional(),
});

export const metricSampleSchema: z.ZodType<MetricSample> = z.object({
  sampleId: nonEmptyString,
  metric: nonEmptyString,
  unit: nonEmptyString,
  value: z.number(),
  ts: isoDatetime,
  scopeType: nonEmptyString,
  scopeId: nonEmptyString,
  dimensions: metricDimensionsSchema.optional(),
});

export const interventionRecordSchema: z.ZodType<InterventionRecord> = z.object({
  interventionId: nonEmptyString,
  targetScopeType: nonEmptyString,
  targetScopeId: nonEmptyString,
  actor: nonEmptyString,
  action: nonEmptyString,
  reason: nonEmptyString,
  requestedAt: isoDatetime,
  appliedAt: isoDatetime.optional(),
  outcome: nonEmptyString.optional(),
  status: nonEmptyString.optional(),
  relatedTraceId: nonEmptyString.optional(),
  relatedSpanId: nonEmptyString.optional(),
  configPatch: metadataSchema.optional(),
  metadata: metadataSchema.optional(),
});

export const metricDeltaSchema: z.ZodType<MetricDelta> = z.object({
  metric: nonEmptyString,
  unit: nonEmptyString.optional(),
  baselineValue: z.number().optional(),
  candidateValue: z.number().optional(),
  delta: z.number().optional(),
});

export const evaluationRecordSchema: z.ZodType<EvaluationRecord> = z.object({
  evaluationId: nonEmptyString,
  targetScopeType: nonEmptyString,
  targetScopeId: nonEmptyString,
  baselineRefs: z.array(nonEmptyString),
  candidateRefs: z.array(nonEmptyString),
  metricDeltas: z.array(metricDeltaSchema).optional(),
  configPatch: metadataSchema.optional(),
  verdict: nonEmptyString,
  createdAt: isoDatetime,
  summary: nonEmptyString.optional(),
  metadata: metadataSchema.optional(),
});

export const releaseDecisionSchema: z.ZodType<ReleaseDecision> = z.object({
  releaseId: nonEmptyString,
  systemId: nonEmptyString,
  candidateRef: nonEmptyString,
  baselineRef: nonEmptyString.optional(),
  decision: nonEmptyString,
  evidenceRefs: z.array(nonEmptyString).optional(),
  rollbackPlan: nonEmptyString.optional(),
  requestedAt: isoDatetime,
  appliedAt: isoDatetime.optional(),
  status: nonEmptyString.optional(),
  summary: nonEmptyString.optional(),
  metadata: metadataSchema.optional(),
});
