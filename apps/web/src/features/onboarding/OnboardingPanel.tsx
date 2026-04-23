import type { ControlPlaneState, ControlPlaneSystemState } from '../../app/control-plane';
import { summarizeSystemReadiness } from '../../app/control-plane';
import type { ViewId } from '../../app/routes';

interface OnboardingPanelProps {
  onDismiss: () => void;
  onOpenConnect: () => void;
  onOpenOverview: () => void;
  controlPlaneState?: ControlPlaneState | null;
  systemState?: ControlPlaneSystemState | null;
  runtimeLabel?: string | null;
  currentView: ViewId;
}

const MANAGEMENT_STEPS = [
  {
    title: 'Overview',
    body: 'Choose the system, watch fleet pressure, and pick the hot agent before you dive deeper.',
  },
  {
    title: 'Live',
    body: 'Use Live for the active topology, current pressure, and the directives already affecting the system.',
  },
  {
    title: 'Replay',
    body: 'Use Replay once executions and spans exist. That is where the failing path becomes clear enough to act on.',
  },
  {
    title: 'Optimize',
    body: 'Use Optimize for interventions, evaluations, and release decisions. It is not the place to guess.',
  },
];

export function OnboardingPanel({
  onDismiss,
  onOpenConnect,
  onOpenOverview,
  controlPlaneState,
  systemState,
  runtimeLabel,
  currentView,
}: OnboardingPanelProps) {
  const readiness = summarizeSystemReadiness(systemState);
  const systemName = systemState?.system.name ?? 'your imported system';
  const compactMode = readiness.stageId === 'operational' && currentView !== 'connect';
  const roomGuide = readiness.roomReadiness.filter((room) => room.roomId !== 'overview');
  const connectionSteps = [
    {
      title: '1. Create the system home',
      body: 'Register a runtime and system so Studio has a durable place to attach agents and traces.',
      ready: readiness.completedSteps >= 1,
    },
    {
      title: '2. Add agents and topology',
      body: 'Ingest the roster and topology so Studio knows who is in the system and how work flows between them.',
      ready: readiness.agentCount > 0 && readiness.hasTopology,
    },
    {
      title: '3. Send executions and spans',
      body: 'Replay only becomes trustworthy when executions, spans, and metrics come from the real runtime.',
      ready: readiness.executionCount > 0 && readiness.spanCount > 0,
    },
    {
      title: '4. Add evaluation and release evidence',
      body: 'Optimize needs evaluations or release decisions before it can become a real workbench.',
      ready: readiness.evaluationCount > 0 || readiness.releaseCount > 0,
    },
  ];

  if (compactMode) {
    return (
      <section className="surface onboarding-panel onboarding-panel--compact">
        <div className="onboarding-panel__header">
          <div>
            <p className="eyebrow">Operator guide</p>
            <h2>Operate the system, then come back to Connect only when evidence changes</h2>
            <p className="muted">
              <strong>{systemName}</strong> is already far enough along that the core job is operating the loop, not
              reading setup instructions.
            </p>
          </div>
          <button className="ghost-button" type="button" onClick={onDismiss}>
            Hide panel
          </button>
        </div>

        <div className="inline-callout inline-callout--success">
          <span className="eyebrow">Current next step</span>
          <p>
            <strong>{readiness.title}</strong> {readiness.body}
          </p>
          <div className="guide-actions">
            <button className="control-strip__primary" type="button" onClick={onOpenOverview}>
              Open Overview
            </button>
            <button className="ghost-button" type="button" onClick={onOpenConnect}>
              Open Connect
            </button>
            <span className="meta-chip">
              {readiness.completedSteps}/{readiness.totalSteps} stages ready
            </span>
          </div>
        </div>

        <div className="onboarding-rail">
          {roomGuide.map((room) => (
            <article key={room.roomId} className={`onboarding-rail__card onboarding-rail__card--${room.state}`}>
              <div className="guide-step__header">
                <strong>{room.roomId.charAt(0).toUpperCase() + room.roomId.slice(1)}</strong>
                <span className="meta-chip">{room.label}</span>
              </div>
              <p>{room.detail}</p>
            </article>
          ))}
        </div>

        <div className="boundary-note">
          <strong>Current system:</strong> {systemName}
          {runtimeLabel ? (
            <>
              {' '}
              on <strong>{runtimeLabel}</strong>
            </>
          ) : null}
          . <strong>Storage:</strong>{' '}
          {controlPlaneState?.storage.mode === 'blob'
            ? 'persistent hosted control-plane store'
            : controlPlaneState?.storage.mode === 'file'
              ? 'persistent file-backed registry'
              : 'ephemeral in-memory demo store'}
          .
        </div>
      </section>
    );
  }

  return (
    <section className="surface onboarding-panel">
      <div className="onboarding-panel__header">
        <div>
          <p className="eyebrow">Operator guide</p>
          <h2>Connect, operate, and improve a real agent system</h2>
          <p className="muted">
            Agent Studio does not replace your runtime. It becomes useful when you register the system, ingest the real
            roster and traces, and use the rooms in the right order.
          </p>
        </div>
        <button className="ghost-button" type="button" onClick={onDismiss}>
          Hide panel
        </button>
      </div>

      <div className="inline-callout inline-callout--success">
        <span className="eyebrow">Current next step</span>
        <p>
          <strong>{readiness.title}</strong> {readiness.body}
        </p>
        <div className="guide-actions">
          <button className="control-strip__primary" type="button" onClick={onOpenConnect}>
            Open Connect
          </button>
          <button className="ghost-button" type="button" onClick={onOpenOverview}>
            Open Overview
          </button>
          <span className="meta-chip">
            {readiness.completedSteps}/{readiness.totalSteps} stages ready
          </span>
        </div>
      </div>

      <div className="guide-grid">
        <section className="mini-surface">
          <p className="eyebrow">Fastest path</p>
          <h3>What to connect first</h3>
          <div className="guide-stack">
            {connectionSteps.map((step) => (
              <article key={step.title} className={`guide-step ${step.ready ? 'guide-step--ready' : 'guide-step--pending'}`}>
                <strong>{step.title}</strong>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mini-surface">
          <p className="eyebrow">Room requirements</p>
          <h3>What each room needs</h3>
          <div className="guide-stack">
            {readiness.roomReadiness.map((room) => (
              <article key={room.roomId} className={`guide-step guide-step--${room.state}`}>
                <div className="guide-step__header">
                  <strong>{room.roomId.charAt(0).toUpperCase() + room.roomId.slice(1)}</strong>
                  <span className="meta-chip">{room.label}</span>
                </div>
                <p>{room.detail}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      {currentView !== 'connect' ? (
        <div className="loop-grid">
          {MANAGEMENT_STEPS.map((step) => (
            <article key={step.title} className="loop-grid__card">
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="inline-callout">
          <span className="eyebrow">Connect focus</span>
          <p>
            Stay here only long enough to register the next missing layer. Once the system home, roster, traces, or
            release evidence land, move back into Overview, Live, Replay, or Optimize to operate the system instead of
            the import form.
          </p>
        </div>
      )}

      <div className="boundary-note">
        <strong>Current system:</strong> {systemName}
        {runtimeLabel ? (
          <>
            {' '}
            on <strong>{runtimeLabel}</strong>
          </>
        ) : null}
        . <strong>Current stage:</strong> {readiness.stageLabel}. <strong>Storage:</strong>{' '}
        {controlPlaneState?.storage.mode === 'blob'
          ? 'persistent hosted control-plane store'
          : controlPlaneState?.storage.mode === 'file'
            ? 'persistent file-backed registry'
            : 'ephemeral in-memory demo store'}
        .
      </div>
    </section>
  );
}
