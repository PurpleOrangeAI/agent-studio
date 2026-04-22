import type { Replay } from '@agent-studio/contracts';

import type { ControlPlaneSystemState } from '../../app/control-plane';
import { getExecutionForRun, getExecutionSpans } from '../../app/control-plane';

interface ReplayAdvancedPanelProps {
  replay: Replay;
  controlPlane?: ControlPlaneSystemState | null;
}

export function ReplayAdvancedPanel({ replay, controlPlane }: ReplayAdvancedPanelProps) {
  const evidence = replay.operationalContext?.recommendationEvidence ?? [];
  const comparison = replay.operationalContext?.lastHealthyComparison;
  const execution = getExecutionForRun(controlPlane, replay.run.runId);
  const spans = getExecutionSpans(controlPlane, execution?.executionId);

  return (
    <div className="advanced-grid">
      <section className="mini-surface">
        <p className="eyebrow">Evidence trail</p>
        <div className="stack-list">
          {evidence.map((item) => (
            <div key={item.evidenceId} className="stack-list__item stack-list__item--body">
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="mini-surface">
        <p className="eyebrow">Healthy comparison</p>
        {comparison ? (
          <div className="stack-list">
            {comparison.changedSignals.map((signal) => (
              <div key={signal} className="stack-list__item">
                <strong>{signal}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No healthy comparison recorded.</p>
        )}
      </section>
      {execution ? (
        <section className="mini-surface">
          <p className="eyebrow">Trace summary</p>
          <div className="stack-list">
            <div className="stack-list__item">
              <strong>Execution</strong>
              <p>{execution.executionId}</p>
            </div>
            <div className="stack-list__item">
              <strong>Trace</strong>
              <p>{execution.traceId}</p>
            </div>
            <div className="stack-list__item">
              <strong>Recorded spans</strong>
              <p>{spans.length}</p>
            </div>
            <div className="stack-list__item">
              <strong>Interventions in system</strong>
              <p>{controlPlane?.interventions.length ?? 0}</p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
