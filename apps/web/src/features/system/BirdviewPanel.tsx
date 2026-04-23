import type { ControlPlaneStorageInfo, ControlPlaneSystemState } from '../../app/control-plane';
import { summarizeSystemReadiness } from '../../app/control-plane';

interface BirdviewPanelProps {
  systemState: ControlPlaneSystemState | null;
  storage: ControlPlaneStorageInfo | null;
}

const VALUE_GAPS = [
  {
    title: 'Runtimes execute',
    body: 'Frameworks run agents, but they usually do not tell an operator which system is under pressure or what should change next.',
  },
  {
    title: 'Tracing isolates one path',
    body: 'Trace tools explain a run. They rarely become the room where registry, directives, replay, and release evidence come together.',
  },
  {
    title: 'Evals score',
    body: 'Evaluation tools compare outcomes, but they do not usually become the daily place where people manage live multi-agent systems.',
  },
];

const BEST_FITS = [
  'More than one agent and the topology is already hard to reason about from logs alone.',
  'Repeated regressions, rising cost, or release decisions that still feel shaky.',
  'Need one operator surface across runtimes instead of living inside one framework dashboard.',
];

const NOT_FOR = [
  'Single-prompt toys with no real topology or release loop.',
  'Teams that only want raw tracing and never compare, intervene, or release.',
];

export function BirdviewPanel({ systemState, storage }: BirdviewPanelProps) {
  const readiness = summarizeSystemReadiness(systemState);
  const systemName = systemState?.system.name ?? 'your system';
  const evolutionSteps = [
    {
      title: 'Register',
      body: 'Create the durable system home.',
      ready: readiness.completedSteps >= 1,
    },
    {
      title: 'Model',
      body: 'Add agents and topology so Live stops being decorative.',
      ready: readiness.agentCount > 0 && readiness.hasTopology,
    },
    {
      title: 'Trace',
      body: 'Send executions and spans so Replay becomes trustworthy.',
      ready: readiness.executionCount > 0 && readiness.spanCount > 0,
    },
    {
      title: 'Evaluate',
      body: 'Add interventions, evaluations, and release evidence so Optimize becomes real.',
      ready: readiness.evaluationCount > 0 || readiness.releaseCount > 0,
    },
    {
      title: 'Automate carefully',
      body: 'Only after the loop is healthy should the product recommend or apply changes automatically.',
      ready: readiness.stageId === 'operational',
    },
  ];

  return (
    <section className="surface birdview-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Birdview</p>
          <h2>Why Agent Studio is needed</h2>
          <p className="muted">
            Agent Studio is useful when the runtime alone is no longer enough. It turns live pressure, replayed
            failures, and release evidence into one operating loop for <strong>{systemName}</strong>.
          </p>
        </div>
        <span className="meta-chip">{readiness.stageLabel}</span>
      </div>

      <div className="birdview-grid birdview-grid--elevated">
        <section className="mini-surface birdview-featured">
          <div className="birdview-featured__header">
            <div className="brand-lockup brand-lockup--panel">
              <span className="brand-lockup__mark" aria-hidden="true">
                <span className="brand-lockup__mark-core" />
              </span>
              <div className="brand-lockup__copy">
                <span className="brand-lockup__name">Purple Orange AI</span>
                <span className="brand-lockup__tag">Control plane for multi-agent systems</span>
              </div>
            </div>
            <span className="hero__brand-pill hero__brand-pill--panel">Operate. Replay. Release.</span>
          </div>
          <div className="birdview-featured__copy">
            <h3>One room for live pressure, replay, and release.</h3>
            <p>
              The point is not to replace your runtime. The point is to give operators one place to see what is live,
              what broke, and what should ship next.
            </p>
          </div>
          <div className="birdview-card-grid">
            {VALUE_GAPS.map((item) => (
              <article key={item.title} className="guide-step guide-step--ready birdview-card">
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="birdview-stack">
          <section className="mini-surface">
            <p className="eyebrow">Best fit</p>
            <h3>Who this is for</h3>
            <div className="birdview-fit-grid">
              {BEST_FITS.map((item) => (
                <article key={item} className="guide-step guide-step--ready">
                  <strong>Useful when</strong>
                  <p>{item}</p>
                </article>
              ))}
              {NOT_FOR.map((item) => (
                <article key={item} className="guide-step guide-step--partial">
                  <strong>Not the target</strong>
                  <p>{item}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mini-surface">
            <p className="eyebrow">Evolution</p>
            <h3>How the product compounds</h3>
            <div className="evolution-rail">
              {evolutionSteps.map((step, index) => (
                <article
                  key={step.title}
                  className={`evolution-step ${step.ready ? 'evolution-step--ready' : 'evolution-step--pending'}`}
                >
                  <span className="evolution-step__index">0{index + 1}</span>
                  <strong>{step.title}</strong>
                  <p>{step.body}</p>
                </article>
              ))}
            </div>
            <div className="boundary-note boundary-note--soft">
              <strong>Current next step:</strong> {readiness.title}. <strong>Storage:</strong>{' '}
              {storage?.persistenceEnabled ? 'persistent' : 'ephemeral'} {storage?.mode ?? 'unknown'} store.
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
