import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Replay, Run } from '@agent-studio/contracts';
import type { ControlPlaneSystemState } from '../../app/control-plane';
import { ReplayAdvancedPanel } from './ReplayAdvancedPanel';
import { ReplayPanel } from './ReplayPanel';

const baselineRun: Run = {
  runId: 'run_base',
  workflowId: 'workflow_ops_brief',
  status: 'succeeded',
  startedAt: '2026-04-17T13:00:00.000Z',
  finishedAt: '2026-04-17T13:09:20.000Z',
  actualCredits: 32,
  durationMs: 560000,
  experimentLabel: 'Baseline control',
};

const replay: Replay = {
  workflow: {
    workspaceId: 'workspace_demo',
    workflowId: 'workflow_ops_brief',
    name: 'Weekly Operations Brief',
    status: 'active',
    steps: [
      {
        stepId: 'capture-intake',
        kind: 'capture',
        title: 'Capture intake',
        objective: 'Capture context',
        assignedRole: 'coordinator',
      },
      {
        stepId: 'collect-evidence',
        kind: 'search',
        title: 'Collect evidence',
        objective: 'Find evidence',
        assignedRole: 'researcher',
        dependsOnStepIds: ['capture-intake'],
      },
      {
        stepId: 'review-guardrail',
        kind: 'note',
        title: 'Review guardrail',
        objective: 'Check policy',
        assignedRole: 'reviewer',
        dependsOnStepIds: ['collect-evidence'],
      },
    ],
  },
  run: {
    runId: 'run_replay',
    workflowId: 'workflow_ops_brief',
    status: 'failed',
    startedAt: '2026-04-18T13:00:00.000Z',
    finishedAt: '2026-04-18T13:10:40.000Z',
    actualCredits: 35,
    durationMs: 640000,
    experimentLabel: 'Lean review failure',
  },
  stepExecutions: [
    {
      stepId: 'capture-intake',
      kind: 'capture',
      title: 'Capture intake',
      assignedRole: 'coordinator',
      status: 'succeeded',
      actualCredits: 4,
      summary: 'Captured the operating brief.',
    },
    {
      stepId: 'collect-evidence',
      kind: 'search',
      title: 'Collect evidence',
      assignedRole: 'researcher',
      status: 'succeeded',
      actualCredits: 12,
      summary: 'Evidence collection widened more than expected.',
    },
    {
      stepId: 'review-guardrail',
      kind: 'note',
      title: 'Review guardrail',
      assignedRole: 'reviewer',
      status: 'failed',
      actualCredits: 19,
      summary: 'The review gate failed on unsupported claims.',
    },
  ],
  operationalContext: {
    workflowId: 'workflow_ops_brief',
    generatedAt: '2026-04-18T13:11:00.000Z',
    similarRuns: [],
    lastHealthyComparison: {
      runId: 'run_base',
      label: 'Baseline control',
      startedAt: '2026-04-17T13:00:00.000Z',
      finishedAt: '2026-04-17T13:09:20.000Z',
      creditsDelta: 3,
      durationDelta: 80000,
      changedSignals: [
        'Lean review skipped a citation verification pass',
        'Source fan-out widened and produced duplicate notes',
      ],
      summary: 'The degraded replay traded away the review gate and paid for it with rework and a failed publish.',
    },
    recommendationEvidence: [
      {
        evidenceId: 'evidence_1',
        title: 'Guardrail failed last',
        body: 'The failure happened inside the review gate, not during evidence collection.',
        sourceLabel: 'Failed replay',
      },
    ],
  },
};

