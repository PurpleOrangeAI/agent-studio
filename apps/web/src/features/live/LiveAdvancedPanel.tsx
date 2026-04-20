import type { Replay } from '@agent-studio/contracts';

import { formatCredits, formatDuration } from '../../app/format';

interface LiveAdvancedPanelProps {
  replay: Replay;
}

export function LiveAdvancedPanel({ replay }: LiveAdvancedPanelProps) {
  const directives = Object.entries(replay.studioState?.roleDirectives ?? {});
  const similarRuns = replay.operationalContext?.similarRuns ?? [];

  return (
    <div className="advanced-grid">
      <section className="mini-surface">
        <p className="eyebrow">Role directives</p>
        <div className="stack-list">
          {directives.map(([role, directive]) => (
            <div key={role} className="stack-list__item">
              <strong>{role}</strong>
              <span>
                {directive.mode}
                {directive.phases?.length ? ` · ${directive.phases.join(', ')}` : ''}
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="mini-surface">
        <p className="eyebrow">Nearby runs</p>
        <div className="stack-list">
          {similarRuns.map((run) => (
            <div key={run.runId} className="stack-list__item">
              <strong>{run.label}</strong>
              <span>
                {formatCredits(run.actualCredits)} · {formatDuration(run.durationMs)} · {(run.similarityScore * 100).toFixed(0)}%
                match
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
