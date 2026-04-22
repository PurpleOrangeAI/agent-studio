import { vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import type { ControlPlaneState } from './control-plane';
import type { DemoState } from './demo';
import { App } from './App';

const { loadDemoStateMock, loadControlPlaneStateMock } = vi.hoisted(() => ({
  loadDemoStateMock: vi.fn(),
  loadControlPlaneStateMock: vi.fn(),
}));

const demoStateFixture: DemoState = {
  runtimeOptions: [
    {
      id: 'demo',
      label: 'Seeded demo runtime',
      detail: 'Read-only public walkthrough with realistic workflow history.',
    },
  ],
  defaultWorkflowId: 'workflow_ops_brief',
  workflows: [
    {
      workspaceId: 'workspace_demo',
      workflowId: 'workflow_ops_brief',
      name: 'Weekly Operations Brief',
      description: 'Collect inbound signals, normalize evidence, synthesize a recommendation, review it, and publish the final brief.',
      status: 'active',
      steps: [],
    },
  ],
  workflowStates: {
    workflow_ops_brief: {
      workflow: {
        workspaceId: 'workspace_demo',
        workflowId: 'workflow_ops_brief',
        name: 'Weekly Operations Brief',
        description:
          'Collect inbound signals, normalize evidence, synthesize a recommendation, review it, and publish the final brief.',
        status: 'active',
        steps: [],
      },
      runsByNewest: [],
      live: {
        run: {
          runId: 'run_live',
          workflowId: 'workflow_ops_brief',
          status: 'succeeded',
          startedAt: '2026-04-20T13:00:00.000Z',
          actualCredits: 20,
          durationMs: 474000,
          experimentLabel: 'Guardrailed candidate',
        },
        replay: {
          workflow: {
            workspaceId: 'workspace_demo',
            workflowId: 'workflow_ops_brief',
            name: 'Weekly Operations Brief',
            status: 'active',
            steps: [],
          },
          run: {
            runId: 'run_live',
            workflowId: 'workflow_ops_brief',
            status: 'succeeded',
            startedAt: '2026-04-20T13:00:00.000Z',
            actualCredits: 20,
            durationMs: 474000,
            experimentLabel: 'Guardrailed candidate',
          },
          stepExecutions: [],
        },
      },
      replay: {
        run: {
          runId: 'run_replay',
          workflowId: 'workflow_ops_brief',
          status: 'failed',
          startedAt: '2026-04-19T13:00:00.000Z',
          actualCredits: 35,
          experimentLabel: 'Lean review failure',
        },
        replay: {
          workflow: {
            workspaceId: 'workspace_demo',
            workflowId: 'workflow_ops_brief',
            name: 'Weekly Operations Brief',
            status: 'active',
            steps: [],
          },
          run: {
            runId: 'run_replay',
            workflowId: 'workflow_ops_brief',
            status: 'failed',
            startedAt: '2026-04-19T13:00:00.000Z',
            actualCredits: 35,
            experimentLabel: 'Lean review failure',
          },
          stepExecutions: [
            {
              stepId: 'guardrail-review',
              kind: 'note',
              title: 'Review policy and citation coverage',
              assignedRole: 'reviewer',
              status: 'failed',
              error: 'Missing citation support for the lead recommendation.',
            },
          ],
        },
        baselineRun: {
          runId: 'run_base',
          workflowId: 'workflow_ops_brief',
          status: 'succeeded',
          startedAt: '2026-04-18T13:00:00.000Z',
          actualCredits: 32,
          experimentLabel: 'Baseline control',
        },
      },
      optimize: {
        baselineRun: {
          runId: 'run_base',
          workflowId: 'workflow_ops_brief',
          status: 'succeeded',
          startedAt: '2026-04-18T13:00:00.000Z',
          actualCredits: 32,
          experimentLabel: 'Baseline control',
        },
        candidateRun: {
          runId: 'run_live',
          workflowId: 'workflow_ops_brief',
          status: 'succeeded',
          startedAt: '2026-04-20T13:00:00.000Z',
          actualCredits: 20,
          experimentLabel: 'Guardrailed candidate',
        },
        candidateReplay: {
          workflow: {
            workspaceId: 'workspace_demo',
            workflowId: 'workflow_ops_brief',
            name: 'Weekly Operations Brief',
            status: 'active',
            steps: [],
          },
          run: {
            runId: 'run_live',
            workflowId: 'workflow_ops_brief',
            status: 'succeeded',
            startedAt: '2026-04-20T13:00:00.000Z',
            actualCredits: 20,
            experimentLabel: 'Guardrailed candidate',
          },
          stepExecutions: [],
          studioState: {
            savedPlans: [],
          },
        },
        candidatePlan: {
          id: 'plan_tighter_fanout',
          name: 'Tighter fan-out',
          createdAt: '2026-04-20T12:50:00.000Z',
          scenarioId: 'weekly_ops_brief',
          previewPresetId: 'optimized_brief',
          executionPolicy: {
            mode: 'custom',
            optimizationGoal: 'balanced',
            reviewPolicy: 'standard',
            maxElasticLanes: 1,
          },
        },
        promotionHistory: [
          {
            eventId: 'promotion_1',
            appliedAt: '2026-04-20T13:05:00.000Z',
            mode: 'graduation',
            summary: 'Promoted the tighter fan-out plan after it matched the baseline output with lower spend.',
          },
        ],
        promotionSummary: 'Promoted the tighter fan-out plan after it matched the baseline output with lower spend.',
      },
    },
  },
};

const controlPlaneFixture: ControlPlaneState = {
  storage: {
    mode: 'memory',
    persistenceEnabled: false,
    filePath: null,
    detail: 'Ephemeral in-memory demo store.',
  },
  runtimes: [
    {
      runtimeId: 'runtime_demo_seeded',
      kind: 'demo',
      adapterId: 'seeded-demo',
      label: 'Seeded demo runtime',
    },
  ],
  systems: [
    {
      system: {
        systemId: 'system_workflow_ops_brief',
        workspaceId: 'workspace_demo',
        name: 'Weekly Operations Brief',
        runtimeIds: ['runtime_demo_seeded'],
        metadata: {
          workflowId: 'workflow_ops_brief',
        },
      },
      agents: [],
      topology: null,
      executions: [],
      executionSpans: {},
      executionMetrics: {},
      interventions: [],
      evaluations: [],
      releases: [],
    },
  ],
  systemsByWorkflowId: {},
};

const importedSystemState: ControlPlaneState['systems'][number] = {
  system: {
    systemId: 'system_imported',
    workspaceId: 'workspace_imported',
    name: 'Imported support triage',
    description: 'A bring-your-own agent system imported through the control-plane ingest path.',
    runtimeIds: ['runtime_imported'],
    primaryRuntimeId: 'runtime_imported',
    status: 'active',
  },
  agents: [
    {
      agentId: 'agent_triage_manager',
      systemId: 'system_imported',
      runtimeId: 'runtime_imported',
      label: 'Triage manager',
      kind: 'coordinator',
      role: 'manager',
      status: 'active',
    },
    {
      agentId: 'agent_support_reviewer',
      systemId: 'system_imported',
      runtimeId: 'runtime_imported',
      label: 'Support reviewer',
      kind: 'specialist',
      role: 'reviewer',
      status: 'active',
    },
  ],
  topology: {
    snapshotId: 'topology_imported',
    systemId: 'system_imported',
    capturedAt: '2026-04-22T12:00:00.000Z',
    nodes: [
      {
        nodeId: 'node_manager',
        agentId: 'agent_triage_manager',
        runtimeId: 'runtime_imported',
        label: 'Triage manager',
        kind: 'coordinator',
        role: 'manager',
      },
      {
        nodeId: 'node_reviewer',
        agentId: 'agent_support_reviewer',
        runtimeId: 'runtime_imported',
        label: 'Support reviewer',
        kind: 'specialist',
        role: 'reviewer',
      },
    ],
    edges: [
      {
        edgeId: 'edge_manager_reviewer',
        sourceNodeId: 'node_manager',
        targetNodeId: 'node_reviewer',
        kind: 'handoff',
      },
    ],
  },
  executions: [
    {
      executionId: 'exec_imported_latest',
      systemId: 'system_imported',
      runtimeId: 'runtime_imported',
      traceId: 'trace_imported_latest',
      status: 'running',
      startedAt: '2026-04-22T12:05:00.000Z',
      finishedAt: '2026-04-22T12:11:00.000Z',
      runId: 'run_imported_latest',
      metadata: {
        experimentLabel: 'Imported live execution',
      },
    },
    {
      executionId: 'exec_imported_baseline',
      systemId: 'system_imported',
      runtimeId: 'runtime_imported',
      traceId: 'trace_imported_baseline',
      status: 'succeeded',
      startedAt: '2026-04-21T12:05:00.000Z',
      finishedAt: '2026-04-21T12:10:00.000Z',
      runId: 'run_imported_baseline',
      metadata: {
        experimentLabel: 'Imported baseline execution',
      },
    },
  ],
  executionSpans: {
    exec_imported_latest: [
      {
        spanId: 'span_imported_capture',
        traceId: 'trace_imported_latest',
        executionId: 'exec_imported_latest',
        nodeId: 'node_manager',
        agentId: 'agent_triage_manager',
        name: 'Collect incoming tickets',
        kind: 'capture',
        status: 'succeeded',
        startedAt: '2026-04-22T12:05:00.000Z',
        finishedAt: '2026-04-22T12:06:00.000Z',
        summary: 'Collected the current support queue.',
        usage: {
          credits: 4,
          durationMs: 60000,
        },
      },
      {
        spanId: 'span_imported_review',
        traceId: 'trace_imported_latest',
        executionId: 'exec_imported_latest',
        parentSpanId: 'span_imported_capture',
        nodeId: 'node_reviewer',
        agentId: 'agent_support_reviewer',
        name: 'Review escalation batch',
        kind: 'review',
        status: 'failed',
        startedAt: '2026-04-22T12:06:10.000Z',
        finishedAt: '2026-04-22T12:11:00.000Z',
        summary: 'Escalation review tripped the response policy.',
        usage: {
          credits: 8,
          durationMs: 290000,
        },
      },
    ],
    exec_imported_baseline: [
      {
        spanId: 'span_imported_baseline_capture',
        traceId: 'trace_imported_baseline',
        executionId: 'exec_imported_baseline',
        nodeId: 'node_manager',
        agentId: 'agent_triage_manager',
        name: 'Collect incoming tickets',
        kind: 'capture',
        status: 'succeeded',
        startedAt: '2026-04-21T12:05:00.000Z',
        finishedAt: '2026-04-21T12:06:00.000Z',
        summary: 'Collected the previous support queue cleanly.',
        usage: {
          credits: 3,
          durationMs: 60000,
        },
      },
    ],
  },
  executionMetrics: {
    exec_imported_latest: [
      {
        sampleId: 'metric_imported_latest_credits',
        metric: 'credits.actual',
        unit: 'credits',
        value: 12,
        ts: '2026-04-22T12:11:00.000Z',
        scopeType: 'execution',
        scopeId: 'exec_imported_latest',
      },
      {
        sampleId: 'metric_imported_latest_duration',
        metric: 'duration.ms',
        unit: 'ms',
        value: 360000,
        ts: '2026-04-22T12:11:00.000Z',
        scopeType: 'execution',
        scopeId: 'exec_imported_latest',
      },
    ],
    exec_imported_baseline: [
      {
        sampleId: 'metric_imported_baseline_credits',
        metric: 'credits.actual',
        unit: 'credits',
        value: 7,
        ts: '2026-04-21T12:10:00.000Z',
        scopeType: 'execution',
        scopeId: 'exec_imported_baseline',
      },
      {
        sampleId: 'metric_imported_baseline_duration',
        metric: 'duration.ms',
        unit: 'ms',
        value: 300000,
        ts: '2026-04-21T12:10:00.000Z',
        scopeType: 'execution',
        scopeId: 'exec_imported_baseline',
      },
    ],
  },
  interventions: [
    {
      interventionId: 'intervention_imported_review',
      targetScopeType: 'agent',
      targetScopeId: 'agent_support_reviewer',
      actor: 'operator',
      action: 'directive.review',
      reason: 'Keep the imported reviewer under tighter scrutiny until the escalation path is stable.',
      requestedAt: '2026-04-22T12:12:00.000Z',
      appliedAt: '2026-04-22T12:12:00.000Z',
      status: 'applied',
      configPatch: {
        phases: ['note'],
      },
    },
  ],
  evaluations: [
    {
      evaluationId: 'evaluation_imported',
      targetScopeType: 'system',
      targetScopeId: 'system_imported',
      baselineRefs: ['run_imported_baseline'],
      candidateRefs: ['run_imported_latest'],
      verdict: 'hold',
      createdAt: '2026-04-22T12:13:00.000Z',
      summary: 'Hold the imported release until the escalation review path clears.',
      metricDeltas: [
        {
          metric: 'credits.actual',
          unit: 'credits',
          baselineValue: 7,
          candidateValue: 12,
          delta: 5,
        },
      ],
    },
  ],
  releases: [
    {
      releaseId: 'release_imported',
      systemId: 'system_imported',
      candidateRef: 'run_imported_latest',
      baselineRef: 'run_imported_baseline',
      decision: 'hold',
      requestedAt: '2026-04-22T12:14:00.000Z',
      appliedAt: '2026-04-22T12:14:00.000Z',
      status: 'applied',
      summary: 'Hold the imported release until the reviewer stops tripping the escalation policy.',
    },
  ],
};

vi.mock('./demo', () => ({
  loadDemoState: loadDemoStateMock,
}));

vi.mock('./control-plane', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./control-plane')>();

  return {
    ...actual,
    loadControlPlaneState: loadControlPlaneStateMock,
  };
});

