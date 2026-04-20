import { pathToFileURL } from 'node:url';

import { syncLangGraphDeployment } from '../src/index.js';

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export async function runBasicLangGraphImportExample(): Promise<void> {
  const result = await syncLangGraphDeployment({
    deployment: {
      apiUrl: readRequiredEnv('LANGGRAPH_API_URL'),
      apiKey: process.env.LANGGRAPH_API_KEY,
      assistantId: process.env.LANGGRAPH_ASSISTANT_ID,
      graphId: process.env.LANGGRAPH_GRAPH_ID,
      threadId: readRequiredEnv('LANGGRAPH_THREAD_ID'),
      runId: process.env.LANGGRAPH_RUN_ID,
      historyLimit: 25,
      runLimit: 10,
    },
    workspace: {
      workspaceId: 'workspace_langgraph_imports',
      workspaceName: 'LangGraph Imports',
    },
    workflow: {
      status: 'active',
    },
    agentStudio: {
      apiUrl: readRequiredEnv('AGENT_STUDIO_API_URL'),
      headers: process.env.AGENT_STUDIO_API_TOKEN
        ? {
            authorization: `Bearer ${process.env.AGENT_STUDIO_API_TOKEN}`,
          }
        : undefined,
    },
  });

  process.stdout.write(
    [
      `Imported workflow ${result.workflow.workflowId}`,
      `Run ${result.run.runId} mapped as ${result.run.status}`,
      `Replay steps: ${result.replay.stepExecutions.length}`,
      `Limitations: ${result.limitations.join(' | ')}`,
    ].join('\n') + '\n',
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runBasicLangGraphImportExample().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
