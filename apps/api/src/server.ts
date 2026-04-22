import { createServer } from 'node:http';

import { handleControlIngestRoutes, handleControlReadRoutes } from './routes/control.js';
import { handleDemoRoutes } from './routes/demo.js';
import { handleIngestRoutes } from './routes/ingest.js';
import { handleReplayRoutes } from './routes/replay.js';
import { handleRunRoutes } from './routes/runs.js';
import { handleWorkflowRoutes } from './routes/workflows.js';
import { errorResponse, jsonResponse, toRequest, writeResponse } from './http.js';
import { createConfiguredStore, getApiStorageInfo, type ApiStorageInfo } from './persistence.js';
import { ApiStore } from './store.js';

export interface ApiApp {
  readonly store: ApiStore;
  readonly storage: ApiStorageInfo;
  handle(request: Request): Promise<Response>;
}

interface CreateApiAppOptions {
  store?: ApiStore;
  storage?: ApiStorageInfo;
}

export async function createDefaultApiApp(env: NodeJS.ProcessEnv = process.env) {
  const { store, storage } = await createConfiguredStore(env);

  return createApiApp({
    store,
    storage,
  });
}

export function createApiApp(options: CreateApiAppOptions = {}): ApiApp {
  const store = options.store ?? new ApiStore();
  const storage = options.storage ?? getApiStorageInfo();

  return {
    store,
    storage,
    async handle(request: Request): Promise<Response> {
      const url = new URL(request.url);

      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET,POST,OPTIONS',
            'access-control-allow-headers': 'content-type',
          },
        });
      }

      if (url.pathname === '/health') {
        return jsonResponse({ ok: true });
      }

      if (request.method === 'GET' && url.pathname === '/api/control/meta') {
        return jsonResponse({
          item: storage,
        });
      }

      if (request.method === 'GET') {
        const demoResponse = handleDemoRoutes(url.pathname, store);
        if (demoResponse) {
          return demoResponse;
        }

        const workflowResponse = handleWorkflowRoutes(url.pathname, store);
        if (workflowResponse) {
          return workflowResponse;
        }

        const replayResponse = handleReplayRoutes(url.pathname, store);
        if (replayResponse) {
          return replayResponse;
        }

        const runResponse = handleRunRoutes(url.pathname, store);
        if (runResponse) {
          return runResponse;
        }

        const controlResponse = handleControlReadRoutes(url.pathname, store);
        if (controlResponse) {
          return controlResponse;
        }
      }

      const ingestResponse = await handleIngestRoutes(request, url.pathname, store);
      if (ingestResponse) {
        return ingestResponse;
      }

      const controlIngestResponse = await handleControlIngestRoutes(request, url.pathname, store);
      if (controlIngestResponse) {
        return controlIngestResponse;
      }

      return errorResponse(404, `No route matched ${request.method} ${url.pathname}.`);
    },
  };
}

export async function startApiServer(port = Number(process.env.PORT ?? 4000)) {
  const app = await createDefaultApiApp();
  const server = createServer(async (request, response) => {
    const result = await app.handle(toRequest(request));
    result.headers.set('access-control-allow-origin', '*');
    await writeResponse(result, response);
  });

  server.listen(port);

  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 4000);
  startApiServer(port).then((server) => {
    server.on('listening', () => {
      process.stdout.write(`Agent Studio API listening on http://localhost:${port}\n`);
    });
  });
}
