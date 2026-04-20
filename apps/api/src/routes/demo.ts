import { jsonResponse } from '../http.js';
import type { ApiStore } from '../store.js';

export function handleDemoRoutes(pathname: string, store: ApiStore): Response | null {
  if (pathname !== '/api/demo/state') {
    return null;
  }

  return jsonResponse(store.buildDemoState());
}

