import {
  createAgentStudioIngestClient,
  createLangGraphClient,
  readLangGraphDeploymentSnapshot,
} from './client.js';
import {
  mapOperationalContextFromLangGraph,
  mapReplayFromLangGraph,
  mapRunFromLangGraph,
  mapWorkflowFromLangGraph,
} from './mappers.js';
import type { LangGraphSyncResult, SyncLangGraphDeploymentOptions } from './types.js';

export async function syncLangGraphDeployment(options: SyncLangGraphDeploymentOptions): Promise<LangGraphSyncResult> {
  const langGraphClient = options.langGraphClient ?? createLangGraphClient(options.deployment);
  const agentStudioClient = options.agentStudioClient ?? createAgentStudioIngestClient(options.agentStudio);
  const snapshot = await readLangGraphDeploymentSnapshot(langGraphClient, options.deployment);

  const workflow = mapWorkflowFromLangGraph(snapshot, options.workspace, options.workflow);
  const run = mapRunFromLangGraph(snapshot, workflow);
  const operationalContext = mapOperationalContextFromLangGraph(
    snapshot,
    workflow,
    run.runId,
    resolveNow(options.now),
  );
  const replay = mapReplayFromLangGraph(snapshot, workflow, run, operationalContext);

  await agentStudioClient.ingestWorkflow(workflow);
  await agentStudioClient.ingestRun(run);
  await agentStudioClient.ingestOperationalContext(operationalContext);
  await agentStudioClient.ingestReplay(replay);

  return {
    workflow,
    run,
    operationalContext,
    replay,
    source: snapshot,
    limitations: [
      'Workflow is synthesized from a deployed graph plus assistant configuration, because LangGraph does not expose a first-class workflow object.',
      'Replay is synthesized from thread history and checkpoint state, because LangGraph does not expose a first-class replay object.',
      ...snapshot.warnings,
    ],
  };
}

function resolveNow(now?: () => string): string {
  return now ? now() : new Date().toISOString();
}
