import { operationalContextSchema, replaySchema, runSchema, workflowSchema } from '@agent-studio/contracts';
import { createApiApp } from '../../../../../apps/api/src/server.ts';

import { syncLangGraphDeployment } from '../sync.js';

describe('syncLangGraphDeployment', () => {
  it('imports one LangGraph deployment into Agent Studio using mapped workflow, run, replay, and context payloads', async () => {
    const app = createApiApp();
    const langGraphClient = {
      assistants: {
        get: vi.fn().mockResolvedValue({
          assistant_id: 'asst_ops',
          graph_id: 'ops_graph',
          config: {
            configurable: {
              persona: 'ops',
              model: 'gpt-4.1-mini',
            },
            tags: ['ops', 'brief'],
          },
          context: {
            tenant: 'purple-orange',
          },
          created_at: '2026-04-20T14:00:00.000Z',
          updated_at: '2026-04-20T14:06:00.000Z',
          metadata: {
            schedule: '0 9 * * 1-5',
            description: 'Daily market brief deployment.',
          },
          version: 3,
          name: 'Daily Ops Brief',
          description: 'Search, analyze, and deliver the daily brief.',
        }),
        getGraph: vi.fn().mockResolvedValue({
          nodes: [
            { id: '__start__', name: '__start__' },
            { id: 'search_sources', name: 'search_sources' },
            { id: 'analyze_findings', name: 'analyze_findings' },
            { id: 'deliver_email', name: 'deliver_email' },
          ],
          edges: [
            { source: '__start__', target: 'search_sources' },
            { source: 'search_sources', target: 'analyze_findings' },
            { source: 'analyze_findings', target: 'deliver_email' },
          ],
        }),
        getSchemas: vi.fn().mockResolvedValue({
          graph_id: 'ops_graph',
          state_schema: {
            type: 'object',
          },
          config_schema: {
            type: 'object',
          },
        }),
      },
      threads: {
        get: vi.fn().mockResolvedValue({
          thread_id: 'thread_ops',
          created_at: '2026-04-20T14:00:00.000Z',
          updated_at: '2026-04-20T14:06:00.000Z',
          state_updated_at: '2026-04-20T14:06:00.000Z',
          metadata: {
            channel: 'email',
            audience: 'operators',
          },
          status: 'idle',
          values: {
            messages: [
              {
                type: 'human',
                content: 'Create the daily market brief.',
              },
              {
                type: 'ai',
                content: 'Daily market brief delivered.',
              },
            ],
            artifact: {
              subject: 'Daily brief',
            },
          },
          interrupts: {},
          config: {
            configurable: {
              thread_id: 'thread_ops',
            },
          },
        }),
        getState: vi.fn().mockResolvedValue({
          values: {
            messages: [
              {
                type: 'ai',
                content: 'Daily market brief delivered.',
              },
            ],
            artifact: {
              subject: 'Daily brief',
              citations: 4,
            },
          },
          next: [],
          checkpoint: {
            thread_id: 'thread_ops',
            checkpoint_id: 'chk_3',
            checkpoint_ns: 'root',
          },
          metadata: {
            step: 3,
            source: 'loop',
            writes: {
              deliver_email: {
                status: 'sent',
              },
            },
          },
          created_at: '2026-04-20T14:06:00.000Z',
          parent_checkpoint: {
            thread_id: 'thread_ops',
            checkpoint_id: 'chk_2',
            checkpoint_ns: 'root',
          },
          tasks: [],
        }),
        getHistory: vi.fn().mockResolvedValue([
          {
            values: {
              messages: [{ type: 'human', content: 'Create the daily market brief.' }],
            },
            next: ['search_sources'],
            checkpoint: {
              thread_id: 'thread_ops',
              checkpoint_id: 'chk_1',
              checkpoint_ns: 'root',
            },
            metadata: {
              step: 1,
              source: 'input',
              writes: {
                search_sources: {
                  documents: 5,
                },
              },
            },
            created_at: '2026-04-20T14:01:00.000Z',
            parent_checkpoint: undefined,
            tasks: [
              {
                id: 'task_search',
                name: 'search_sources',
                error: undefined,
                interrupts: [],
                checkpoint: undefined,
                state: undefined,
              },
            ],
          },
          {
            values: {
              research_summary: 'Five sources collected.',
            },
            next: ['analyze_findings'],
            checkpoint: {
              thread_id: 'thread_ops',
              checkpoint_id: 'chk_2',
              checkpoint_ns: 'root',
            },
            metadata: {
              step: 2,
              source: 'loop',
              writes: {
                analyze_findings: {
                  summary: 'Two durable changes identified.',
                },
              },
            },
            created_at: '2026-04-20T14:03:00.000Z',
            parent_checkpoint: {
              thread_id: 'thread_ops',
              checkpoint_id: 'chk_1',
              checkpoint_ns: 'root',
            },
            tasks: [
              {
                id: 'task_analyze',
                name: 'analyze_findings',
                error: undefined,
                interrupts: [],
                checkpoint: undefined,
                state: undefined,
              },
            ],
          },
          {
            values: {
              artifact: {
                subject: 'Daily brief',
                body: 'Delivered to operators.',
              },
            },
            next: [],
            checkpoint: {
              thread_id: 'thread_ops',
              checkpoint_id: 'chk_3',
              checkpoint_ns: 'root',
            },
            metadata: {
              step: 3,
              source: 'loop',
              writes: {
                deliver_email: {
                  delivered: true,
                },
              },
            },
            created_at: '2026-04-20T14:06:00.000Z',
            parent_checkpoint: {
              thread_id: 'thread_ops',
              checkpoint_id: 'chk_2',
              checkpoint_ns: 'root',
            },
            tasks: [
              {
                id: 'task_deliver',
                name: 'deliver_email',
                error: undefined,
                interrupts: [],
                checkpoint: undefined,
                state: undefined,
              },
            ],
          },
        ]),
      },
      runs: {
        get: vi.fn().mockResolvedValue({
          run_id: 'run_ops_1',
          thread_id: 'thread_ops',
          assistant_id: 'asst_ops',
          created_at: '2026-04-20T14:00:30.000Z',
          updated_at: '2026-04-20T14:06:00.000Z',
          status: 'success',
          metadata: {
            attempt: 1,
          },
          multitask_strategy: 'reject',
        }),
        list: vi.fn().mockResolvedValue([
          {
            run_id: 'run_ops_1',
            thread_id: 'thread_ops',
            assistant_id: 'asst_ops',
            created_at: '2026-04-20T14:00:30.000Z',
            updated_at: '2026-04-20T14:06:00.000Z',
            status: 'success',
            metadata: {
              attempt: 1,
            },
            multitask_strategy: 'reject',
          },
          {
            run_id: 'run_ops_prev',
            thread_id: 'thread_ops',
            assistant_id: 'asst_ops',
            created_at: '2026-04-19T14:00:30.000Z',
            updated_at: '2026-04-19T14:07:00.000Z',
            status: 'error',
            metadata: {
              attempt: 3,
            },
            multitask_strategy: 'reject',
          },
        ]),
      },
    };

    const result = await syncLangGraphDeployment({
      deployment: {
        apiUrl: 'https://langgraph.test',
        assistantId: 'asst_ops',
        threadId: 'thread_ops',
        runId: 'run_ops_1',
      },
      workspace: {
        workspaceId: 'workspace_langgraph',
        workspaceName: 'LangGraph Imports',
      },
      agentStudio: {
        apiUrl: 'https://agent-studio.test',
        fetch: (input, init) => app.handle(new Request(input, init)),
      },
      langGraphClient,
      now: () => '2026-04-20T14:10:00.000Z',
    });

    expect(() => workflowSchema.parse(result.workflow)).not.toThrow();
    expect(() => runSchema.parse(result.run)).not.toThrow();
    expect(() => operationalContextSchema.parse(result.operationalContext)).not.toThrow();
    expect(() => replaySchema.parse(result.replay)).not.toThrow();

    expect(result.workflow.workflowId).toBe('langgraph:ops_graph:asst_ops');
    expect(result.workflow.steps.map((step) => step.kind)).toEqual(['search', 'analyze', 'deliver']);
    expect(result.run.status).toBe('succeeded');
    expect(result.replay.stepExecutions).toHaveLength(3);
    expect(result.replay.stepExecutions.at(-1)).toEqual(
      expect.objectContaining({
        stepId: 'deliver_email',
        kind: 'deliver',
        status: 'succeeded',
      }),
    );
    expect(result.operationalContext.similarRuns).toEqual([
      expect.objectContaining({
        runId: 'run_ops_prev',
        status: 'failed',
      }),
    ]);

    const workflowResponse = await app.handle(
      new Request(`https://agent-studio.test/api/workflows/${result.workflow.workflowId}`),
    );
    expect(workflowResponse.status).toBe(200);
    await expect(workflowResponse.json()).resolves.toEqual(
      expect.objectContaining({
        workflow: expect.objectContaining({
          workflowId: result.workflow.workflowId,
          name: 'Daily Ops Brief',
        }),
      }),
    );

    const runsResponse = await app.handle(
      new Request(`https://agent-studio.test/api/workflows/${result.workflow.workflowId}/runs`),
    );
    expect(runsResponse.status).toBe(200);
    await expect(runsResponse.json()).resolves.toEqual(
      expect.objectContaining({
        runs: expect.arrayContaining([
          expect.objectContaining({
            runId: result.run.runId,
            status: 'succeeded',
          }),
        ]),
      }),
    );

    const replayResponse = await app.handle(
      new Request(`https://agent-studio.test/api/runs/${result.run.runId}/replay`),
    );
    expect(replayResponse.status).toBe(200);
    await expect(replayResponse.json()).resolves.toEqual(
      expect.objectContaining({
        replay: expect.objectContaining({
          run: expect.objectContaining({
            runId: result.run.runId,
          }),
        }),
      }),
    );
  });
});
