import type { Replay, Run } from '@agent-studio/contracts';

import { formatCredits, formatDuration, titleCaseStatus } from '../../app/format';

interface ReplayPanelProps {
  replay: Replay;
  baselineRun: Run;
}

export function ReplayPanel({ replay, baselineRun }: ReplayPanelProps) {
  const comparison = replay.operationalContext?.lastHealthyComparison;
  const failedStep = replay.stepExecutions.find((step) => step.status === 'failed');

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
          {failedStep?.summary ?? 'The replay makes the decision point obvious.'} Replay is there to show the exact break,
          not to bury it in generic analytics.
        </p>
        <div className="metric-grid">
          <div className="metric-card metric-card--warning">
            <span>Failed at</span>
            <strong>{failedStep?.title ?? 'No failed step'}</strong>
          </div>
          <div className="metric-card">
            <span>Actual spend</span>
            <strong>{formatCredits(replay.run.actualCredits)}</strong>
          </div>
          <div className="metric-card">
            <span>Duration</span>
            <strong>{formatDuration(replay.run.durationMs)}</strong>
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
      </section>

      <section className="surface">
        <div className="section-header">
          <div>
            <p className="eyebrow">Run timeline</p>
            <h3>Step-by-step replay</h3>
          </div>
          <span className="meta-chip">{replay.stepExecutions.length} recorded steps</span>
        </div>
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
      </section>
    </div>
  );
}
