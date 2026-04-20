import { seededWorkflow } from '@agent-studio/demo';

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
});