const controlPlaneFixture: ControlPlaneSystemState = {
  system: {
    systemId: 'system_workflow_ops_brief',
    workspaceId: 'workspace_demo',
    name: 'Weekly Operations Brief',
    runtimeIds: ['runtime_demo_seeded'],
    metadata: {
      workflowId: 'workflow_ops_brief',
    },
  },
  agents: [
    {
      agentId: 'agent_coord',
      systemId: 'system_workflow_ops_brief',
      label: 'Coordinator',
      kind: 'assistant',
      role: 'coordinator',
      runtimeId: 'runtime_demo_seeded',
      status: 'active',
    },
    {
      agentId: 'agent_research',
      systemId: 'system_workflow_ops_brief',
      label: 'Researcher',
      kind: 'assistant',
      role: 'researcher',
      runtimeId: 'runtime_demo_seeded',
      status: 'active',
    },
    {
      agentId: 'agent_review',
      systemId: 'system_workflow_ops_brief',
      label: 'Reviewer',
      kind: 'assistant',
      role: 'reviewer',
      runtimeId: 'runtime_demo_seeded',
      status: 'active',
    },
  ],
  topology: null,
  executions: [
    {
      executionId: 'exec_replay',
      traceId: 'trace_replay',
      systemId: 'system_workflow_ops_brief',
      runtimeId: 'runtime_demo_seeded',
      workflowId: 'workflow_ops_brief',
      runId: 'run_replay',
      status: 'failed',
      startedAt: '2026-04-18T13:00:00.000Z',
      finishedAt: '2026-04-18T13:10:40.000Z',
    },
  ],
  executionSpans: {
    exec_replay: [
      {
        spanId: 'span_capture',
        traceId: 'trace_replay',
        executionId: 'exec_replay',
        agentId: 'agent_coord',
        name: 'Capture intake',
        kind: 'capture',
        status: 'succeeded',
        startedAt: '2026-04-18T13:00:00.000Z',
        finishedAt: '2026-04-18T13:01:18.000Z',
        summary: 'Captured the operating brief.',
        usage: {
          credits: 4,
          durationMs: 78000,
        },
      },
      {
        spanId: 'span_collect',
        traceId: 'trace_replay',
        executionId: 'exec_replay',
        parentSpanId: 'span_capture',
        agentId: 'agent_research',
        name: 'Collect evidence',
        kind: 'search',
        status: 'succeeded',
        startedAt: '2026-04-18T13:01:20.000Z',
        finishedAt: '2026-04-18T13:04:40.000Z',
        summary: 'Evidence collection widened more than expected.',
        usage: {
          credits: 12,
          durationMs: 200000,
        },
      },
      {
        spanId: 'span_review',
        traceId: 'trace_replay',
        executionId: 'exec_replay',
        parentSpanId: 'span_collect',
        agentId: 'agent_review',
        name: 'Review guardrail',
        kind: 'note',
        status: 'failed',
        startedAt: '2026-04-18T13:04:42.000Z',
        finishedAt: '2026-04-18T13:10:40.000Z',
        summary: 'The review gate failed on unsupported claims.',
        usage: {
          credits: 19,
          durationMs: 358000,
        },
      },
    ],
  },
  executionMetrics: {
    exec_replay: [
      {
        sampleId: 'metric_credits',
        metric: 'credits.actual',
        unit: 'credits',
        value: 35,
        ts: '2026-04-18T13:10:40.000Z',
        scopeType: 'execution',
        scopeId: 'exec_replay',
      },
      {
        sampleId: 'metric_duration',
        metric: 'duration.ms',
        unit: 'ms',
        value: 640000,
        ts: '2026-04-18T13:10:40.000Z',
        scopeType: 'execution',
        scopeId: 'exec_replay',
      },
    ],
  },
  interventions: [],
  evaluations: [],
  releases: [],
};

describe('ReplayPanel', () => {
  it('renders the baseline compare and execution tree from control-plane spans', () => {
    const { container } = render(<ReplayPanel replay={replay} baselineRun={baselineRun} controlPlane={controlPlaneFixture} />);

    expect(screen.getByRole('heading', { name: 'Execution tree' })).toBeInTheDocument();
    expect(screen.getByText('Baseline control')).toBeInTheDocument();
    expect(screen.getByText('Spend +3 cr / Time +1m 20s')).toBeInTheDocument();
    expect(screen.getByText('1 root spans')).toBeInTheDocument();
    expect(screen.getByText('2 nested handoffs')).toBeInTheDocument();
    expect(container.querySelector('.replay-tree__children .replay-tree__children')).not.toBeNull();
    expect(screen.getAllByText('Nested handoff')).toHaveLength(2);
  });

  it('falls back to the legacy step replay when no execution trace is available', () => {
    render(<ReplayPanel replay={replay} baselineRun={baselineRun} controlPlane={null} />);

    expect(screen.getByRole('heading', { name: 'Step-by-step replay' })).toBeInTheDocument();
    expect(screen.getByText('3 recorded steps')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Execution tree' })).not.toBeInTheDocument();
  });
});

describe('ReplayAdvancedPanel', () => {
  it('shows comparison deltas and trace breakdown details', () => {
    render(<ReplayAdvancedPanel replay={replay} controlPlane={controlPlaneFixture} />);

    expect(screen.getByText('Credit delta')).toBeInTheDocument();
    expect(screen.getByText('+3 cr')).toBeInTheDocument();
    expect(screen.getByText('Root spans')).toBeInTheDocument();
    expect(screen.getByText('Deepest chain')).toBeInTheDocument();
    expect(screen.getByText('3 levels')).toBeInTheDocument();
  });
});
