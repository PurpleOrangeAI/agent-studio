import {
  agentDefinitionSchema,
  artifactRecordSchema,
  evaluationRecordSchema,
  executionRecordSchema,
  interventionRecordSchema,
  metricSampleSchema,
  releaseDecisionSchema,
  runtimeRegistrationSchema,
  spanRecordSchema,
  systemDefinitionSchema,
  topologySnapshotSchema,
} from '@agent-studio/contracts';
import { ZodError, z } from 'zod';

import { errorResponse, jsonResponse, matchRoute, readJsonBody, validationErrorResponse } from '../http.js';
import type { ApiStore } from '../store.js';

function batchSchema<T>(schema: z.ZodType<T>) {
  return z.union([schema, z.array(schema).min(1)]).transform((value) => (Array.isArray(value) ? value : [value]));
}

async function parseBatch<T>(request: Request, schema: z.ZodType<T>) {
  const payload = await readJsonBody(request);

  return batchSchema(schema).parse(payload);
}

export function handleControlReadRoutes(pathname: string, store: ApiStore): Response | null {
  if (pathname === '/api/control/runtimes') {
    return jsonResponse({ items: store.listRuntimes() });
  }

  const runtimeParams = matchRoute('/api/control/runtimes/:runtimeId', pathname);
  if (runtimeParams) {
    const runtime = store.getRuntime(runtimeParams.runtimeId);

    return runtime ? jsonResponse({ item: runtime }) : errorResponse(404, `Runtime ${runtimeParams.runtimeId} was not found.`);
  }

  if (pathname === '/api/control/systems') {
    return jsonResponse({ items: store.listSystems() });
  }

  const systemParams = matchRoute('/api/control/systems/:systemId', pathname);
  if (systemParams) {
    const system = store.getSystem(systemParams.systemId);

    return system ? jsonResponse({ item: system }) : errorResponse(404, `System ${systemParams.systemId} was not found.`);
  }

  const systemAgentsParams = matchRoute('/api/control/systems/:systemId/agents', pathname);
  if (systemAgentsParams) {
    const system = store.getSystem(systemAgentsParams.systemId);
    if (!system) {
      return errorResponse(404, `System ${systemAgentsParams.systemId} was not found.`);
    }

    return jsonResponse({
      system,
      items: store.listAgentsBySystem(system.systemId),
    });
  }

  const systemTopologyParams = matchRoute('/api/control/systems/:systemId/topology', pathname);
  if (systemTopologyParams) {
    const system = store.getSystem(systemTopologyParams.systemId);
    if (!system) {
      return errorResponse(404, `System ${systemTopologyParams.systemId} was not found.`);
    }

    const topology = store.getLatestTopologySnapshot(system.systemId);

    return topology
      ? jsonResponse({ system, item: topology })
      : errorResponse(404, `System ${system.systemId} does not have a topology snapshot.`);
  }

  const systemExecutionsParams = matchRoute('/api/control/systems/:systemId/executions', pathname);
  if (systemExecutionsParams) {
    const system = store.getSystem(systemExecutionsParams.systemId);
    if (!system) {
      return errorResponse(404, `System ${systemExecutionsParams.systemId} was not found.`);
    }

    return jsonResponse({
      system,
      items: store.listExecutionsBySystem(system.systemId),
    });
  }

  const systemInterventionsParams = matchRoute('/api/control/systems/:systemId/interventions', pathname);
  if (systemInterventionsParams) {
    const system = store.getSystem(systemInterventionsParams.systemId);
    if (!system) {
      return errorResponse(404, `System ${systemInterventionsParams.systemId} was not found.`);
    }

    return jsonResponse({
      system,
      items: store.listInterventionsBySystem(system.systemId),
    });
  }

  const systemEvaluationsParams = matchRoute('/api/control/systems/:systemId/evaluations', pathname);
  if (systemEvaluationsParams) {
    const system = store.getSystem(systemEvaluationsParams.systemId);
    if (!system) {
      return errorResponse(404, `System ${systemEvaluationsParams.systemId} was not found.`);
    }

    return jsonResponse({
      system,
      items: store.listEvaluationsBySystem(system.systemId),
    });
  }

  const systemReleasesParams = matchRoute('/api/control/systems/:systemId/releases', pathname);
  if (systemReleasesParams) {
    const system = store.getSystem(systemReleasesParams.systemId);
    if (!system) {
      return errorResponse(404, `System ${systemReleasesParams.systemId} was not found.`);
    }

    return jsonResponse({
      system,
      items: store.listReleaseDecisionsBySystem(system.systemId),
    });
  }

  const agentParams = matchRoute('/api/control/agents/:agentId', pathname);
  if (agentParams) {
    const agent = store.getAgent(agentParams.agentId);

    return agent ? jsonResponse({ item: agent }) : errorResponse(404, `Agent ${agentParams.agentId} was not found.`);
  }

  const executionParams = matchRoute('/api/control/executions/:executionId', pathname);
  if (executionParams) {
    const execution = store.getExecution(executionParams.executionId);

    return execution
      ? jsonResponse({ item: execution })
      : errorResponse(404, `Execution ${executionParams.executionId} was not found.`);
  }

  const executionSpansParams = matchRoute('/api/control/executions/:executionId/spans', pathname);
  if (executionSpansParams) {
    const execution = store.getExecution(executionSpansParams.executionId);
    if (!execution) {
      return errorResponse(404, `Execution ${executionSpansParams.executionId} was not found.`);
    }

    return jsonResponse({
      execution,
      items: store.listSpansByExecution(execution.executionId),
    });
  }

  const executionArtifactsParams = matchRoute('/api/control/executions/:executionId/artifacts', pathname);
  if (executionArtifactsParams) {
    const execution = store.getExecution(executionArtifactsParams.executionId);
    if (!execution) {
      return errorResponse(404, `Execution ${executionArtifactsParams.executionId} was not found.`);
    }

    return jsonResponse({
      execution,
      items: store.listArtifactsByExecution(execution.executionId),
    });
  }

  const executionMetricsParams = matchRoute('/api/control/executions/:executionId/metrics', pathname);
  if (executionMetricsParams) {
    const execution = store.getExecution(executionMetricsParams.executionId);
    if (!execution) {
      return errorResponse(404, `Execution ${executionMetricsParams.executionId} was not found.`);
    }

    return jsonResponse({
      execution,
      items: store.listMetricsByScope('execution', execution.executionId),
    });
  }

  return null;
}

