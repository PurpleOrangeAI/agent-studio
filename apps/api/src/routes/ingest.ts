import { operationalContextSchema, replaySchema, runSchema, workflowSchema } from '@agent-studio/contracts';
import { ZodError, z } from 'zod';

import { errorResponse, jsonResponse, readJsonBody, validationErrorResponse } from '../http.js';
import type { ApiStore } from '../store.js';

const reachableOperationalContextSchema = operationalContextSchema.superRefine((operationalContext, context) => {
  if (!operationalContext.runId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['runId'],
      message: 'runId is required for this API surface.',
    });
  }
});

const ingestReplaySchema = replaySchema.superRefine((replay, context) => {
  if (replay.operationalContext && !replay.operationalContext.runId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['operationalContext', 'runId'],
      message: 'runId is required for this API surface.',
    });
  }
});

export async function handleIngestRoutes(request: Request, pathname: string, store: ApiStore): Promise<Response | null> {
  if (request.method !== 'POST') {
    return null;
  }

  try {
    if (pathname === '/api/ingest/workflows') {
      const payload = workflowSchema.parse(await readJsonBody(request));

      return jsonResponse({ workflow: store.upsertWorkflow(payload) }, { status: 201 });
    }

    if (pathname === '/api/ingest/runs') {
      const payload = runSchema.parse(await readJsonBody(request));

      return jsonResponse({ run: store.upsertRun(payload) }, { status: 201 });
    }

    if (pathname === '/api/ingest/replays') {
      const payload = ingestReplaySchema.parse(await readJsonBody(request));

      return jsonResponse({ replay: store.upsertReplay(payload) }, { status: 201 });
    }

    if (pathname === '/api/ingest/operational-contexts') {
      const payload = reachableOperationalContextSchema.parse(await readJsonBody(request));

      return jsonResponse({ operationalContext: store.upsertOperationalContext(payload) }, { status: 201 });
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
