import { describe, expect, it } from 'vitest';

import {
  filterSystemSummaries,
  filterAgentSummaries,
  filterSystemStateByWindow,
  loadControlPlaneState,
  summarizeFleet,
  summarizeAgents,
  summarizeSystemReadiness,
  summarizeSystem,
  type ControlPlaneSystemState,
} from './control-plane';

const fixture: ControlPlaneSystemState = {
  system: {
    systemId: 'system_fixture',
    workspaceId: 'workspace_fixture',
    name: 'Fixture system',
    runtimeIds: ['runtime_fixture'],
  },
  agents: [
    {
      agentId: 'agent_manager',
      systemId: 'system_fixture',
      runtimeId: 'runtime_fixture',
      label: 'Manager',
      kind: 'coordinator',
      role: 'manager',
      status: 'active',
    },
    {
      agentId: 'agent_reviewer',
      systemId: 'system_fixture',
      runtimeId: 'runtime_fixture',
      label: 'Reviewer',
      kind: 'specialist',
      role: 'reviewer',
      status: 'active',
    },
  ],
  topology: null,
  executions: [
    {
      executionId: 'exec_latest',
      systemId: 'system_fixture',
      runtimeId: 'runtime_fixture',
      traceId: 'trace_latest',
      status: 'failed',
      startedAt: '2026-04-22T12:00:00.000Z',
      finishedAt: '2026-04-22T12:10:00.000Z',
    },
    {
      executionId: 'exec_older',
      systemId: 'system_fixture',
      runtimeId: 'runtime_fixture',
      traceId: 'trace_older',
      status: 'succeeded',
      startedAt: '2026-04-21T11:00:00.000Z',
      finishedAt: '2026-04-21T11:05:00.000Z',
    },
  ],
  executionSpans: {
    exec_latest: [
      {
        spanId: 'span_latest_manager',
        traceId: 'trace_latest',
        executionId: 'exec_latest',
        agentId: 'agent_manager',
        name: 'Capture queue',
        kind: 'capture',
        status: 'succeeded',
        startedAt: '2026-04-22T12:00:00.000Z',
        finishedAt: '2026-04-22T12:02:00.000Z',
      },
      {
        spanId: 'span_latest_reviewer',
        traceId: 'trace_latest',
        executionId: 'exec_latest',
        agentId: 'agent_reviewer',
        name: 'Review escalation',
        kind: 'review',
        status: 'failed',
        startedAt: '2026-04-22T12:02:00.000Z',
        finishedAt: '2026-04-22T12:10:00.000Z',
      },
    ],
    exec_older: [
      {
        spanId: 'span_older_manager',
        traceId: 'trace_older',
        executionId: 'exec_older',
        agentId: 'agent_manager',
        name: 'Capture queue',
        kind: 'capture',
        status: 'succeeded',
        startedAt: '2026-04-21T11:00:00.000Z',
        finishedAt: '2026-04-21T11:02:00.000Z',
      },
    ],
  },
  executionMetrics: {
    exec_latest: [
      {
        sampleId: 'metric_latest_credits',
        metric: 'credits.actual',
        unit: 'credits',
        value: 11,
        ts: '2026-04-22T12:10:00.000Z',
        scopeType: 'execution',
        scopeId: 'exec_latest',
      },
    ],
    exec_older: [
      {
        sampleId: 'metric_older_credits',
        metric: 'credits.actual',
        unit: 'credits',
        value: 5,
        ts: '2026-04-21T11:05:00.000Z',
        scopeType: 'execution',
        scopeId: 'exec_older',
      },
    ],
  },
  interventions: [
    {
      interventionId: 'intervention_reviewer',
      targetScopeType: 'agent',
      targetScopeId: 'agent_reviewer',
      actor: 'operator',
      action: 'directive.review',
      reason: 'Keep reviewer on a tighter path.',
      requestedAt: '2026-04-22T12:12:00.000Z',
      appliedAt: '2026-04-22T12:12:00.000Z',
      status: 'applied',
    },
  ],
  evaluations: [
    {
      evaluationId: 'evaluation_latest',
      targetScopeType: 'system',
      targetScopeId: 'system_fixture',
      baselineRefs: ['exec_older'],
      candidateRefs: ['exec_latest'],
      verdict: 'hold',
      createdAt: '2026-04-22T12:13:00.000Z',
      summary: 'Hold until the reviewer stabilizes.',
    },
  ],
  releases: [
    {
      releaseId: 'release_latest',
      systemId: 'system_fixture',
      candidateRef: 'exec_latest',
      decision: 'hold',
      requestedAt: '2026-04-22T12:14:00.000Z',
      appliedAt: '2026-04-22T12:14:00.000Z',
      status: 'applied',
      summary: 'Release is still on hold.',
    },
  ],
};

