import type { PromotionEvent, SavedPlan } from '@agent-studio/contracts';

import type { ControlPlaneSystemState } from '../../app/control-plane';
import { getLatestEvaluation, getLatestReleaseDecision } from '../../app/control-plane';

interface OptimizeAdvancedPanelProps {
  savedPlans: SavedPlan[];
  promotionHistory: PromotionEvent[];
  controlPlane?: ControlPlaneSystemState | null;
}

export function OptimizeAdvancedPanel({ savedPlans, promotionHistory, controlPlane }: OptimizeAdvancedPanelProps) {
  const latestEvaluation = getLatestEvaluation(controlPlane);
  const latestRelease = getLatestReleaseDecision(controlPlane);

  return (
    <div className="advanced-grid">
      <section className="mini-surface">
        <p className="eyebrow">Saved plans</p>
        <div className="stack-list">
          {savedPlans.map((plan) => (
            <div key={plan.id} className="stack-list__item stack-list__item--body">
              <strong>{plan.name}</strong>
              <p>{plan.notes ?? 'No notes recorded.'}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="mini-surface">
        <p className="eyebrow">Promotion history</p>
        <div className="stack-list">
          {promotionHistory.map((promotion) => (
            <div key={promotion.eventId} className="stack-list__item stack-list__item--body">
              <strong>{promotion.mode}</strong>
              <p>{promotion.summary}</p>
            </div>
          ))}
        </div>
      </section>
      {latestEvaluation || latestRelease ? (
        <section className="mini-surface">
          <p className="eyebrow">Control-plane release audit</p>
          <div className="stack-list">
            {latestEvaluation ? (
              <div className="stack-list__item stack-list__item--body">
                <strong>{latestEvaluation.verdict}</strong>
                <p>{latestEvaluation.summary ?? 'No evaluation summary recorded.'}</p>
              </div>
            ) : null}
            {latestRelease ? (
              <div className="stack-list__item stack-list__item--body">
                <strong>{latestRelease.decision}</strong>
                <p>{latestRelease.summary ?? 'No release summary recorded.'}</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
