import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import type { DemoState } from './demo';
import { App } from './App';

const { loadDemoStateMock } = vi.hoisted(() => ({
  loadDemoStateMock: vi.fn(),
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

vi.mock('./demo', () => ({
  loadDemoState: loadDemoStateMock,
}));

describe('App shell', () => {
  beforeEach(() => {
    loadDemoStateMock.mockResolvedValue(demoStateFixture);
  });

  it('renders the seeded demo control loop', async () => {
    render(<App />);

    expect(await screen.findByLabelText(/^runtime$/i)).toHaveValue('demo');
    expect(screen.getByRole('heading', { level: 1, name: /agent studio/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^workflow$/i)).toHaveDisplayValue(/weekly operations brief/i);
    expect(screen.getByRole('heading', { level: 2, name: /^live, replay, optimize$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /how agent studio works/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^live$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^replay$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^optimize$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /weekly operations brief/i })).toBeInTheDocument();
    expect(screen.getAllByText(/guardrailed candidate/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/promoted the tighter fan-out plan/i)).toBeInTheDocument();
  });
});
