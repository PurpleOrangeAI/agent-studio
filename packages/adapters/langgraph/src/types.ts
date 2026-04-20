import type { Workspace, Workflow, Run, Replay } from '@agent-studio/contracts';
import type {
  Assistant,
  AssistantGraph,
  GraphSchema,
  Run as LangGraphRun,
  Thread,
  ThreadState,
} from '@langchain/langgraph-sdk';
import type {
  AgentStudioClient,
  AgentStudioClientOptions,
  IngestOperationalContextPayload,
  IngestReplayPayload,
} from '@agent-studio/sdk-js';

export interface LangGraphDeploymentOptions {
  apiUrl: string;
  apiKey?: string | null;
  headers?: Record<string, string>;
  assistantId?: string;
  graphId?: string;
  threadId: string;
  runId?: string;
  historyLimit?: number;
  runLimit?: number;
}

export interface LangGraphWorkflowOverrides {
  workflowId?: string;
  name?: string;
  description?: string;
  status?: string;
}

export interface AgentStudioTargetOptions extends Pick<AgentStudioClientOptions, 'fetch' | 'headers'> {
  apiUrl: string;
}

export interface LangGraphAssistantsClientLike {
  get(assistantId: string, options?: { signal?: AbortSignal }): Promise<Assistant>;
  search(
    query?: {
      graphId?: string;
      limit?: number;
      offset?: number;
      signal?: AbortSignal;
    },
  ): Promise<Assistant[]>;
  getGraph(
    assistantId: string,
    options?: {
      xray?: boolean | number;
      signal?: AbortSignal;
    },
  ): Promise<AssistantGraph>;
  getSchemas(assistantId: string, options?: { signal?: AbortSignal }): Promise<GraphSchema>;
}

export interface LangGraphThreadsClientLike {
  get(threadId: string, options?: { signal?: AbortSignal; include?: string[] }): Promise<Thread>;
  getState(
    threadId: string,
    checkpoint?: string | Record<string, unknown>,
    options?: { subgraphs?: boolean; signal?: AbortSignal },
  ): Promise<ThreadState>;
  getHistory(
    threadId: string,
    options?: {
      limit?: number;
      signal?: AbortSignal;
    },
  ): Promise<ThreadState[]>;
}

export interface LangGraphRunsClientLike {
  get(threadId: string, runId: string, options?: { signal?: AbortSignal }): Promise<LangGraphRun>;
  list(
    threadId: string,
    options?: {
      limit?: number;
      offset?: number;
      signal?: AbortSignal;
    },
  ): Promise<LangGraphRun[]>;
}

export interface LangGraphClientLike {
  assistants: LangGraphAssistantsClientLike;
  threads: LangGraphThreadsClientLike;
  runs: LangGraphRunsClientLike;
}

export interface AgentStudioIngestClientLike
  extends Pick<
    AgentStudioClient,
    'ingestWorkflow' | 'ingestRun' | 'ingestOperationalContext' | 'ingestReplay'
  > {}

export interface LangGraphDeploymentSnapshot {
  assistant: Assistant;
  assistantGraph?: AssistantGraph;
  graphSchema?: GraphSchema;
  thread: Thread;
  currentState: ThreadState;
  history: ThreadState[];
  run: LangGraphRun;
  runs: LangGraphRun[];
  warnings: string[];
}

export interface SyncLangGraphDeploymentOptions {
  deployment: LangGraphDeploymentOptions;
  workspace: Workspace;
  workflow?: LangGraphWorkflowOverrides;
  agentStudio: AgentStudioTargetOptions;
  langGraphClient?: LangGraphClientLike;
  agentStudioClient?: AgentStudioIngestClientLike;
  now?: () => string;
}

export interface LangGraphSyncResult {
  workflow: Workflow;
  run: Run;
  operationalContext: IngestOperationalContextPayload;
  replay: IngestReplayPayload;
  source: LangGraphDeploymentSnapshot;
  limitations: string[];
}
