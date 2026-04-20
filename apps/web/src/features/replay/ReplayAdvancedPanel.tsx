import type { Replay } from '@agent-studio/contracts';

interface ReplayAdvancedPanelProps {
  replay: Replay;
}

export function ReplayAdvancedPanel({ replay }: ReplayAdvancedPanelProps) {
  const evidence = replay.operationalContext?.recommendationEvidence ?? [];
  const comparison = replay.operationalContext?.lastHealthyComparison;

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
    </div>
  );
}
