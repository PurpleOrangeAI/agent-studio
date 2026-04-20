import { errorResponse, jsonResponse, matchRoute } from '../http.js';
import type { ApiStore } from '../store.js';

export function handleRunRoutes(pathname: string, store: ApiStore): Response | null {
  const runParams = matchRoute('/api/runs/:runId', pathname);
  if (runParams) {
    const run = store.getRun(runParams.runId);

    return run ? jsonResponse({ run }) : errorResponse(404, `Run ${runParams.runId} was not found.`);
  }

  const contextParams = matchRoute('/api/runs/:runId/operational-context', pathname);
  if (contextParams) {
    const operationalContext = store.getOperationalContext(contextParams.runId);

    return operationalContext
      ? jsonResponse({ operationalContext })
      : errorResponse(404, `Operational context for run ${contextParams.runId} was not found.`);
  }

  return null;
}

