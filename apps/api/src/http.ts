import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ZodError } from 'zod';

export interface JsonResponseInit {
  status?: number;
  headers?: HeadersInit;
}

export function jsonResponse(body: unknown, init: JsonResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');

  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers,
  });
}

export function errorResponse(status: number, error: string, details?: unknown): Response {
  return jsonResponse({ error, details }, { status });
}

export function validationErrorResponse(error: ZodError): Response {
  return errorResponse(
    400,
    'Validation failed',
    error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  );
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new Error('Request body must be valid JSON.');
  }
}

export function matchRoute(pattern: string, pathname: string): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let index = 0; index < patternParts.length; index += 1) {
    const patternPart = patternParts[index];
    const pathPart = pathParts[index];

    if (patternPart.startsWith(':')) {
      params[patternPart.slice(1)] = decodeURIComponent(pathPart);
      continue;
    }

    if (patternPart !== pathPart) {
      return null;
    }
  }

  return params;
}

export function toRequest(request: IncomingMessage): Request {
  const origin = `http://${request.headers.host ?? '127.0.0.1'}`;
  const url = new URL(request.url ?? '/', origin);
  const method = request.method ?? 'GET';
  const body =
    method === 'GET' || method === 'HEAD'
      ? undefined
      : (Readable.toWeb(request) as ReadableStream<Uint8Array>);

  const init: RequestInit = {
    method,
    headers: request.headers as HeadersInit,
    body,
  };

  return body ? new Request(url, { ...init, duplex: 'half' } as RequestInit) : new Request(url, init);
}

export async function writeResponse(response: Response, serverResponse: ServerResponse): Promise<void> {
  serverResponse.statusCode = response.status;

  response.headers.forEach((value, key) => {
    serverResponse.setHeader(key, value);
  });

  if (!response.body) {
    serverResponse.end();
    return;
  }

  const reader = response.body.getReader();

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    serverResponse.write(value);
  }

  serverResponse.end();
}
