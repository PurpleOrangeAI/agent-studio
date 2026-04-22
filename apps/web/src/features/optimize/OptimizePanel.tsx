import type { Replay, Run, SavedPlan } from '@agent-studio/contracts';

import { formatCredits, formatDelta, formatDuration } from '../../app/format';

interface OptimizePanelProps {
  baselineRun: Run;
  candidateRun: Run;
  candidateReplay: Replay;
  candidatePlan: SavedPlan | null;
  promotionSummary: string;
}

export function OptimizePanel({
  baselineRun,
  candidateRun,
  candidateReplay,
  candidatePlan,
  promotionSummary,
}: OptimizePanelProps) {
  const creditDelta = (candidateRun.actualCredits ?? 0) - (baselineRun.actualCredits ?? 0);
  const durationDeltaSeconds = Math.round(((candidateRun.durationMs ?? 0) - (baselineRun.durationMs ?? 0)) / 1000);

  return (
    <div className="room-stack">
      <section className="surface">
        <div className="section-header">
          <div>
            <p className="eyebrow">Release call</p>
            <h3>{candidateRun.experimentLabel}</h3>
          </div>
          <span className="status-pill status-pill--succeeded">Promotion-ready</span>
        </div>
        <p className="feature-summary">
          {promotionSummary} Optimize is the point where the public demo proves the loop closes back into a better next run.
        </p>
        <div className="metric-grid">
          <div className="metric-card">
            <span>Baseline</span>
            <strong>{formatCredits(baselineRun.actualCredits)}</strong>
          </div>
          <div className="metric-card metric-card--primary">
            <span>Candidate</span>
            <strong>{formatCredits(candidateRun.actualCredits)}</strong>
          </div>
          <div className="metric-card metric-card--success">
            <span>Credits delta</span>
            <strong>{formatDelta(creditDelta)}</strong>
          </div>
          <div className="metric-card metric-card--accent">
            <span>Duration delta</span>
            <strong>{formatDelta(durationDeltaSeconds)}s</strong>
          </div>
        </div>
        <div className="inline-callout inline-callout--success">
          <span className="eyebrow">Release logic</span>
          <p>The candidate is worth shipping because it kept the review guardrail intact while reducing spend and tightening the loop.</p>
        </div>
      </section>

      <section className="surface">
        <div className="section-header">
          <div>
            <p className="eyebrow">Candidate plan</p>
            <h3>{candidatePlan?.name ?? 'No saved plan selected'}</h3>
          </div>
          <span className="meta-chip">{candidatePlan?.executionPolicy.reviewPolicy ?? 'standard'} review</span>
        </div>
        <p className="feature-summary">{candidatePlan?.notes ?? 'No candidate notes recorded.'}</p>
        <div className="timeline-list">
          {candidateReplay.stepExecutions.map((step) => (
            <article key={step.stepId} className={`timeline-list__item timeline-list__item--${step.status}`}>
              <div className="timeline-list__index">{step.kind.slice(0, 1).toUpperCase()}</div>
              <div>
                <h4>{step.title}</h4>
                <p>{step.summary ?? 'No step summary recorded.'}</p>
              </div>
              <div className="timeline-list__meta">
                <span className="meta-chip">{step.modelTier ?? 'default'}</span>
                <span>{formatDuration(step.durationMs)}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
