import type { PromotionEvent, SavedPlan } from '@agent-studio/contracts';

interface OptimizeAdvancedPanelProps {
  savedPlans: SavedPlan[];
  promotionHistory: PromotionEvent[];
}

export function OptimizeAdvancedPanel({ savedPlans, promotionHistory }: OptimizeAdvancedPanelProps) {
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
    </div>
  );
}
