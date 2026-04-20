import { operationalContextSchema, replaySchema, runSchema, workflowSchema } from '@agent-studio/contracts';
import { ZodError } from 'zod';

import { errorResponse, jsonResponse, readJsonBody, validationErrorResponse } from '../http.js';
import type { ApiStore } from '../store.js';

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
      const payload = replaySchema.parse(await readJsonBody(request));

      return jsonResponse({ replay: store.upsertReplay(payload) }, { status: 201 });
    }

    if (pathname === '/api/ingest/operational-contexts') {
      const payload = operationalContextSchema.parse(await readJsonBody(request));

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

