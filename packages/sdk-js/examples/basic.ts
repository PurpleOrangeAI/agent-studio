import { pathToFileURL } from 'node:url';

import {
  AgentStudioClient,
  ensureIngestOperationalContextPayload,
  ensureIngestReplayPayload,
  parseOperationalContext,
  parseReplay,
  parseRun,
  parseWorkflow,
} from '../src/index.js';

const workflow = parseWorkflow({
  workspaceId: 'workspace_ops',
  workspaceName: 'Ops Workspace',
  workflowId: 'workflow_daily_brief',
  name: 'Daily Brief',
  description: 'Search, analyze, and deliver a short daily brief.',
  status: 'active',
  schedule: '0 8 * * 1-5',
  createdAt: '2026-04-20T12:00:00.000Z',
  updatedAt: '2026-04-20T12:05:00.000Z',
  steps: [
    {
      stepId: 'search-news',
      kind: 'search',
      title: 'Search source material',
      objective: 'Find the most relevant fresh sources for the brief.',
      assignedRole: 'researcher',
      modelTier: 'micro',
      toolName: 'web.search',
    },
    {
      stepId: 'analyze-news',
      kind: 'analyze',
      title: 'Analyze changes',
      objective: 'Turn the findings into a concise point of view.',
      assignedRole: 'analyst',
      dependsOnStepIds: ['search-news'],
      modelTier: 'hard',
    },
    {
      stepId: 'deliver-brief',
      kind: 'deliver',
      title: 'Deliver brief',
      objective: 'Send a clean summary to the operator.',
      assignedRole: 'operator',
      dependsOnStepIds: ['analyze-news'],
      modelTier: 'default',
      toolName: 'email.send',
    },
  ],
  policy: {
    mode: 'recommended',
    optimizationGoal: 'balanced',
    reviewPolicy: 'standard',
    maxElasticLanes: 2,
  },
});

const run = parseRun({
  runId: 'run_daily_brief_2026_04_20',
  workflowId: workflow.workflowId,
  status: 'succeeded',
  startedAt: '2026-04-20T13:00:00.000Z',
  finishedAt: '2026-04-20T13:03:40.000Z',
  estimatedCredits: 14,
  actualCredits: 12,
  durationMs: 220000,
  scenarioId: 'daily_brief',
  scenarioLabel: 'Daily brief',
  previewPresetId: 'recommended',
  previewPresetLabel: 'Recommended',
});

const operationalContext = ensureIngestOperationalContextPayload(parseOperationalContext({
  workflowId: workflow.workflowId,
  runId: run.runId,
  generatedAt: '2026-04-20T13:03:45.000Z',
  similarRuns: [
    {
      runId: 'run_daily_brief_2026_04_19',
      label: 'Yesterday baseline',
      status: 'succeeded',
      startedAt: '2026-04-19T13:00:00.000Z',
      finishedAt: '2026-04-19T13:04:10.000Z',
      actualCredits: 13,
      durationMs: 250000,
      similarityScore: 0.92,
      matchedSignals: ['brief-format', 'same-tooling'],
    },
  ],
  recommendationEvidence: [
    {
      evidenceId: 'evidence_search_density',
      title: 'Search step ran lean',
      body: 'The search phase found enough signal in one pass with two tool calls.',
      sourceLabel: 'runtime telemetry',
      phase: 'search',
      relatedRunIds: [run.runId],
    },
  ],
}));

const replay = ensureIngestReplayPayload(parseReplay({
  workflow,
  run,
  stepExecutions: [
    {
      stepId: 'search-news',
      kind: 'search',
      title: 'Search source material',
      assignedRole: 'researcher',
      status: 'succeeded',
      startedAt: '2026-04-20T13:00:00.000Z',
      finishedAt: '2026-04-20T13:00:50.000Z',
      durationMs: 50000,
      modelTier: 'micro',
      modelSource: 'web',
      toolCalls: 2,
      actualCredits: 2,
      summary: 'Collected five fresh sources and ranked them by relevance.',
    },
    {
      stepId: 'analyze-news',
      kind: 'analyze',
      title: 'Analyze changes',
      assignedRole: 'analyst',
      status: 'succeeded',
      startedAt: '2026-04-20T13:00:55.000Z',
      finishedAt: '2026-04-20T13:02:40.000Z',
      durationMs: 105000,
      modelTier: 'hard',
      modelSource: 'gpt-5.4',
      toolCalls: 0,
      actualCredits: 8,
      summary: 'Turned the source set into three operator-ready takeaways.',
    },
    {
      stepId: 'deliver-brief',
      kind: 'deliver',
      title: 'Deliver brief',
      assignedRole: 'operator',
      status: 'succeeded',
      startedAt: '2026-04-20T13:02:45.000Z',
      finishedAt: '2026-04-20T13:03:40.000Z',
      durationMs: 55000,
      modelTier: 'default',
      modelSource: 'email',
      toolCalls: 1,
      actualCredits: 2,
      summary: 'Sent the brief with citations and a short recommendations block.',
    },
  ],
  policy: workflow.policy,
  operationalContext,
}));

export const basicExamplePayloads = {
  workflow,
  run,
  operationalContext,
  replay,
};

export async function sendBasicInstrumentation(
  baseUrl = process.env.AGENT_STUDIO_BASE_URL ?? 'http://localhost:4000',
): Promise<void> {
  const client = new AgentStudioClient({ baseUrl });

  await client.ingestWorkflow(workflow);
  await client.ingestRun(run);
  await client.ingestOperationalContext(operationalContext);
  await client.ingestReplay(replay);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  sendBasicInstrumentation().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
