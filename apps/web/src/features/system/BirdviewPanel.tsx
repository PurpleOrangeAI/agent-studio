import type { ControlPlaneStorageInfo, ControlPlaneSystemState } from '../../app/control-plane';
import { summarizeSystemReadiness } from '../../app/control-plane';

interface BirdviewPanelProps {
  systemState: ControlPlaneSystemState | null;
  storage: ControlPlaneStorageInfo | null;
}

const VALUE_GAPS = [
  {
    title: 'Runtimes show execution, not operator judgment',
    body: 'Your framework can run agents. It usually does not tell you which system is under pressure or what should change before the next release.',
  },
  {
    title: 'Tracing explains one run, not the whole fleet',
    body: 'Trace tools help debug a path. Operators still need the system registry, hot agents, directives, replay context, and release evidence in one loop.',
  },
  {
    title: 'Evals score candidates, but they do not run the room',
    body: 'Evaluation tools help compare outcomes. They rarely become the place where you manage the live system, inspect the break, and decide whether to ship.',
  },
];

const BEST_FITS = [
  'You run more than one agent and the system is already hard to reason about from logs alone.',
  'You have repeated regressions, rising costs, or unstable release decisions.',
  'You want one control room that can work across runtimes instead of locking into one framework dashboard.',
];

const NOT_FOR = [
  'Single-prompt toys with no real topology or release loop.',
  'Teams that only want raw tracing and never compare or release candidates.',
];

export function BirdviewPanel({ systemState, storage }: BirdviewPanelProps) {
  const readiness = summarizeSystemReadiness(systemState);
  const systemName = systemState?.system.name ?? 'your system';
  const evolutionSteps = [
    {
      title: '1. Register',
      body: 'Create the durable system home.',
      ready: readiness.completedSteps >= 1,
    },
    {
      title: '2. Model',
      body: 'Add agents and topology so Live stops being decorative.',
      ready: readiness.agentCount > 0 && readiness.hasTopology,
    },
    {
      title: '3. Trace',
      body: 'Send executions and spans so Replay becomes trustworthy.',
      ready: readiness.executionCount > 0 && readiness.spanCount > 0,
    },
    {
      title: '4. Evaluate',
      body: 'Add interventions, evaluations, and release evidence so Optimize becomes real.',
      ready: readiness.evaluationCount > 0 || readiness.releaseCount > 0,
    },
    {
      title: '5. Automate carefully',
      body: 'Only after the evidence loop is healthy should the product recommend or apply changes automatically.',
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
            Agent Studio is useful when the runtime alone is no longer enough. It turns the live system, replayed
            failures, and release evidence into one operating loop for <strong>{systemName}</strong>.
          </p>
        </div>
        <span className="meta-chip">{readiness.stageLabel}</span>
      </div>

      <div className="birdview-grid">
        <section className="mini-surface">
          <p className="eyebrow">Why now</p>
          <h3>Where current tools stop</h3>
          <div className="guide-stack">
            {VALUE_GAPS.map((item) => (
              <article key={item.title} className="guide-step guide-step--ready">
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mini-surface">
          <p className="eyebrow">Best fit</p>
          <h3>Who this is for</h3>
          <div className="guide-stack">
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
          <div className="guide-stack">
            {evolutionSteps.map((step) => (
              <article key={step.title} className={`guide-step ${step.ready ? 'guide-step--ready' : 'guide-step--pending'}`}>
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
    </section>
  );
}
