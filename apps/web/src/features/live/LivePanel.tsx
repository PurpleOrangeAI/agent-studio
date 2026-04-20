import type { Replay, Run, Workflow } from '@agent-studio/contracts';

import { formatCredits, formatDateTime, formatDuration, titleCaseStatus } from '../../app/format';

interface LivePanelProps {
  workflow: Workflow;
  run: Run;
  replay: Replay;
}

export function LivePanel({ workflow, run, replay }: LivePanelProps) {
  const topSignal = replay.operationalContext?.similarRuns[0];

  return (
    <div className="room-stack">
      <section className="surface">
        <div className="section-header">
          <div>
            <p className="eyebrow">Current posture</p>
            <h3>{workflow.name}</h3>
          </div>
          <span className={`status-pill status-pill--${run.status}`}>{titleCaseStatus(run.status)}</span>
        </div>
        <div className="metric-grid">
          <div>
            <span>Latest run</span>
            <strong>{run.experimentLabel}</strong>
          </div>
          <div>
            <span>Finished</span>
            <strong>{formatDateTime(run.finishedAt)}</strong>
          </div>
          <div>
            <span>Duration</span>
            <strong>{formatDuration(run.durationMs)}</strong>
          </div>
          <div>
            <span>Actual spend</span>
            <strong>{formatCredits(run.actualCredits)}</strong>
          </div>
        </div>
        <p className="feature-summary">
          {replay.stepExecutions[0]?.summary} The run finished with a safe publish path and gives the public demo a stable
          “healthy now” state to orient around.
        </p>
        {topSignal ? (
          <div className="inline-callout">
            <span className="eyebrow">Best next hop</span>
            <p>
              Closest related run: <strong>{topSignal.label}</strong>. That gives operators an immediate path into Replay
              when they want context beyond the latest healthy state.
            </p>
          </div>
        ) : null}
      </section>

      <section className="surface">
        <div className="section-header">
          <div>
            <p className="eyebrow">Workflow map</p>
            <h3>Live sequence</h3>
          </div>
          <span className="meta-chip">{workflow.steps.length} steps</span>
        </div>
        <div className="timeline-list">
          {workflow.steps.map((step, index) => (
            <article key={step.stepId} className="timeline-list__item">
              <div className="timeline-list__index">{index + 1}</div>
              <div>
                <h4>{step.title}</h4>
                <p>{step.objective}</p>
              </div>
              <div className="timeline-list__meta">
                <span>{step.assignedRole}</span>
                <span>{step.kind}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