describe('control-plane analytics helpers', () => {
  it('filters a system state to the selected time window', () => {
    const filtered = filterSystemStateByWindow(fixture, '24h');

    expect(filtered?.executions).toHaveLength(1);
    expect(filtered?.executions[0]?.executionId).toBe('exec_latest');
    expect(Object.keys(filtered?.executionSpans ?? {})).toEqual(['exec_latest']);
    expect(Object.keys(filtered?.executionMetrics ?? {})).toEqual(['exec_latest']);
    expect(filtered?.evaluations).toHaveLength(1);
    expect(filtered?.releases).toHaveLength(1);
  });

  it('filters agent summaries by attention focus', () => {
    const summaries = summarizeAgents(fixture);
    const attention = filterAgentSummaries(summaries, 'attention');
    const failures = filterAgentSummaries(summaries, 'failures');
    const directives = filterAgentSummaries(summaries, 'directives');

    expect(attention.map((summary) => summary.agent.agentId)).toEqual(['agent_reviewer']);
    expect(failures.map((summary) => summary.agent.agentId)).toEqual(['agent_reviewer']);
    expect(directives.map((summary) => summary.agent.agentId)).toEqual(['agent_reviewer']);
  });

  it('builds fleet summaries and attention filters for system comparison', () => {
    const olderSystem = filterSystemStateByWindow(fixture, '24h');
    const allSystems = [fixture, olderSystem ?? fixture];
    const fleet = summarizeFleet(allSystems);
    const healthyOnly = filterSystemSummaries(
      allSystems
        .map((systemState) => summarizeSystem(systemState))
        .filter((summary): summary is NonNullable<ReturnType<typeof summarizeSystem>> => summary != null),
      'healthy',
    );

    expect(fleet.systemCount).toBe(2);
    expect(fleet.releaseWatchlist.length).toBeGreaterThan(0);
    expect(fleet.hottestSystems[0]?.system.systemId).toBe('system_fixture');
    expect(healthyOnly).toHaveLength(0);
  });

  it('summarizes the next operator step and room readiness', () => {
    const readiness = summarizeSystemReadiness(fixture);
    const missingSystem = summarizeSystemReadiness(null);

    expect(readiness.stageId).toBe('model');
    expect(readiness.completedSteps).toBe(4);
    expect(readiness.title).toMatch(/add the system topology/i);
    expect(readiness.roomReadiness.find((room) => room.roomId === 'replay')?.state).toBe('ready');
    expect(readiness.roomReadiness.find((room) => room.roomId === 'live')?.label).toBe('Add topology');
    expect(readiness.roomReadiness.find((room) => room.roomId === 'optimize')?.label).toBe('Ready');

    expect(missingSystem.stageId).toBe('register');
    expect(missingSystem.roomReadiness.find((room) => room.roomId === 'connect')?.state).toBe('next');
    expect(missingSystem.title).toMatch(/register a runtime and system/i);
  });

  it('loads sparse imported systems without treating missing subresources as a failure', async () => {
    const fetchMock: typeof fetch = (async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      const pathname = new URL(url, 'https://agent-studio.test').pathname;

      if (pathname === '/api/control/meta') {
        return new Response(
          JSON.stringify({
            item: {
              mode: 'blob',
              persistenceEnabled: true,
              filePath: null,
              blobPath: 'control-plane/store.json',
              detail: 'Persistent test store.',
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      if (pathname === '/api/control/runtimes') {
        return new Response(
          JSON.stringify({
            items: [
              {
                runtimeId: 'runtime_imported',
                kind: 'custom',
                adapterId: 'custom-ingest',
                label: 'Imported runtime',
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      if (pathname === '/api/control/systems') {
        return new Response(
          JSON.stringify({
            items: [
              {
                systemId: 'system_imported',
                workspaceId: 'workspace_imported',
                name: 'Imported system',
                runtimeIds: ['runtime_imported'],
                primaryRuntimeId: 'runtime_imported',
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      if (
        pathname === '/api/control/systems/system_imported/agents' ||
        pathname === '/api/control/systems/system_imported/executions' ||
        pathname === '/api/control/systems/system_imported/interventions' ||
        pathname === '/api/control/systems/system_imported/evaluations' ||
        pathname === '/api/control/systems/system_imported/releases' ||
        pathname === '/api/control/systems/system_imported/topology'
      ) {
        return new Response(JSON.stringify({ message: 'Not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        });
      }

      throw new Error(`Unexpected request: ${pathname}`);
    }) as typeof fetch;

    const state = await loadControlPlaneState({
      apiBaseUrl: 'https://agent-studio.test',
      fetch: fetchMock,
    });

    expect(state.systems).toHaveLength(1);
    expect(state.systems[0]?.system.systemId).toBe('system_imported');
    expect(state.systems[0]?.agents).toEqual([]);
    expect(state.systems[0]?.topology).toBeNull();
    expect(state.systems[0]?.executions).toEqual([]);
    expect(state.systems[0]?.interventions).toEqual([]);
    expect(state.systems[0]?.evaluations).toEqual([]);
    expect(state.systems[0]?.releases).toEqual([]);
  });
});
