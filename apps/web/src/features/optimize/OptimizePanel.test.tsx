import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Replay, Run } from '@agent-studio/contracts';
import type { ControlPlaneSystemState } from '../../app/control-plane';
import { OptimizePanel } from './OptimizePanel';

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

const candidateRun: Run = {
  runId: 'run_candidate',
  workflowId: 'workflow_ops_brief',
  status: 'succeeded',
  startedAt: '2026-04-18T13:00:00.000Z',
  finishedAt: '2026-04-18T13:06:10.000Z',
  actualCredits: 20,
  durationMs: 370000,
  experimentLabel: 'Guardrailed candidate',
};

const candidateReplay: Replay = {
  workflow: {
    workspaceId: 'workspace_demo',
    workflowId: 'workflow_ops_brief',
    name: 'Weekly Operations Brief',
    status: 'active',
    steps: [],
  },
  run: candidateRun,
  stepExecutions: [
    {
      stepId: 'review',
      kind: 'note',
      title: 'Review coverage',
      assignedRole: 'reviewer',
      status: 'succeeded',
      actualCredits: 8,
      summary: 'The review gate stayed green.',
    },
  ],
};

const controlPlaneFixture: ControlPlaneSystemState = {
  system: {
    systemId: 'system_workflow_ops_brief',
    workspaceId: 'workspace_demo',
    name: 'Weekly Operations Brief',
    runtimeIds: ['runtime_demo_seeded'],
    primaryRuntimeId: 'runtime_demo_seeded',
  },
  agents: [
    {
      agentId: 'agent_review',
      systemId: 'system_workflow_ops_brief',
      runtimeId: 'runtime_demo_seeded',
      label: 'Reviewer',
      kind: 'assistant',
      role: 'reviewer',
      status: 'active',
    },
  ],
  topology: null,
  executions: [
    {
      executionId: 'exec_candidate',
      systemId: 'system_workflow_ops_brief',
      runtimeId: 'runtime_demo_seeded',
      traceId: 'trace_candidate',
      runId: 'run_candidate',
      status: 'succeeded',
      startedAt: '2026-04-18T13:00:00.000Z',
      finishedAt: '2026-04-18T13:06:10.000Z',
    },
  ],
  executionSpans: {
    exec_candidate: [],
  },
  executionMetrics: {
    exec_candidate: [
      {
        sampleId: 'metric_credits_candidate',
        metric: 'credits.actual',
        unit: 'credits',
        value: 20,
        ts: '2026-04-18T13:06:10.000Z',
        scopeType: 'execution',
        scopeId: 'exec_candidate',
      },
    ],
  },
  interventions: [],
  evaluations: [
    {
      evaluationId: 'evaluation_latest',
      targetScopeType: 'system',
      targetScopeId: 'system_workflow_ops_brief',
      baselineRefs: ['run_base'],
      candidateRefs: ['run_candidate'],
      verdict: 'hold',
      createdAt: '2026-04-18T13:10:00.000Z',
      summary: 'Hold until the review path stays stable.',
      metricDeltas: [
        {
          metric: 'credits.actual',
          unit: 'credits',
          baselineValue: 32,
          candidateValue: 20,
          delta: -12,
        },
      ],
    },
  ],
  releases: [
    {
      releaseId: 'release_latest',
      systemId: 'system_workflow_ops_brief',
      baselineRef: 'run_base',
      candidateRef: 'run_candidate',
      decision: 'hold',
      requestedAt: '2026-04-18T13:12:00.000Z',
      appliedAt: '2026-04-18T13:12:00.000Z',
      status: 'applied',
      summary: 'Hold until the review path is stable.',
    },
  ],
};

describe('OptimizePanel', () => {
  it('shows an evidence-backed release message when evaluations or releases are present', () => {
    render(
      <OptimizePanel
        baselineRun={baselineRun}
        candidateRun={candidateRun}
        candidateReplay={candidateReplay}
        candidatePlan={null}
        promotionSummary="Promoted after the tighter candidate matched quality at lower spend."
        controlPlane={controlPlaneFixture}
      />,
    );

    expect(screen.getByText('Evidence-backed optimize')).toBeInTheDocument();
    expect(screen.getByText(/this room is reading imported evaluations or release decisions/i)).toBeInTheDocument();
  });

  it('warns when release evidence is still missing', () => {
    render(
      <OptimizePanel
        baselineRun={baselineRun}
        candidateRun={candidateRun}
        candidateReplay={candidateReplay}
        candidatePlan={null}
        promotionSummary="Promoted after the tighter candidate matched quality at lower spend."
        controlPlane={null}
      />,
    );

    expect(screen.getByText('Release evidence still missing')).toBeInTheDocument();
    expect(screen.getByText(/import evaluations or release decisions/i)).toBeInTheDocument();
  });
});