export async function handleControlIngestRoutes(request: Request, pathname: string, store: ApiStore): Promise<Response | null> {
  if (request.method !== 'POST') {
    return null;
  }

  try {
    if (pathname === '/api/control/ingest/runtimes') {
      const items = await parseBatch(request, runtimeRegistrationSchema);

      return jsonResponse({ items: store.upsertRuntimes(items) }, { status: 201 });
    }

    if (pathname === '/api/control/ingest/systems') {
      const items = await parseBatch(request, systemDefinitionSchema);

      return jsonResponse({ items: store.upsertSystems(items) }, { status: 201 });
    }

    if (pathname === '/api/control/ingest/agents') {
      const items = await parseBatch(request, agentDefinitionSchema);

      return jsonResponse({ items: store.upsertAgents(items) }, { status: 201 });
    }

    if (pathname === '/api/control/ingest/topologies') {
      const items = await parseBatch(request, topologySnapshotSchema);

      return jsonResponse({ items: store.upsertTopologySnapshots(items) }, { status: 201 });
    }

    if (pathname === '/api/control/ingest/executions') {
      const items = await parseBatch(request, executionRecordSchema);

      return jsonResponse({ items: store.upsertExecutions(items) }, { status: 201 });
    }

    if (pathname === '/api/control/ingest/spans') {
      const items = await parseBatch(request, spanRecordSchema);

      return jsonResponse({ items: store.upsertSpans(items) }, { status: 201 });
    }

    if (pathname === '/api/control/ingest/artifacts') {
      const items = await parseBatch(request, artifactRecordSchema);

      return jsonResponse({ items: store.upsertArtifacts(items) }, { status: 201 });
    }

    if (pathname === '/api/control/ingest/metrics') {
      const items = await parseBatch(request, metricSampleSchema);

      return jsonResponse({ items: store.upsertMetrics(items) }, { status: 201 });
    }

    if (pathname === '/api/control/ingest/interventions') {
      const items = await parseBatch(request, interventionRecordSchema);

      return jsonResponse({ items: store.upsertInterventions(items) }, { status: 201 });
    }

    if (pathname === '/api/control/ingest/evaluations') {
      const items = await parseBatch(request, evaluationRecordSchema);

      return jsonResponse({ items: store.upsertEvaluations(items) }, { status: 201 });
    }

    if (pathname === '/api/control/ingest/releases') {
      const items = await parseBatch(request, releaseDecisionSchema);

      return jsonResponse({ items: store.upsertReleaseDecisions(items) }, { status: 201 });
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    if (error instanceof Error) {
      return errorResponse(400, error.message);
    }

    return errorResponse(400, 'Request could not be processed.');
  }

  return null;
}
