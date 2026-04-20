import { loadDemoState } from './demo';

describe('demo API client', () => {
  it('loads the demo state from the API instead of local seeded imports', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          runtimeOptions: [{ id: 'demo', label: 'Seeded demo runtime', detail: 'Read-only public walkthrough.' }],
          defaultWorkflowId: 'workflow_demo',
          workflows: [{ workflowId: 'workflow_demo', name: 'Demo workflow', workspaceId: 'workspace_demo', status: 'active', steps: [] }],
          workflowStates: {
            workflow_demo: {
              workflow: { workflowId: 'workflow_demo', name: 'Demo workflow', workspaceId: 'workspace_demo', status: 'active', steps: [] },
              runsByNewest: [],
              live: { run: { runId: 'run_live', workflowId: 'workflow_demo', status: 'succeeded', startedAt: '2026-04-20T13:00:00.000Z' }, replay: { workflow: { workflowId: 'workflow_demo', name: 'Demo workflow', workspaceId: 'workspace_demo', status: 'active', steps: [] }, run: { runId: 'run_live', workflowId: 'workflow_demo', status: 'succeeded', startedAt: '2026-04-20T13:00:00.000Z' }, stepExecutions: [] } },
              replay: {
                run: { runId: 'run_replay', workflowId: 'workflow_demo', status: 'failed', startedAt: '2026-04-20T12:00:00.000Z' },
                replay: { workflow: { workflowId: 'workflow_demo', name: 'Demo workflow', workspaceId: 'workspace_demo', status: 'active', steps: [] }, run: { runId: 'run_replay', workflowId: 'workflow_demo', status: 'failed', startedAt: '2026-04-20T12:00:00.000Z' }, stepExecutions: [] },
                baselineRun: { runId: 'run_base', workflowId: 'workflow_demo', status: 'succeeded', startedAt: '2026-04-19T12:00:00.000Z' },
              },
              optimize: {
                baselineRun: { runId: 'run_base', workflowId: 'workflow_demo', status: 'succeeded', startedAt: '2026-04-19T12:00:00.000Z' },
                candidateRun: { runId: 'run_candidate', workflowId: 'workflow_demo', status: 'succeeded', startedAt: '2026-04-20T13:00:00.000Z' },
                candidateReplay: { workflow: { workflowId: 'workflow_demo', name: 'Demo workflow', workspaceId: 'workspace_demo', status: 'active', steps: [] }, run: { runId: 'run_candidate', workflowId: 'workflow_demo', status: 'succeeded', startedAt: '2026-04-20T13:00:00.000Z' }, stepExecutions: [] },
                candidatePlan: null,
                promotionHistory: [],
                promotionSummary: 'Ready to promote.',
              },
            },
          },
        }),
      ),
    );

    const state = await loadDemoState({ fetch: fetchMock, apiBaseUrl: 'http://agent-studio.test' });

    expect(fetchMock).toHaveBeenCalledWith('http://agent-studio.test/api/demo/state', expect.any(Object));
    expect(state.defaultWorkflowId).toBe('workflow_demo');
    expect(state.workflowStates.workflow_demo.workflow.name).toBe('Demo workflow');
  });
});
