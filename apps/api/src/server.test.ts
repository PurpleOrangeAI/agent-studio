import { seededOperationalContexts, seededReplays, seededWorkflow } from '@agent-studio/demo';

import { createApiApp } from './server';

describe('Agent Studio API', () => {
  it('serves seeded demo state through API routes', async () => {
    const app = createApiApp();

    const workflowsResponse = await app.handle(new Request('http://agent-studio.test/api/workflows'));
    expect(workflowsResponse.status).toBe(200);
    await expect(workflowsResponse.json()).resolves.toEqual(
      expect.objectContaining({
        workflows: [
          expect.objectContaining({
            workflowId: seededWorkflow.workflowId,
            name: seededWorkflow.name,
          }),
        ],
      }),
    );

    const demoResponse = await app.handle(new Request('http://agent-studio.test/api/demo/state'));
    expect(demoResponse.status).toBe(200);
    await expect(demoResponse.json()).resolves.toEqual(
      expect.objectContaining({
        defaultWorkflowId: seededWorkflow.workflowId,
        workflows: [
          expect.objectContaining({
            workflowId: seededWorkflow.workflowId,
          }),
        ],
        workflowStates: expect.objectContaining({
          [seededWorkflow.workflowId]: expect.objectContaining({
            workflow: expect.objectContaining({
              workflowId: seededWorkflow.workflowId,
            }),
          }),
        }),
      }),
    );
  });

  it('accepts valid ingest payloads and exposes them through the read routes', async () => {
    const app = createApiApp();

    const ingestResponse = await app.handle(
      new Request('http://agent-studio.test/api/ingest/runs', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          runId: 'run_ops_2026_04_20_0800',
          workflowId: seededWorkflow.workflowId,
          status: 'succeeded',
          startedAt: '2026-04-20T13:00:00.000Z',
          finishedAt: '2026-04-20T13:11:00.000Z',
          actualCredits: 22,
          durationMs: 660000,
        }),
      }),
    );

    expect(ingestResponse.status).toBe(201);

    const runsResponse = await app.handle(
      new Request(`http://agent-studio.test/api/workflows/${seededWorkflow.workflowId}/runs`),
    );
    expect(runsResponse.status).toBe(200);

    await expect(runsResponse.json()).resolves.toEqual(
      expect.objectContaining({
        runs: expect.arrayContaining([
          expect.objectContaining({
            runId: 'run_ops_2026_04_20_0800',
            workflowId: seededWorkflow.workflowId,
          }),
        ]),
      }),
    );
  });

  it('serves the seeded control-plane registry and telemetry surfaces', async () => {
    const app = createApiApp();

    const systemsResponse = await app.handle(new Request('http://agent-studio.test/api/control/systems'));
    expect(systemsResponse.status).toBe(200);
    const systemsPayload = (await systemsResponse.json()) as {
      items: Array<{ systemId: string; name: string }>;
    };
    expect(systemsPayload.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: seededWorkflow.name,
        }),
      ]),
    );

    const systemId = systemsPayload.items[0]?.systemId;
    expect(systemId).toBeTruthy();

    const agentsResponse = await app.handle(new Request(`http://agent-studio.test/api/control/systems/${systemId}/agents`));
    expect(agentsResponse.status).toBe(200);
    await expect(agentsResponse.json()).resolves.toEqual(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            label: expect.any(String),
            runtimeId: expect.any(String),
          }),
        ]),
      }),
    );

    const topologyResponse = await app.handle(new Request(`http://agent-studio.test/api/control/systems/${systemId}/topology`));
    expect(topologyResponse.status).toBe(200);
    await expect(topologyResponse.json()).resolves.toEqual(
      expect.objectContaining({
        item: expect.objectContaining({
          systemId,
          nodes: expect.any(Array),
          edges: expect.any(Array),
        }),
      }),
    );

    const executionsResponse = await app.handle(new Request(`http://agent-studio.test/api/control/systems/${systemId}/executions`));
    expect(executionsResponse.status).toBe(200);
    const executionsPayload = (await executionsResponse.json()) as {
      items: Array<{ executionId: string; traceId: string }>;
    };
    expect(executionsPayload.items.length).toBeGreaterThan(0);

    const executionId = executionsPayload.items[0]?.executionId;
    expect(executionId).toBeTruthy();

    const spansResponse = await app.handle(new Request(`http://agent-studio.test/api/control/executions/${executionId}/spans`));
    expect(spansResponse.status).toBe(200);
    await expect(spansResponse.json()).resolves.toEqual(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            executionId,
            name: expect.any(String),
          }),
        ]),
      }),
    );
  });

  it('accepts batched control-plane ingest payloads and exposes them through registry routes', async () => {
    const app = createApiApp();
    const runtimeId = 'runtime_test_custom';
    const systemId = 'system_test_custom';
    const executionId = 'execution_test_custom';

    const runtimesResponse = await app.handle(
      new Request('http://agent-studio.test/api/control/ingest/runtimes', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify([
          {
            runtimeId,
            kind: 'custom',
            adapterId: 'custom-rest',
            label: 'Custom runtime',
          },
        ]),
      }),
    );

    expect(runtimesResponse.status).toBe(201);

    const systemsResponse = await app.handle(
      new Request('http://agent-studio.test/api/control/ingest/systems', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          systemId,
          workspaceId: seededWorkflow.workspaceId,
          name: 'Imported custom system',
          runtimeIds: [runtimeId],
        }),
      }),
    );

    expect(systemsResponse.status).toBe(201);

    const agentsResponse = await app.handle(
      new Request('http://agent-studio.test/api/control/ingest/agents', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          agentId: 'agent_test_custom',
          systemId,
          runtimeId,
          label: 'Custom analyst',
          kind: 'specialist',
        }),
      }),
    );

    expect(agentsResponse.status).toBe(201);

    const executionsResponse = await app.handle(
      new Request('http://agent-studio.test/api/control/ingest/executions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          executionId,
          systemId,
          runtimeId,
          traceId: 'trace_test_custom',
          status: 'running',
          startedAt: '2026-04-22T15:00:00.000Z',
        }),
      }),
    );

    expect(executionsResponse.status).toBe(201);

    const spansResponse = await app.handle(
      new Request('http://agent-studio.test/api/control/ingest/spans', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify([
          {
            spanId: 'span_test_custom_1',
            traceId: 'trace_test_custom',
            executionId,
            agentId: 'agent_test_custom',
            name: 'Collect custom evidence',
            kind: 'search',
            status: 'running',
            startedAt: '2026-04-22T15:00:05.000Z',
          },
        ]),
      }),
    );

    expect(spansResponse.status).toBe(201);

    const readSystemResponse = await app.handle(new Request(`http://agent-studio.test/api/control/systems/${systemId}`));
    expect(readSystemResponse.status).toBe(200);
    await expect(readSystemResponse.json()).resolves.toEqual(
      expect.objectContaining({
        item: expect.objectContaining({
          systemId,
          runtimeIds: [runtimeId],
        }),
      }),
    );

    const readExecutionResponse = await app.handle(
      new Request(`http://agent-studio.test/api/control/executions/${executionId}/spans`),
    );
    expect(readExecutionResponse.status).toBe(200);
    await expect(readExecutionResponse.json()).resolves.toEqual(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            spanId: 'span_test_custom_1',
            executionId,
          }),
        ]),
      }),
    );
  });

  it('rejects ingest payloads that do not match the shared contracts', async () => {
    const app = createApiApp();

    const response = await app.handle(
      new Request('http://agent-studio.test/api/ingest/runs', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          workflowId: seededWorkflow.workflowId,
          status: 'succeeded',
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            path: expect.any(String),
            message: expect.any(String),
          }),
        ]),
      }),
    );
  });

  it('keeps partial workflows available through read routes without breaking demo state', async () => {
    const app = createApiApp();
    const partialWorkflow = {
      ...structuredClone(seededWorkflow),
      workflowId: 'workflow_partial_ingest',
      name: 'Partially ingested workflow',
      description: 'Valid workflow metadata with no runs or replays yet.',
      steps: [],
    };

    const ingestResponse = await app.handle(
      new Request('http://agent-studio.test/api/ingest/workflows', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(partialWorkflow),
      }),
    );

    expect(ingestResponse.status).toBe(201);

    const workflowsResponse = await app.handle(new Request('http://agent-studio.test/api/workflows'));
    expect(workflowsResponse.status).toBe(200);
    await expect(workflowsResponse.json()).resolves.toEqual(
      expect.objectContaining({
        workflows: expect.arrayContaining([
          expect.objectContaining({
            workflowId: 'workflow_partial_ingest',
          }),
        ]),
      }),
    );

    const demoResponse = await app.handle(new Request('http://agent-studio.test/api/demo/state'));
    expect(demoResponse.status).toBe(200);
    await expect(demoResponse.json()).resolves.toEqual(
      expect.objectContaining({
        workflowStates: expect.not.objectContaining({
          workflow_partial_ingest: expect.anything(),
        }),
      }),
    );
  });

  it('rejects operational-context ingest without runId on both direct and replay endpoints', async () => {
    const app = createApiApp();
    const operationalContextWithoutRunId = {
      ...structuredClone(seededOperationalContexts[Object.keys(seededOperationalContexts)[0] as keyof typeof seededOperationalContexts]),
      runId: undefined,
    };

    const directResponse = await app.handle(
      new Request('http://agent-studio.test/api/ingest/operational-contexts', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(operationalContextWithoutRunId),
      }),
    );

    expect(directResponse.status).toBe(400);
    await expect(directResponse.json()).resolves.toEqual(
      expect.objectContaining({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            path: 'runId',
          }),
        ]),
      }),
    );

    const replayWithoutReachableContext = {
      ...structuredClone(seededReplays[0]),
      operationalContext: operationalContextWithoutRunId,
    };

    const replayResponse = await app.handle(
      new Request('http://agent-studio.test/api/ingest/replays', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(replayWithoutReachableContext),
      }),
    );

    expect(replayResponse.status).toBe(400);
    await expect(replayResponse.json()).resolves.toEqual(
      expect.objectContaining({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            path: 'operationalContext.runId',
          }),
        ]),
      }),
    );
  });
});
