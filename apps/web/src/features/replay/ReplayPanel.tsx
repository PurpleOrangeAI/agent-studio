import type { Replay, Run } from '@agent-studio/contracts';

import type { ControlPlaneSystemState } from '../../app/control-plane';
import { getAgentLabel, getExecutionForRun, getExecutionMetrics, getExecutionSpans } from '../../app/control-plane';
import { formatCredits, formatDateTime, formatDuration, titleCaseStatus } from '../../app/format';
import {
  buildReplayCompareNarrative,
  buildReplaySpanTree,
  formatSignedCreditsDelta,
  formatSignedDurationDelta,
  summarizeReplayComparison,
  type ReplaySpanTreeNode,
} from './replay-model';

interface ReplayPanelProps {
  replay: Replay;
  baselineRun: Run;
  controlPlane?: ControlPlaneSystemState | null;
}

function getReplayStatusModifier(status: string) {
  if (status === 'failed') {
    return 'failed';
  }

  if (status === 'succeeded') {
    return 'succeeded';
  }

  return 'mapped';
}

function getMetricCardClass(delta: number | null) {
  if (delta == null || delta === 0) {
    return 'metric-card';
  }

  return delta < 0 ? 'metric-card metric-card--success' : 'metric-card metric-card--warning';
}

function formatOptionalDuration(durationMs?: number) {
  return durationMs == null ? '—' : formatDuration(durationMs);
}

function renderSpanTreeNode(node: ReplaySpanTreeNode, controlPlane?: ControlPlaneSystemState | null): React.ReactNode {
  const modifier = getReplayStatusModifier(node.span.status);
  const childCount = node.children.length;
  const agentLabel = getAgentLabel(controlPlane, node.span.agentId) ?? node.span.kind;
  const indexClassName =
    modifier === 'mapped' ? 'timeline-list__index' : `timeline-list__index timeline-list__index--${modifier}`;

  return (
    <div key={node.span.spanId} className="replay-tree__node">
      <article className={`timeline-list__item timeline-list__item--${modifier}`}>
        <div className={indexClassName}>{node.depth + 1}</div>
        <div>
          <h4>{node.span.name}</h4>
          <p>{node.span.summary ?? 'No span summary recorded.'}</p>
          <div className="replay-tree__badges">
            <span className="meta-chip">{node.span.parentSpanId ? 'Nested handoff' : 'Root span'}</span>
            <span className="meta-chip">{childCount ? `${childCount} child span${childCount === 1 ? '' : 's'}` : 'Leaf span'}</span>
          </div>
        </div>
        <div className="timeline-list__meta">
          <span className={`status-pill status-pill--${node.span.status}`}>{titleCaseStatus(node.span.status)}</span>
          <span>{agentLabel}</span>
          <span>{formatCredits(node.span.usage?.credits)}</span>
          <span>{formatOptionalDuration(node.span.usage?.durationMs)}</span>
        </div>
      </article>
      {childCount ? <div className="replay-tree__children">{node.children.map((child) => renderSpanTreeNode(child, controlPlane))}</div> : null}
    </div>
  );
}

