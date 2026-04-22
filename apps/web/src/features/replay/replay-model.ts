import type { MetricSample, Replay, Run, SpanRecord } from '@agent-studio/contracts';

import { formatCredits, formatDuration } from '../../app/format';

export interface ReplayComparisonSummary {
  baselineLabel: string;
  selectedLabel: string;
  baselineCredits?: number;
  selectedCredits?: number;
  baselineDurationMs?: number;
  selectedDurationMs?: number;
  creditsDelta: number | null;
  durationDeltaMs: number | null;
  changedSignals: string[];
  summary: string | null;
}

export interface ReplaySpanTreeNode {
  span: SpanRecord;
  depth: number;
  children: ReplaySpanTreeNode[];
}

export interface ReplaySpanTreeStats {
  rootCount: number;
  nestedSpanCount: number;
  leafCount: number;
  maxDepth: number;
  failedCount: number;
  agentCount: number;
}

export interface ReplaySpanTree {
  roots: ReplaySpanTreeNode[];
  stats: ReplaySpanTreeStats;
}

function getMetricValue(metrics: MetricSample[], metric: string) {
  return metrics.find((sample) => sample.metric === metric)?.value;
}

function getRunLabel(run: Run, fallback: string) {
  return run.experimentLabel ?? run.branchName ?? run.runId ?? fallback;
}

function describeCreditsDelta(delta: number | null) {
  if (delta == null) {
    return null;
  }

  if (delta === 0) {
    return 'matched spend';
  }

  return delta > 0 ? `spent ${formatCredits(delta)} more` : `spent ${formatCredits(Math.abs(delta))} less`;
}

function describeDurationDelta(deltaMs: number | null) {
  if (deltaMs == null) {
    return null;
  }

  if (deltaMs === 0) {
    return 'finished in the same time';
  }

  return deltaMs > 0 ? `finished ${formatDuration(deltaMs)} slower` : `finished ${formatDuration(Math.abs(deltaMs))} faster`;
}

export function summarizeReplayComparison(replay: Replay, baselineRun: Run, executionMetrics: MetricSample[] = []): ReplayComparisonSummary {
  const comparison = replay.operationalContext?.lastHealthyComparison;
  const selectedCredits = getMetricValue(executionMetrics, 'credits.actual') ?? replay.run.actualCredits;
  const selectedDurationMs = getMetricValue(executionMetrics, 'duration.ms') ?? replay.run.durationMs;
  const baselineCredits = baselineRun.actualCredits;
  const baselineDurationMs = baselineRun.durationMs;

  return {
    baselineLabel: getRunLabel(baselineRun, 'Healthy control'),
    selectedLabel: getRunLabel(replay.run, 'Selected replay'),
    baselineCredits,
    selectedCredits,
    baselineDurationMs,
    selectedDurationMs,
    creditsDelta: comparison?.creditsDelta ?? (selectedCredits != null && baselineCredits != null ? selectedCredits - baselineCredits : null),
    durationDeltaMs:
      comparison?.durationDelta ?? (selectedDurationMs != null && baselineDurationMs != null ? selectedDurationMs - baselineDurationMs : null),
    changedSignals: comparison?.changedSignals ?? [],
    summary: comparison?.summary ?? null,
  };
}

export function buildReplayCompareNarrative(summary: ReplayComparisonSummary) {
  if (summary.summary) {
    return summary.summary;
  }

  const comparisonNotes = [describeCreditsDelta(summary.creditsDelta), describeDurationDelta(summary.durationDeltaMs)].filter(
    (item): item is string => item != null,
  );

  if (!comparisonNotes.length) {
    return `Healthy comparison notes were not recorded, so this view falls back to direct run metrics for ${summary.selectedLabel} versus ${summary.baselineLabel}.`;
  }

  return `${summary.selectedLabel} ${comparisonNotes.join(' and ')} than ${summary.baselineLabel}.`;
}

export function formatSignedCreditsDelta(delta: number | null | undefined) {
  if (delta == null) {
    return '—';
  }

  const prefix = delta > 0 ? '+' : '';
  return `${prefix}${delta.toFixed(0)} cr`;
}

export function formatSignedDurationDelta(deltaMs: number | null | undefined) {
  if (deltaMs == null) {
    return '—';
  }

  const prefix = deltaMs > 0 ? '+' : deltaMs < 0 ? '-' : '';
  return `${prefix}${formatDuration(Math.abs(deltaMs))}`;
}

export function buildReplaySpanTree(spans: SpanRecord[]): ReplaySpanTree {
  const nodesById = new Map<string, ReplaySpanTreeNode>(
    spans.map((span) => [
      span.spanId,
      {
        span,
        depth: 0,
        children: [],
      },
    ]),
  );
  const roots: ReplaySpanTreeNode[] = [];

  spans.forEach((span) => {
    const node = nodesById.get(span.spanId);
    if (!node) {
      return;
    }

    const parent = span.parentSpanId ? nodesById.get(span.parentSpanId) : null;
    if (parent) {
      parent.children.push(node);
      return;
    }

    roots.push(node);
  });

  let leafCount = 0;
  let maxDepth = 0;

  const assignDepth = (node: ReplaySpanTreeNode, depth: number) => {
    node.depth = depth;
    maxDepth = Math.max(maxDepth, depth + 1);

    if (!node.children.length) {
      leafCount += 1;
      return;
    }

    node.children.forEach((child) => assignDepth(child, depth + 1));
  };

  roots.forEach((node) => assignDepth(node, 0));

  return {
    roots,
    stats: {
      rootCount: roots.length,
      nestedSpanCount: spans.filter((span) => span.parentSpanId).length,
      leafCount,
      maxDepth,
      failedCount: spans.filter((span) => span.status === 'failed').length,
      agentCount: new Set(spans.map((span) => span.agentId).filter(Boolean)).size,
    },
  };
}
