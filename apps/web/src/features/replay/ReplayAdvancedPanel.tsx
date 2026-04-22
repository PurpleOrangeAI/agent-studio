import type { Replay } from '@agent-studio/contracts';

import type { ControlPlaneSystemState } from '../../app/control-plane';
import { getExecutionForRun, getExecutionSpans } from '../../app/control-plane';
import { formatSignedCreditsDelta, formatSignedDurationDelta, buildReplaySpanTree } from './replay-model';

interface ReplayAdvancedPanelProps {
  replay: Replay;
  controlPlane?: ControlPlaneSystemState | null;
}

export function ReplayAdvancedPanel({ replay, controlPlane }: ReplayAdvancedPanelProps) {
  const evidence = replay.operationalContext?.recommendationEvidence ?? [];
  const comparison = replay.operationalContext?.lastHealthyComparison;
  const execution = getExecutionForRun(controlPlane, replay.run.runId);
  const spans = getExecutionSpans(controlPlane, execution?.executionId);
  const spanTree = spans.length ? buildReplaySpanTree(spans) : null;

  return (
    <div className="advanced-grid">
      <section className="mini-surface">
        <p className="eyebrow">Evidence trail</p>
        {evidence.length ? (
          <div className="stack-list">
            {evidence.map((item) => (
              <div key={item.evidenceId} className="stack-list__item stack-list__item--body">
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No recommendation evidence recorded.</p>
        )}
      </section>
      <section className="mini-surface">
        <p className="eyebrow">Healthy comparison</p>
        {comparison ? (
          <div className="stack-list">
            <div className="stack-list__item stack-list__item--body">
              <strong>{comparison.label}</strong>
              <p>{comparison.summary}</p>
            </div>
            <div className="stack-list__item">
              <strong>Credit delta</strong>
              <p>{formatSignedCreditsDelta(comparison.creditsDelta)}</p>
            </div>
            <div className="stack-list__item">
              <strong>Duration delta</strong>
              <p>{formatSignedDurationDelta(comparison.durationDelta)}</p>
            </div>
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
          <p className="eyebrow">Trace breakdown</p>
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
              <strong>Root spans</strong>
              <p>{spanTree?.stats.rootCount ?? 0}</p>
            </div>
            <div className="stack-list__item">
              <strong>Nested handoffs</strong>
              <p>{spanTree?.stats.nestedSpanCount ?? 0}</p>
            </div>
            <div className="stack-list__item">
              <strong>Deepest chain</strong>
              <p>{spanTree?.stats.maxDepth ?? 0} levels</p>
            </div>
            <div className="stack-list__item">
              <strong>Failed spans</strong>
              <p>{spanTree?.stats.failedCount ?? 0}</p>
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
