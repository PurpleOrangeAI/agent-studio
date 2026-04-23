interface ConnectionModesPanelProps {
  systemName: string;
}

const CONNECTION_MODES = [
  {
    title: 'LangGraph adapter',
    status: 'Shipped',
    tone: 'ready',
    body: 'Best when you already run LangGraph and want Studio to ingest real threads, traces, and replay context without inventing another runtime.',
    steps: [
      'Map the deployed assistant or graph to a system in Agent Studio.',
      'Import traced runs so Live and Replay read real execution history.',
      'Use Optimize after you have evaluation or release evidence.',
    ],
  },
  {
    title: 'Generic control-plane ingest',
    status: 'Shipped',
    tone: 'ready',
    body: 'Best fallback for any custom multi-agent system. If your runtime can emit JSON, webhooks, or internal events, it can feed the control plane.',
    steps: [
      'Register the runtime and system home first.',
      'Send agents and topology to light up Live.',
      'Send executions and spans to light up Replay.',
      'Send interventions, evaluations, and releases to light up Optimize.',
    ],
  },
  {
    title: 'OpenHands adapter',
    status: 'Planned',
    tone: 'partial',
    body: 'Planned next. It belongs here because OpenHands users need the same registry, replay, and release loop once the control-plane contract is stable.',
    steps: [
      'Not shipped yet.',
      'Use generic ingest if you need to connect an OpenHands-style system today.',
    ],
  },
];

export function ConnectionModesPanel({ systemName }: ConnectionModesPanelProps) {
  return (
    <section className="mini-surface">
      <p className="eyebrow">Connection modes</p>
      <h3>Choose the path that matches your runtime</h3>
      <p className="muted">
        The goal is not to force <strong>{systemName}</strong> into a new framework. The goal is to get enough system,
        trace, and release data into Studio that the rooms become practical.
      </p>
      <div className="connection-mode-grid">
        {CONNECTION_MODES.map((mode) => (
          <article key={mode.title} className={`connection-mode-card connection-mode-card--${mode.tone}`}>
            <div className="connection-mode-card__header">
              <strong>{mode.title}</strong>
              <span className="meta-chip">{mode.status}</span>
            </div>
            <p>{mode.body}</p>
            <ul className="connection-mode-card__steps">
              {mode.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
