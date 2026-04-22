import type { ControlPlaneState, ControlPlaneSystemState } from '../../app/control-plane';

interface OnboardingPanelProps {
  onDismiss: () => void;
  controlPlaneState?: ControlPlaneState | null;
  systemState?: ControlPlaneSystemState | null;
  runtimeLabel?: string | null;
}

const OPERATOR_STEPS = [
  {
    title: '1. Register the runtime',
    body: 'Post a runtime and system first so Studio has a durable home for your agent network.',
  },
  {
    title: '2. Ingest real traces',
    body: 'Send agents, topology, executions, spans, and metrics so Live and Replay stop guessing.',
  },
  {
    title: '3. Tune and release',
    body: 'Use interventions, evaluations, and release decisions to make Studio an operating surface instead of a viewer.',
  },
];

export function OnboardingPanel({ onDismiss, controlPlaneState, systemState, runtimeLabel }: OnboardingPanelProps) {
  const spanCount = Object.values(systemState?.executionSpans ?? {}).reduce((total, spans) => total + spans.length, 0);
  const ingestChecks = [
    { label: 'Runtimes', value: controlPlaneState?.runtimes.length ?? 0 },
    { label: 'Systems', value: controlPlaneState?.systems.length ?? 0 },
    { label: 'Agents', value: systemState?.agents.length ?? 0 },
    { label: 'Topology', value: systemState?.topology ? 1 : 0 },
    { label: 'Executions', value: systemState?.executions.length ?? 0 },
    { label: 'Spans', value: spanCount },
    { label: 'Interventions', value: systemState?.interventions.length ?? 0 },
    { label: 'Releases', value: systemState?.releases.length ?? 0 },
  ];

  return (
    <section className="surface onboarding-panel">
      <div className="onboarding-panel__header">
        <div>
          <p className="eyebrow">First run</p>
          <h2>Connect your own multi-agent system</h2>
          <p className="muted">
            Agent Studio is not where you author the runtime. It is where you register the system, verify ingest health,
            operate traces, and decide what should change next.
          </p>
        </div>
        <button className="ghost-button" type="button" onClick={onDismiss}>
          Hide panel
        </button>
      </div>
      <div className="loop-grid">
        {OPERATOR_STEPS.map((step) => (
          <article key={step.title} className="loop-grid__card">
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </article>
        ))}
      </div>
      <div className="ingest-grid">
        {ingestChecks.map((check) => (
          <article key={check.label} className={`ingest-card ${check.value > 0 ? 'ingest-card--ready' : 'ingest-card--thin'}`}>
            <span>{check.label}</span>
            <strong>{check.value}</strong>
          </article>
        ))}
      </div>
      <div className="boundary-note">
        <strong>Current connection path:</strong> POST to the `/api/control/ingest/*` routes for runtimes, systems,
        agents, topology, executions, spans, metrics, interventions, evaluations, and releases. The seeded demo is
        currently loaded as <strong>{systemState?.system.name ?? 'the demo system'}</strong>
        {runtimeLabel ? (
          <>
            {' '}
            on <strong>{runtimeLabel}</strong>
          </>
        ) : null}
        .
      </div>
    </section>
  );
}
