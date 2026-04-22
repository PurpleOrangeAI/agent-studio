import type { ControlPlaneSystemState } from '../../app/control-plane';
import type { Replay, Run, Workflow } from '@agent-studio/contracts';

import { formatCredits, formatDateTime, formatDuration, titleCaseStatus } from '../../app/format';
import { LiveAgentTopologySection } from './LiveAgentTopologySection';

interface LivePanelProps {
  workflow: Workflow;
  run: Run;
  replay: Replay;
  controlPlane?: ControlPlaneSystemState | null;
}

export function LivePanel({ workflow, run, replay, controlPlane }: LivePanelProps) {
  const topSignal = replay.operationalContext?.similarRuns[0];
  const healthyAnchor = replay.operationalContext?.lastHealthyComparison;
  const recommendation = replay.operationalContext?.recommendationEvidence[0];
  const directiveCount = Object.keys(replay.studioState?.roleDirectives ?? {}).length;
  const systemAgentCount = controlPlane?.agents.length ?? null;
  const systemExecutionCount = controlPlane?.executions.length ?? null;
  const systemReleaseCount = controlPlane?.releases.length ?? null;

  return (
    <div className="room-stack">
      <section className="surface surface--live-brief">
        <div className="section-header">
          <div>
            <p className="eyebrow">Current posture</p>
            <h3>{workflow.name}</h3>
          </div>
          <span className={`status-pill status-pill--${run.status}`}>{titleCaseStatus(run.status)}</span>
        </div>
        <div className="metric-grid">
          <div className="metric-card metric-card--primary">
            <span>Latest run</span>
            <strong>{run.experimentLabel}</strong>
          </div>
          <div className="metric-card">
            <span>Finished</span>
            <strong>{formatDateTime(run.finishedAt)}</strong>
          </div>
          <div className="metric-card">
            <span>Duration</span>
            <strong>{formatDuration(run.durationMs)}</strong>
          </div>
          <div className="metric-card metric-card--accent">
            <span>Actual spend</span>
            <strong>{formatCredits(run.actualCredits)}</strong>
          </div>
        </div>
        <p className="feature-summary">
          {replay.stepExecutions[0]?.summary} The run finished with a safe publish path and gives the public demo a stable
          “healthy now” state to orient around.
        </p>
        <div className="signal-band">
          <article className="signal-band__card">
            <p className="eyebrow">Healthy anchor</p>
            <strong>{healthyAnchor?.label ?? run.experimentLabel}</strong>
            <p>{healthyAnchor?.summary ?? 'This run is currently the strongest baseline in the demo loop.'}</p>
          </article>
          <article className="signal-band__card signal-band__card--accent">
            <p className="eyebrow">Recommendation</p>
            <strong>{recommendation?.title ?? 'Operator loop is stable'}</strong>
            <p>{recommendation?.body ?? 'No urgent intervention needed. Use Replay for explanation and Optimize for release work.'}</p>
          </article>
          <article className="signal-band__card signal-band__card--directive">
            <p className="eyebrow">Directive load</p>
            <strong>{directiveCount} tuned roles</strong>
            <p>Role directives stay visible so the operator can see how much steering the system is carrying right now.</p>
          </article>
        </div>
        {topSignal ? (
          <div className="inline-callout">
            <span className="eyebrow">Best next hop</span>
            <p>
              Closest related run: <strong>{topSignal.label}</strong>. That gives operators an immediate path into Replay
              when they want context beyond the latest healthy state.
            </p>
          </div>
        ) : null}
        {controlPlane ? (
          <div className="inline-callout">
            <span className="eyebrow">Control-plane view</span>
            <p>
              This workflow now maps to <strong>{controlPlane.system.name}</strong> with{' '}
              <strong>{systemAgentCount}</strong> registered agents, <strong>{systemExecutionCount}</strong> tracked
              executions, and <strong>{systemReleaseCount}</strong> recorded release decisions.
            </p>
          </div>
        ) : null}
      </section>

      <LiveAgentTopologySection workflow={workflow} run={run} replay={replay} controlPlane={controlPlane} />

      <section className="surface surface--sequence">
        <div className="section-header">
          <div>
            <p className="eyebrow">Execution lane</p>
            <h3>Live sequence</h3>
          </div>
          <span className="meta-chip">{workflow.steps.length} steps</span>
        </div>
        <div className="timeline-list">
          {workflow.steps.map((step, index) => (
            <article key={step.stepId} className="timeline-list__item timeline-list__item--mapped">
              <div className="timeline-list__index">{index + 1}</div>
              <div>
                <h4>{step.title}</h4>
                <p>{step.objective}</p>
              </div>
              <div className="timeline-list__meta">
                <span className="meta-chip">{step.assignedRole}</span>
                <span className="meta-chip">{step.kind}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
