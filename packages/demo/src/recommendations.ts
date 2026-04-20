import type { OperationalContext } from '@agent-studio/contracts';

import { seededIds } from './workflows.js';

export const seededOperationalContexts = {
  [seededIds.baselineRunId]: {
    workflowId: seededIds.workflowId,
    runId: seededIds.baselineRunId,
    generatedAt: '2026-04-17T08:30:00.000Z',
    similarRuns: [
      {
        runId: seededIds.improvedRunId,
        label: 'Tighter fan-out candidate',
        status: 'succeeded',
        startedAt: '2026-04-19T13:00:00.000Z',
        finishedAt: '2026-04-19T13:07:54.000Z',
        actualCredits: 20,
        durationMs: 474000,
        similarityScore: 0.94,
        matchedSignals: ['Same workflow', 'Same evidence shape', 'Same publish path'],
      },
      {
        runId: seededIds.degradedRunId,
        label: 'Lean review failure',
        status: 'failed',
        startedAt: '2026-04-18T13:00:00.000Z',
        finishedAt: '2026-04-18T13:10:40.000Z',
        actualCredits: 35,
        durationMs: 640000,
        similarityScore: 0.88,
        matchedSignals: ['Same workflow', 'Same request class', 'Same review checkpoint'],
      },
    ],
    recommendationEvidence: [
      {
        evidenceId: 'evidence_baseline_001',
        title: 'The synthesis step is the main spend driver',
        body:
          'In the healthy control run, the analyze step used the largest share of credits while the review and publish steps stayed lightweight.',
        sourceLabel: 'Replay aggregate',
        phase: 'analyze',
        relatedRunIds: [seededIds.baselineRunId, seededIds.improvedRunId],
      },
      {
        evidenceId: 'evidence_baseline_002',
        title: 'The review gate catches quality issues before delivery',
        body:
          'The guardrail-review step surfaced a single unsupported claim without forcing a re-run, which makes it a good candidate for preservation.',
        sourceLabel: 'Review log',
        phase: 'note',
        relatedRunIds: [seededIds.baselineRunId],
      },
    ],
  },
  [seededIds.degradedRunId]: {
    workflowId: seededIds.workflowId,
    runId: seededIds.degradedRunId,
    generatedAt: '2026-04-18T13:20:00.000Z',
    similarRuns: [
      {
        runId: seededIds.baselineRunId,
        label: 'Baseline control',
        status: 'succeeded',
        startedAt: '2026-04-17T13:00:00.000Z',
        finishedAt: '2026-04-17T13:09:20.000Z',
        actualCredits: 32,
        durationMs: 560000,
        similarityScore: 0.9,
        matchedSignals: ['Same workflow', 'Same evidence set size', 'Same publish target'],
      },
      {
        runId: seededIds.improvedRunId,
        label: 'Tighter fan-out candidate',
        status: 'succeeded',
        startedAt: '2026-04-19T13:00:00.000Z',
        finishedAt: '2026-04-19T13:07:54.000Z',
        actualCredits: 20,
        durationMs: 474000,
        similarityScore: 0.84,
        matchedSignals: ['Same workflow', 'Same review gate', 'Same final artifact'],
      },
    ],
    lastHealthyComparison: {
      runId: seededIds.baselineRunId,
      label: 'Baseline control',
      startedAt: '2026-04-17T13:00:00.000Z',
      finishedAt: '2026-04-17T13:09:20.000Z',
      creditsDelta: 3,
      durationDelta: 80000,
      changedSignals: [
        'Lean review skipped a citation verification pass',
        'Source fan-out widened and produced duplicate notes',
        'Synthesis had to restate the evidence after guardrails were removed',
      ],
      summary: 'The degraded replay traded away the review gate and paid for it with rework and a failed publish.',
    },
    recommendationEvidence: [
      {
        evidenceId: 'evidence_degraded_001',
        title: 'Failure happened at the guardrail step',
        body:
          'The replay did not fail in sourcing or analysis. It failed because the review step no longer had enough structure to reject unsupported claims.',
        sourceLabel: 'Failed replay',
        phase: 'note',
        relatedRunIds: [seededIds.degradedRunId],
      },
      {
        evidenceId: 'evidence_degraded_002',
        title: 'Extra source fan-out increased cost without improving quality',
        body:
          'The degraded run used more tool calls in the evidence phase but still produced duplicate notes, which is a sign the fan-out was too broad.',
        sourceLabel: 'Tool telemetry',
        phase: 'search',
        relatedRunIds: [seededIds.degradedRunId, seededIds.baselineRunId],
      },
      {
        evidenceId: 'evidence_degraded_003',
        title: 'The candidate plan should keep the review gate intact',
        body:
          'Any lower-cost plan needs to preserve the note-step citation check; removing it is what made the degraded replay unsafe to publish.',
        sourceLabel: 'Control-room recommendation',
        phase: 'note',
        relatedRunIds: [seededIds.degradedRunId, seededIds.improvedRunId],
      },
    ],
  },
  [seededIds.improvedRunId]: {
    workflowId: seededIds.workflowId,
    runId: seededIds.improvedRunId,
    generatedAt: '2026-04-19T13:20:00.000Z',
    similarRuns: [
      {
        runId: seededIds.baselineRunId,
        label: 'Baseline control',
        status: 'succeeded',
        startedAt: '2026-04-17T13:00:00.000Z',
        finishedAt: '2026-04-17T13:09:20.000Z',
        actualCredits: 32,
        durationMs: 560000,
        similarityScore: 0.96,
        matchedSignals: ['Same workflow', 'Same publish target', 'Same quality bar'],
      },
      {
        runId: seededIds.degradedRunId,
        label: 'Lean review failure',
        status: 'failed',
        startedAt: '2026-04-18T13:00:00.000Z',
        finishedAt: '2026-04-18T13:10:40.000Z',
        actualCredits: 35,
        durationMs: 640000,
        similarityScore: 0.86,
        matchedSignals: ['Same workflow', 'Same review gate', 'Same evidence table'],
      },
    ],
    lastHealthyComparison: {
      runId: seededIds.baselineRunId,
      label: 'Baseline control',
      startedAt: '2026-04-17T13:00:00.000Z',
      finishedAt: '2026-04-17T13:09:20.000Z',
      creditsDelta: -12,
      durationDelta: -86000,
      changedSignals: [
        'Source fan-out stayed narrow',
        'The review gate remained enabled',
        'Synthesis used fewer duplicate notes',
      ],
      summary: 'The candidate plan preserved the same publish quality while running leaner and finishing faster.',
    },
    recommendationEvidence: [
      {
        evidenceId: 'evidence_improved_001',
        title: 'Most of the savings came from narrower evidence collection',
        body:
          'The improved run cut duplicate source calls without changing the final artifact shape, which is exactly the kind of change Optimize should promote.',
        sourceLabel: 'Replay comparison',
        phase: 'search',
        relatedRunIds: [seededIds.improvedRunId, seededIds.baselineRunId],
      },
      {
        evidenceId: 'evidence_improved_002',
        title: 'The review gate still prevented unsafe publish behavior',
        body:
          'Unlike the degraded replay, the candidate plan kept the dedicated review step and still caught citation issues before delivery.',
        sourceLabel: 'Review log',
        phase: 'note',
        relatedRunIds: [seededIds.improvedRunId, seededIds.degradedRunId],
      },
      {
        evidenceId: 'evidence_improved_003',
        title: 'The improved run is the best promote candidate',
        body:
          'It matches the baseline control on quality, beats it on credits and duration, and avoids the failure mode seen in the degraded replay.',
        sourceLabel: 'Control-room recommendation',
        phase: 'summarize',
        relatedRunIds: [seededIds.improvedRunId, seededIds.baselineRunId, seededIds.degradedRunId],
      },
    ],
  },
} satisfies Record<string, OperationalContext>;