describe('App shell', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
    loadDemoStateMock.mockResolvedValue(demoStateFixture);
    loadControlPlaneStateMock.mockResolvedValue({
      ...controlPlaneFixture,
      systemsByWorkflowId: {
        workflow_ops_brief: controlPlaneFixture.systems[0],
      },
    });
  });

  it('renders the seeded demo control loop', async () => {
    render(<App />);

    expect(await screen.findByLabelText(/^runtime$/i)).toHaveValue('runtime_demo_seeded');
    expect(screen.getByLabelText(/^system$/i)).toHaveDisplayValue(/weekly operations brief/i);
    expect(screen.getByRole('heading', { level: 1, name: /agent studio/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /registered systems/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /^live, replay, optimize$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /connect, operate, and improve a real agent system/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^live$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^replay$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^optimize$/i })).toBeInTheDocument();
    expect(screen.getAllByText(/live needs an agent roster before it becomes a real command surface/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('heading', { level: 3, name: /weekly operations brief/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/guardrailed candidate/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/promoted the tighter fan-out plan/i)).toBeInTheDocument();
  });

  it('renders a live room for an imported system without a seeded workflow mapping', async () => {
    window.history.pushState({}, '', '/systems/system_imported/live');
    loadControlPlaneStateMock.mockResolvedValue({
      ...controlPlaneFixture,
      runtimes: [
        ...controlPlaneFixture.runtimes,
        {
          runtimeId: 'runtime_imported',
          kind: 'custom',
          adapterId: 'custom-ingest',
          label: 'Imported runtime',
        },
      ],
      systems: [controlPlaneFixture.systems[0], importedSystemState],
      systemsByWorkflowId: {
        workflow_ops_brief: controlPlaneFixture.systems[0],
      },
    });

    render(<App />);

    expect(await screen.findByLabelText(/^system$/i)).toHaveValue('system_imported');
    expect(screen.getByRole('heading', { name: /working agents and command flow/i })).toBeInTheDocument();
    expect(screen.getByText(/this topology now reads the control-plane model directly/i)).toBeInTheDocument();
    expect(screen.queryByText(/no seeded room projection/i)).not.toBeInTheDocument();
  });

  it('renders fleet analytics and recent history for an imported system overview', async () => {
    window.history.pushState({}, '', '/systems/system_imported');
    loadControlPlaneStateMock.mockResolvedValue({
      ...controlPlaneFixture,
      runtimes: [
        ...controlPlaneFixture.runtimes,
        {
          runtimeId: 'runtime_imported',
          kind: 'custom',
          adapterId: 'custom-ingest',
          label: 'Imported runtime',
        },
      ],
      systems: [controlPlaneFixture.systems[0], importedSystemState],
      systemsByWorkflowId: {
        workflow_ops_brief: controlPlaneFixture.systems[0],
      },
      storage: {
        mode: 'blob',
        persistenceEnabled: true,
        filePath: null,
        blobPath: 'control-plane/store.json',
        detail: 'Persistent hosted Vercel Blob store for public imports, fleet history, and control-plane state.',
      },
    });

    render(<App />);

    expect(await screen.findByLabelText(/^runtime$/i)).toHaveValue('runtime_imported');
    expect(screen.getByRole('heading', { level: 2, name: /cross-system pressure and release watch/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/filter systems/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /time-windowed system view/i })).toBeInTheDocument();
    expect(screen.getByText(/fleet analytics/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /pressure, failures, and recent activity/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /what changed in this system/i })).toBeInTheDocument();
    expect(screen.getByText(/window posture/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /releases/i })).toBeInTheDocument();
    expect(screen.getByText(/history persistent/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^24h$/i }));
    expect(screen.getAllByText(/24h window/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/1 tracked execution/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^failures$/i }));
    expect(screen.getByText(/1 visible · 24h/i)).toBeInTheDocument();
  });
});
