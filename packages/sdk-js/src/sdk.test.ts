import { operationalContextSchema, replaySchema, runSchema, workflowSchema } from '@agent-studio/contracts';
import { vi } from 'vitest';

import { basicExamplePayloads } from '../examples/basic.js';
import { AgentStudioClient } from './client.js';
import {
  normalizeOperationalContext,
  normalizeReplay,
  normalizeRun,
  normalizeWorkflow,
} from './events.js';

describe('AgentStudioClient', () => {
  it('posts normalized ingest payloads to the current API endpoints', async () => {
    const jsonHeaders = {
      'content-type': 'application/json; charset=utf-8',
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ workflow: basicExamplePayloads.workflow }), { status: 201, headers: jsonHeaders }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ run: basicExamplePayloads.run }), { status: 201, headers: jsonHeaders }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ operationalContext: basicExamplePayloads.operationalContext }), {
          status: 201,
          headers: jsonHeaders,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ replay: basicExamplePayloads.replay }), {
          status: 201,
          headers: jsonHeaders,
        }),
      )

    const client = new AgentStudioClient({
      baseUrl: 'https://agent-studio.test/',
      fetch: fetchMock,
      headers: {
        authorization: 'Bearer test-token',
      },
    });

    await expect(client.ingestWorkflow(basicExamplePayloads.workflow)).resolves.toEqual({
      workflow: basicExamplePayloads.workflow,
    });
    await expect(client.ingestRun(basicExamplePayloads.run)).resolves.toEqual({ run: basicExamplePayloads.run });
    await expect(client.ingestOperationalContext(basicExamplePayloads.operationalContext)).resolves.toEqual({
      operationalContext: basicExamplePayloads.operationalContext,
    });
    await expect(client.ingestReplay(basicExamplePayloads.replay)).resolves.toEqual({
      replay: basicExamplePayloads.replay,
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://agent-studio.test/api/ingest/workflows',
      'https://agent-studio.test/api/ingest/runs',
      'https://agent-studio.test/api/ingest/operational-contexts',
      'https://agent-studio.test/api/ingest/replays',
    ]);

    for (const [, init] of fetchMock.mock.calls) {
      expect(init).toEqual(
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            accept: 'application/json',
            authorization: 'Bearer test-token',
            'content-type': 'application/json',
          }),
        }),
      );
    }

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual(normalizeWorkflow(basicExamplePayloads.workflow));
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual(normalizeRun(basicExamplePayloads.run));
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toEqual(
      normalizeOperationalContext(basicExamplePayloads.operationalContext),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body))).toEqual(normalizeReplay(basicExamplePayloads.replay));
  });

  it('rejects operational-context payloads that do not satisfy the current ingest contract', () => {
    const operationalContext = {
      ...basicExamplePayloads.operationalContext,
      runId: undefined,
    };

    expect(() => normalizeOperationalContext(operationalContext)).toThrow(/runId is required/i);
    expect(() =>
      normalizeReplay({
        ...basicExamplePayloads.replay,
        operationalContext,
      }),
    ).toThrow(/runId is required/i);
  });

  it('keeps the basic example payloads valid against the shared contract', () => {
    expect(() => workflowSchema.parse(basicExamplePayloads.workflow)).not.toThrow();
    expect(() => runSchema.parse(basicExamplePayloads.run)).not.toThrow();
    expect(() => operationalContextSchema.parse(basicExamplePayloads.operationalContext)).not.toThrow();
    expect(() => replaySchema.parse(basicExamplePayloads.replay)).not.toThrow();
  });
});
