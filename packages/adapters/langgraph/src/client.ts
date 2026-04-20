import { Client } from '@langchain/langgraph-sdk';
import { AgentStudioClient } from '@agent-studio/sdk-js';
import type { Assistant, AssistantGraph, GraphSchema, Run as LangGraphRun } from '@langchain/langgraph-sdk';

import type {
  AgentStudioIngestClientLike,
  AgentStudioTargetOptions,
  LangGraphClientLike,
  LangGraphDeploymentOptions,
  LangGraphDeploymentSnapshot,
} from './types.js';

export function createLangGraphClient(options: LangGraphDeploymentOptions): LangGraphClientLike {
  return new Client({
    apiUrl: options.apiUrl,
    apiKey: options.apiKey,
    defaultHeaders: options.headers,
  });
}

export function createAgentStudioIngestClient(options: AgentStudioTargetOptions): AgentStudioIngestClientLike {
  return new AgentStudioClient({
    baseUrl: options.apiUrl,
    fetch: options.fetch,
    headers: options.headers,
  });
}

export async function readLangGraphDeploymentSnapshot(
  client: LangGraphClientLike,
  options: LangGraphDeploymentOptions,
): Promise<LangGraphDeploymentSnapshot> {
  const assistant = await resolveAssistant(client, options);
  const warnings: string[] = [];

  const [assistantGraph, graphSchema, thread, currentState, history, runs] = await Promise.all([
    tryRead(
      () => client.assistants.getGraph(assistant.assistant_id, { xray: true }),
      `Assistant graph is unavailable for ${assistant.assistant_id}; importing workflow with synthesized steps only.`,
      warnings,
    ),
    tryRead(
      () => client.assistants.getSchemas(assistant.assistant_id),
      `Graph schema is unavailable for ${assistant.assistant_id}; config/state schema details were omitted.`,
      warnings,
    ),
    client.threads.get(options.threadId),
    client.threads.getState(options.threadId),
    client.threads.getHistory(options.threadId, {
      limit: options.historyLimit ?? 25,
    }),
    client.runs.list(options.threadId, {
      limit: options.runLimit ?? 10,
    }),
  ]);

  const sortedRuns = sortRunsNewestFirst(runs);
  const run = options.runId
    ? await client.runs.get(options.threadId, options.runId)
    : sortedRuns[0];

  if (!run) {
    throw new Error(`No LangGraph runs were found for thread ${options.threadId}.`);
  }

  return {
    assistant,
    assistantGraph,
    graphSchema,
    thread,
    currentState,
    history: sortStatesOldestFirst(history),
    run,
    runs: sortedRuns,
    warnings,
  };
}

async function resolveAssistant(
  client: LangGraphClientLike,
  options: LangGraphDeploymentOptions,
): Promise<Assistant> {
  if (options.assistantId) {
    return client.assistants.get(options.assistantId);
  }

  if (!options.graphId) {
    throw new Error('LangGraph sync requires either deployment.assistantId or deployment.graphId.');
  }

  const assistants = await client.assistants.search({
    graphId: options.graphId,
    limit: 1,
    offset: 0,
  });
  const assistant = assistants[0];

  if (!assistant) {
    throw new Error(`No LangGraph assistant was found for graph ${options.graphId}.`);
  }

  return assistant;
}

async function tryRead<T>(
  reader: () => Promise<T>,
  warning: string,
  warnings: string[],
): Promise<T | undefined> {
  try {
    return await reader();
  } catch (error) {
    if (!isOptionalReadError(error)) {
      throw error;
    }

    warnings.push(warning);
    return undefined;
  }
}

function isOptionalReadError(error: unknown): boolean {
  const status = readErrorStatus(error);
  if (status === 404) {
    return true;
  }

  const message = error instanceof Error ? error.message : '';
  return /not found/i.test(message);
}

function readErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  if ('status' in error && typeof error.status === 'number') {
    return error.status;
  }

  if (
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'status' in error.response &&
    typeof error.response.status === 'number'
  ) {
    return error.response.status;
  }

  return undefined;
}

function sortRunsNewestFirst(runs: LangGraphRun[]): LangGraphRun[] {
  return [...runs].sort((left, right) => asTimestamp(right.updated_at) - asTimestamp(left.updated_at));
}

function sortStatesOldestFirst<T extends { created_at?: string | null }>(states: readonly T[]): T[] {
  return [...states].sort((left, right) => asTimestamp(left.created_at) - asTimestamp(right.created_at));
}

function asTimestamp(value?: string | null): number {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export type { AssistantGraph, GraphSchema, LangGraphRun };
