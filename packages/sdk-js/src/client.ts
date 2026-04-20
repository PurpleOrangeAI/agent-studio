import {
  operationalContextSchema,
  replaySchema,
  runSchema,
  workflowSchema,
  type OperationalContext,
  type Replay,
  type Run,
  type Workflow,
} from '@agent-studio/contracts';
import {
  ensureIngestOperationalContextPayload,
  ensureIngestReplayPayload,
  type IngestOperationalContextPayload,
  type IngestReplayPayload,
} from './events.js';

export interface AgentStudioClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
  headers?: HeadersInit;
}

export interface IngestWorkflowResult {
  workflow: Workflow;
}

export interface IngestRunResult {
  run: Run;
}

export interface IngestReplayResult {
  replay: IngestReplayPayload;
}

export interface IngestOperationalContextResult {
  operationalContext: IngestOperationalContextPayload;
}

export class AgentStudioClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly headers?: HeadersInit;

  constructor(options: AgentStudioClientOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.fetchImpl = resolveFetch(options.fetch);
    this.headers = options.headers;
  }

  ingestWorkflow(workflow: Workflow): Promise<IngestWorkflowResult> {
    return this.post('/api/ingest/workflows', workflow, parseIngestWorkflowResult);
  }

  ingestRun(run: Run): Promise<IngestRunResult> {
    return this.post('/api/ingest/runs', run, parseIngestRunResult);
  }

  ingestReplay(replay: IngestReplayPayload): Promise<IngestReplayResult> {
    return this.post('/api/ingest/replays', ensureIngestReplayPayload(replay), parseIngestReplayResult);
  }

  ingestOperationalContext(
    operationalContext: IngestOperationalContextPayload,
  ): Promise<IngestOperationalContextResult> {
    return this.post(
      '/api/ingest/operational-contexts',
      ensureIngestOperationalContextPayload(operationalContext),
      parseIngestOperationalContextResult,
    );
  }

  private async post<TPayload, TResponse>(
    pathname: string,
    payload: TPayload,
    parseResponse: (value: unknown) => TResponse,
  ): Promise<TResponse> {
    const response = await this.fetchImpl(new URL(pathname, this.baseUrl).toString(), {
      method: 'POST',
      headers: createHeaders(this.headers),
      body: JSON.stringify(payload),
    });

    const body = await readResponseBody(response);

    if (!response.ok) {
      throw new Error(buildRequestError(pathname, response.status, body));
    }

    return parseResponse(body);
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

function resolveFetch(fetchImpl?: typeof fetch): typeof fetch {
  if (fetchImpl) {
    return fetchImpl;
  }

  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch.bind(globalThis);
  }

  throw new Error('AgentStudioClient requires fetch. Pass one explicitly or use a runtime with global fetch.');
}

function createHeaders(headers?: HeadersInit): Record<string, string> {
  const mergedHeaders = new Headers(headers);
  mergedHeaders.set('accept', 'application/json');
  mergedHeaders.set('content-type', 'application/json');

  return Object.fromEntries(mergedHeaders.entries());
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text.length > 0 ? text : undefined;
}

function buildRequestError(pathname: string, status: number, body: unknown): string {
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
    return `Agent Studio ingest failed for ${pathname}: ${body.error} (${status})`;
  }

  if (typeof body === 'string' && body.length > 0) {
    return `Agent Studio ingest failed for ${pathname}: ${body} (${status})`;
  }

  return `Agent Studio ingest failed for ${pathname} with status ${status}.`;
}

function parseIngestWorkflowResult(value: unknown): IngestWorkflowResult {
  return {
    workflow: workflowSchema.parse(readNamedPayload(value, 'workflow')),
  };
}

function parseIngestRunResult(value: unknown): IngestRunResult {
  return {
    run: runSchema.parse(readNamedPayload(value, 'run')),
  };
}

function parseIngestReplayResult(value: unknown): IngestReplayResult {
  return {
    replay: ensureIngestReplayPayload(replaySchema.parse(readNamedPayload(value, 'replay'))),
  };
}

function parseIngestOperationalContextResult(value: unknown): IngestOperationalContextResult {
  return {
    operationalContext: ensureIngestOperationalContextPayload(
      operationalContextSchema.parse(readNamedPayload(value, 'operationalContext')),
    ),
  };
}

function readNamedPayload(value: unknown, key: string): unknown {
  if (!value || typeof value !== 'object' || !(key in value)) {
    throw new Error(`Agent Studio ingest response is missing "${key}".`);
  }

  return (value as Record<string, unknown>)[key];
}
