interface OnboardingPanelProps {
  onDismiss: () => void;
}

const LOOP_STEPS = [
  {
    title: '1. Live',
    body: 'Use Live to inspect the current operating state, current run, and where pressure is building.',
  },
  {
    title: '2. Replay',
    body: 'Use Replay to explain why a run succeeded or failed and which change actually moved outcome.',
  },
  {
    title: '3. Optimize',
    body: 'Use Optimize to compare a candidate, preserve the guardrails, and decide what should ship.',
  },
];

export function OnboardingPanel({ onDismiss }: OnboardingPanelProps) {
  return (
    <section className="surface onboarding-panel">
      <div className="onboarding-panel__header">
        <div>
          <p className="eyebrow">First run</p>
          <h2>How Agent Studio works</h2>
          <p className="muted">
            Rooms exist so the operator loop stays legible. You do not author the workflow here. You inspect the system,
            explain a run, then decide whether a candidate should be promoted.
          </p>
        </div>
        <button className="ghost-button" type="button" onClick={onDismiss}>
          Hide panel
        </button>
      </div>
      <div className="loop-grid">
        {LOOP_STEPS.map((step) => (
          <article key={step.title} className="loop-grid__card">
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </article>
        ))}
      </div>
      <div className="boundary-note">
        <strong>Why rooms exist:</strong> they separate observing the live system, understanding evidence, and making a
        release call. That keeps the seeded demo obvious and prevents the public app from collapsing into one noisy screen.
      </div>
    </section>
  );
}
