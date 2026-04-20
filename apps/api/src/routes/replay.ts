import { errorResponse, jsonResponse, matchRoute } from '../http.js';
import type { ApiStore } from '../store.js';

export function handleReplayRoutes(pathname: string, store: ApiStore): Response | null {
  const replayParams = matchRoute('/api/runs/:runId/replay', pathname);
  if (!replayParams) {
    return null;
  }

  const replay = store.getReplay(replayParams.runId);

  return replay ? jsonResponse({ replay }) : errorResponse(404, `Replay for run ${replayParams.runId} was not found.`);
}