export function ReplayPanel({ replay, baselineRun, controlPlane }: ReplayPanelProps) {
  const failedStep = replay.stepExecutions.find((step) => step.status === 'failed');
  const execution = getExecutionForRun(controlPlane, replay.run.runId);
  const spans = getExecutionSpans(controlPlane, execution?.executionId);
  const executionMetrics = getExecutionMetrics(controlPlane, execution?.executionId);
  const compareSummary = summarizeReplayComparison(replay, baselineRun, executionMetrics);
  const compareNarrative = buildReplayCompareNarrative(compareSummary);
  const failedSpan = spans.find((span) => span.status === 'failed') ?? null;
  const hasExecutionTree = Boolean(execution && spans.length > 0);
  const spanTree = hasExecutionTree ? buildReplaySpanTree(spans) : null;
  const observedAgentCount = spanTree?.stats.agentCount ?? new Set(spans.map((span) => span.agentId).filter(Boolean)).size;
  const replayHeadline =
    failedSpan?.summary ??
    failedStep?.summary ??
    failedSpan?.name ??
    failedStep?.title ??
    'The replay makes the decision point obvious.';
  const replayBody = hasExecutionTree
    ? `Replay is reading the control-plane trace directly: ${spans.length} spans across ${observedAgentCount || 1} tracked agents in execution ${execution?.executionId}, pinned against ${compareSummary.baselineLabel}.`
    : `Replay falls back to recorded step summaries when no execution trace is available, while still comparing ${compareSummary.selectedLabel} to ${compareSummary.baselineLabel}.`;
  const compareCardClass =
    compareSummary.creditsDelta != null &&
    compareSummary.durationDeltaMs != null &&
    compareSummary.creditsDelta <= 0 &&
    compareSummary.durationDeltaMs <= 0
      ? 'signal-band__card signal-band__card--accent'
      : 'signal-band__card signal-band__card--directive';

  return (
    <div className="room-stack">
      <section className="surface">
        <div className="section-header">
          <div>
            <p className="eyebrow">Replay brief</p>
            <h3>{replay.run.experimentLabel}</h3>
          </div>
          <span className={`status-pill status-pill--${replay.run.status}`}>{titleCaseStatus(replay.run.status)}</span>
        </div>
        <p className="feature-summary">
          {replayHeadline} {replayBody}
        </p>
        <div className="signal-band">
          <article className="signal-band__card">
            <span className="eyebrow">Baseline</span>
            <strong>{compareSummary.baselineLabel}</strong>
            <p>
              <span className={`status-pill status-pill--${baselineRun.status}`}>{titleCaseStatus(baselineRun.status)}</span> ·{' '}
              {formatCredits(compareSummary.baselineCredits)} · {formatOptionalDuration(compareSummary.baselineDurationMs)}
            </p>
            <p>Started {formatDateTime(baselineRun.startedAt)}</p>
          </article>
          <article className="signal-band__card signal-band__card--accent">
            <span className="eyebrow">Selected replay</span>
            <strong>{compareSummary.selectedLabel}</strong>
            <p>
              <span className={`status-pill status-pill--${replay.run.status}`}>{titleCaseStatus(replay.run.status)}</span> ·{' '}
              {formatCredits(compareSummary.selectedCredits)} · {formatOptionalDuration(compareSummary.selectedDurationMs)}
            </p>
            <p>Started {formatDateTime(replay.run.startedAt)}</p>
          </article>
          <article className={compareCardClass}>
            <span className="eyebrow">Compare readout</span>
            <strong>
              Spend {formatSignedCreditsDelta(compareSummary.creditsDelta)} / Time {formatSignedDurationDelta(compareSummary.durationDeltaMs)}
            </strong>
            <p>{compareNarrative}</p>
          </article>
        </div>
        <div className="metric-grid">
          <div className="metric-card metric-card--warning">
            <span>Failed at</span>
            <strong>{failedSpan?.name ?? failedStep?.title ?? 'No failed step'}</strong>
          </div>
          <div className={getMetricCardClass(compareSummary.creditsDelta)}>
            <span>Spend delta</span>
            <strong>{formatSignedCreditsDelta(compareSummary.creditsDelta)}</strong>
          </div>
          <div className={getMetricCardClass(compareSummary.durationDeltaMs)}>
            <span>Duration delta</span>
            <strong>{formatSignedDurationDelta(compareSummary.durationDeltaMs)}</strong>
          </div>
          <div className={compareSummary.changedSignals.length ? 'metric-card metric-card--primary' : 'metric-card'}>
            <span>Signals changed</span>
            <strong>{compareSummary.changedSignals.length ? `${compareSummary.changedSignals.length} signals` : 'None recorded'}</strong>
          </div>
        </div>
        <div className={`inline-callout${compareSummary.changedSignals.length ? ' inline-callout--warning' : ''}`}>
          <span className="eyebrow">{compareSummary.changedSignals.length ? 'What changed from baseline' : 'Baseline readout'}</span>
          <p>{compareNarrative}</p>
        </div>
        {execution ? (
          <div className="inline-callout">
            <span className="eyebrow">Trace context</span>
            <p>
              Trace <strong>{execution.traceId}</strong> started {formatDateTime(execution.startedAt)} and is tied to{' '}
              <strong>{controlPlane?.system.name ?? 'this system'}</strong>. This replay is using execution-native spans and{' '}
              {spanTree ? `${spanTree.stats.rootCount} root branches with a deepest chain of ${spanTree.stats.maxDepth}.` : 'will fall back to flattened steps if the span tree is unavailable.'}
            </p>
          </div>
        ) : null}
      </section>

      <section className="surface">
        <div className="section-header">
          <div>
            <p className="eyebrow">Run timeline</p>
            <h3>{hasExecutionTree ? 'Execution tree' : 'Step-by-step replay'}</h3>
          </div>
          <span className="meta-chip">{hasExecutionTree ? `${spans.length} recorded spans` : `${replay.stepExecutions.length} recorded steps`}</span>
        </div>
        {hasExecutionTree && spanTree ? (
          <>
            <div className="replay-tree__summary">
              <span className="meta-chip">{spanTree.stats.rootCount} root spans</span>
              <span className="meta-chip">{spanTree.stats.nestedSpanCount} nested handoffs</span>
              <span className="meta-chip">{spanTree.stats.maxDepth} levels deep</span>
              <span className="meta-chip">{spanTree.stats.failedCount} failed spans</span>
              <span className="meta-chip">
                {spanTree.stats.agentCount ? `${spanTree.stats.agentCount} tracked agents` : 'No agent labels recorded'}
              </span>
            </div>
            <div className="replay-tree">{spanTree.roots.map((node) => renderSpanTreeNode(node, controlPlane))}</div>
          </>
        ) : (
          <div className="timeline-list">
            {replay.stepExecutions.map((step) => (
                <article key={step.stepId} className={`timeline-list__item timeline-list__item--${step.status}`}>
                  <div className={`timeline-list__index timeline-list__index--${step.status}`} />
                  <div>
                    <h4>{step.title}</h4>
                    <p>{step.summary ?? step.error ?? 'No step summary recorded.'}</p>
                  </div>
                  <div className="timeline-list__meta">
                    <span className={`status-pill status-pill--${step.status}`}>{titleCaseStatus(step.status)}</span>
                    <span>{step.assignedRole}</span>
                    <span>{formatCredits(step.actualCredits)}</span>
                  </div>
                </article>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
