interface OnboardingPanelProps {
  onDismiss: () => void;
}

const LOOP_STEPS = [
  {
    title: '1. Live',
    body: 'Inspect the current operating state and find the one signal that deserves attention.',
  },
  {
    title: '2. Replay',
    body: 'Explain exactly why a run broke or improved and identify the real decision point.',
  },
  {
    title: '3. Optimize',
    body: 'Compare the candidate against the healthy control and make the release call.',
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
            Studio is not where you author the workflow. It is where you operate the system, explain a run, and decide
            whether the next candidate should ship.
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
        <strong>Why rooms exist:</strong> they keep observing, diagnosing, and releasing separate so the operator loop
        stays fast and readable.
      </div>
    </section>
  );
}
