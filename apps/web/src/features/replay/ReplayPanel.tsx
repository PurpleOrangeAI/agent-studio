import type { Replay, Run } from '@agent-studio/contracts';

import type { ControlPlaneSystemState } from '../../app/control-plane';
import { getAgentLabel, getExecutionForRun, getExecutionMetrics, getExecutionSpans } from '../../app/control-plane';
import { formatCredits, formatDateTime, formatDuration, titleCaseStatus } from '../../app/format';

interface ReplayPanelProps {
  replay: Replay;
  baselineRun: Run;
  controlPlane?: ControlPlaneSystemState | null;
}

export function ReplayPanel({ replay, baselineRun, controlPlane }: ReplayPanelProps) {
  const comparison = replay.operationalContext?.lastHealthyComparison;
  const failedStep = replay.stepExecutions.find((step) => step.status === 'failed');
  const execution = getExecutionForRun(controlPlane, replay.run.runId);
  const spans = getExecutionSpans(controlPlane, execution?.executionId);
  const executionMetrics = getExecutionMetrics(controlPlane, execution?.executionId);
  const failedSpan = spans.find((span) => span.status === 'failed') ?? null;
  const observedAgentCount = new Set(spans.map((span) => span.agentId).filter(Boolean)).size;
  const creditsMetric = executionMetrics.find((metric) => metric.metric === 'credits.actual');
  const durationMetric = executionMetrics.find((metric) => metric.metric === 'duration.ms');
  const replayHeadline =
    failedSpan?.summary ??
    failedStep?.summary ??
    failedSpan?.name ??
    failedStep?.title ??
    'The replay makes the decision point obvious.';
  const replayBody = execution
    ? `Replay is now reading the control-plane trace directly: ${spans.length} spans across ${observedAgentCount || 1} tracked agents in execution ${execution.executionId}.`
    : 'Replay is there to show the exact break, not to bury it in generic analytics.';

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
        <div className="metric-grid">
          <div className="metric-card metric-card--warning">
            <span>Failed at</span>
            <strong>{failedSpan?.name ?? failedStep?.title ?? 'No failed step'}</strong>
          </div>
          <div className="metric-card">
            <span>Actual spend</span>
            <strong>{formatCredits(creditsMetric?.value ?? replay.run.actualCredits)}</strong>
          </div>
          <div className="metric-card">
            <span>Duration</span>
            <strong>{formatDuration(durationMetric?.value ?? replay.run.durationMs)}</strong>
          </div>
          <div className="metric-card metric-card--primary">
            <span>Healthy control</span>
            <strong>{baselineRun.experimentLabel}</strong>
          </div>
        </div>
        {comparison ? (
          <div className="inline-callout inline-callout--warning">
            <span className="eyebrow">What drifted</span>
            <p>{comparison.summary}</p>
          </div>
        ) : null}
        {execution ? (
          <div className="inline-callout">
            <span className="eyebrow">Trace context</span>
            <p>
              Trace <strong>{execution.traceId}</strong> started {formatDateTime(execution.startedAt)} and is tied to{' '}
              <strong>{controlPlane?.system.name ?? 'this system'}</strong>. This replay is using execution-native spans instead
              of only flattened step summaries.
            </p>
          </div>
        ) : null}
      </section>

      <section className="surface">
        <div className="section-header">
          <div>
            <p className="eyebrow">Run timeline</p>
            <h3>{execution ? 'Execution and span replay' : 'Step-by-step replay'}</h3>
          </div>
          <span className="meta-chip">{execution ? `${spans.length} recorded spans` : `${replay.stepExecutions.length} recorded steps`}</span>
        </div>
        <div className="timeline-list">
          {execution
            ? spans.map((span) => (
                <article key={span.spanId} className={`timeline-list__item timeline-list__item--${span.status}`}>
                  <div className={`timeline-list__index timeline-list__index--${span.status}`} />
                  <div>
                    <h4>{span.name}</h4>
                    <p>
                      {span.summary ?? 'No span summary recorded.'}
                      {span.parentSpanId ? ` Linked from ${span.parentSpanId}.` : ''}
                    </p>
                  </div>
                  <div className="timeline-list__meta">
                    <span className={`status-pill status-pill--${span.status}`}>{titleCaseStatus(span.status)}</span>
                    <span>{getAgentLabel(controlPlane, span.agentId) ?? span.kind}</span>
                    <span>{formatCredits(span.usage?.credits)}</span>
                    <span>{formatDuration(span.usage?.durationMs)}</span>
                  </div>
                </article>
              ))
            : replay.stepExecutions.map((step) => (
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
      </section>
    </div>
  );
}
