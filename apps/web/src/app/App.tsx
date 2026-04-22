import { startTransition, useEffect, useState } from 'react';

import { loadControlPlaneState, type ControlPlaneState } from './control-plane';
import { loadDemoState, type DemoState } from './demo';
import { formatCredits, formatDuration, titleCaseStatus } from './format';
import { RoomShell } from './RoomShell';
import { LiveAdvancedPanel } from '../features/live/LiveAdvancedPanel';
import { LivePanel } from '../features/live/LivePanel';
import { OnboardingPanel } from '../features/onboarding/OnboardingPanel';
import { OptimizeAdvancedPanel } from '../features/optimize/OptimizeAdvancedPanel';
import { OptimizePanel } from '../features/optimize/OptimizePanel';
import { ReplayAdvancedPanel } from '../features/replay/ReplayAdvancedPanel';
import { ReplayPanel } from '../features/replay/ReplayPanel';

type RoomId = 'live' | 'replay' | 'optimize';

type ControlLoopCue = {
  eyebrow: string;
  title: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

const ROOM_LABELS: Record<
  RoomId,
  {
    title: string;
    summary: string;
    path: string;
  }
> = {
  live: {
    title: 'Live',
    summary: 'Operate the current system',
    path: 'Observe',
  },
  replay: {
    title: 'Replay',
    summary: 'Explain the last run',
    path: 'Explain',
  },
  optimize: {
    title: 'Optimize',
    summary: 'Test and release changes',
    path: 'Release',
  },
};

const ONBOARDING_STORAGE_KEY = 'agent-studio-demo-onboarding-dismissed';

function getInitialOnboardingState() {
  if (typeof window === 'undefined') {
    return true;
  }

  try {
    return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) !== 'true';
  } catch {
    return true;
  }
}

const ROOM_COPY: Record<
  RoomId,
  {
    eyebrow: string;
    title: string;
    body: string;
    items: string[];
    advancedEyebrow: string;
    advancedTitle: string;
    advancedBody: string;
    openLabel: string;
    closeLabel: string;
  }
> = {
  live: {
    eyebrow: 'Operator loop',
    title: 'Operate the workflow first. Intervene only where the live run shows pressure.',
    body: 'Live is for the current system state: the active run, workflow map, and next move that matters.',
    items: [
      'Start from the latest healthy run instead of reading every historical panel.',
      'Use Replay when the current state stops making sense.',
      'Use Optimize only after the evidence is clear.',
    ],
    advancedEyebrow: 'Advanced live controls',
    advancedTitle: 'Role directives and neighboring runs',
    advancedBody: 'Useful once the default live picture is not enough.',
    openLabel: 'Show advanced live',
    closeLabel: 'Hide advanced live',
  },
  replay: {
    eyebrow: 'Debug and decide',
    title: 'Replay should explain the run clearly enough that the next change becomes obvious.',
    body: 'Use the failed or weak run as the center of gravity, then decide what should be tested next.',
    items: [
      'Find the break before you read the longer history.',
      'Compare against the healthy control, not against theory.',
      'Turn the finding into a candidate change.',
    ],
    advancedEyebrow: 'Advanced replay controls',
    advancedTitle: 'Evidence and historical drift',
    advancedBody: 'These details stay available without crowding the default replay path.',
    openLabel: 'Show advanced replay',
    closeLabel: 'Hide advanced replay',
  },
  optimize: {
    eyebrow: 'Release path',
    title: 'Compare the candidate, preserve the guardrails, then decide whether it should ship.',
    body: 'Optimize is for release decisions. The public demo only needs one strong candidate and one clear promotion story.',
    items: [
      'Start with the saved candidate instead of raw overrides.',
      'Read the release call before opening the lab.',
      'Close the loop back into the next live run.',
    ],
    advancedEyebrow: 'Advanced optimize controls',
    advancedTitle: 'Saved plans and promotion history',
    advancedBody: 'Deeper release history for users who want to inspect the path that led to promotion.',
    openLabel: 'Show advanced optimize',
    closeLabel: 'Hide advanced optimize',
  },
};

export function App() {
  const [demoState, setDemoState] = useState<DemoState | null>(null);
  const [controlPlaneState, setControlPlaneState] = useState<ControlPlaneState | null>(null);
  const [runtimeId, setRuntimeId] = useState<string>('demo');
  const [workflowId, setWorkflowId] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<RoomId>('live');
  const [showOnboarding, setShowOnboarding] = useState(getInitialOnboardingState);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState<Record<RoomId, boolean>>({
    live: false,
    replay: false,
    optimize: false,
  });

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([loadDemoState(), loadControlPlaneState()])
      .then(([demoResult, controlPlaneResult]) => {
        if (cancelled) {
          return;
        }

        if (demoResult.status === 'rejected') {
          setLoadError(demoResult.reason instanceof Error ? demoResult.reason.message : 'Failed to load demo state.');
          return;
        }

        startTransition(() => {
          setDemoState(demoResult.value);
          setRuntimeId(demoResult.value.runtimeOptions[0]?.id ?? 'demo');
          setWorkflowId((current) =>
            current && demoResult.value.workflowStates[current] ? current : demoResult.value.defaultWorkflowId,
          );
          setControlPlaneState(controlPlaneResult.status === 'fulfilled' ? controlPlaneResult.value : null);
          setLoadError(null);
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return (
      <main className="app-shell">
        <div className="app-shell__backdrop" />
        <div className="app-shell__content">
          <section className="surface overview-panel" role="alert">
            <div className="section-header">
              <div>
                <p className="eyebrow">API unavailable</p>
                <h1>Agent Studio</h1>
              </div>
            </div>
            <p>{loadError}</p>
          </section>
        </div>
      </main>
    );
  }

  if (!demoState || !workflowId) {
    return (
      <main className="app-shell">
        <div className="app-shell__backdrop" />
        <div className="app-shell__content">
          <section className="surface overview-panel" aria-busy="true">
            <div className="section-header">
              <div>
                <p className="eyebrow">Loading demo</p>
                <h1>Agent Studio</h1>
              </div>
            </div>
            <p>Reading the seeded workflow from the API.</p>
          </section>
        </div>
      </main>
    );
  }

  const selectedWorkflowState =
    demoState.workflowStates[workflowId] ?? demoState.workflowStates[demoState.defaultWorkflowId];
  const workflow = selectedWorkflowState.workflow;
  const liveRun = selectedWorkflowState.live.run;
  const replayRun = selectedWorkflowState.replay.run;
  const failedReplayStep =
    selectedWorkflowState.replay.replay.stepExecutions.find((step) => step.status === 'failed') ??
    selectedWorkflowState.replay.replay.stepExecutions[0];
  const candidateRun = selectedWorkflowState.optimize.candidateRun;
  const candidateCreditsDelta = (candidateRun.actualCredits ?? 0) - (selectedWorkflowState.optimize.baselineRun.actualCredits ?? 0);
  const candidateDurationDeltaSeconds = Math.round(
    ((candidateRun.durationMs ?? 0) - (selectedWorkflowState.optimize.baselineRun.durationMs ?? 0)) / 1000,
  );
  const selectedRuntime = demoState.runtimeOptions.find((option) => option.id === runtimeId);
  const selectedControlPlaneSystem = controlPlaneState?.systemsByWorkflowId[workflow.workflowId] ?? null;

  const controlLoopCue: ControlLoopCue =
    selectedRoom === 'live'
      ? {
          eyebrow: 'Control loop',
          title: 'Next: open Replay',
          body: `${replayRun.experimentLabel} is the clearest weak run in the loop. Use Replay to confirm what broke before you tune anything else.`,
          primaryLabel: 'Open Replay',
          onPrimary: () => setSelectedRoom('replay'),
          secondaryLabel: failedReplayStep?.title ? `Focus ${failedReplayStep.title}` : undefined,
          onSecondary: failedReplayStep?.title ? () => setSelectedRoom('replay') : undefined,
        }
      : selectedRoom === 'replay'
        ? {
            eyebrow: 'Control loop',
            title: 'Next: test the fix in Optimize',
            body: `Replay already identified the break. Move into Optimize and pressure-test ${candidateRun.experimentLabel} against the healthy control.`,
            primaryLabel: 'Open Optimize',
            onPrimary: () => setSelectedRoom('optimize'),
            secondaryLabel: 'Back to Live',
            onSecondary: () => setSelectedRoom('live'),
          }
        : {
            eyebrow: 'Control loop',
            title: 'Next: validate the promoted system in Live',
            body: `${candidateRun.experimentLabel} looks strong enough to ship. Move back to Live and confirm the loop still feels healthy after the release call.`,
            primaryLabel: 'Open Live',
            onPrimary: () => setSelectedRoom('live'),
            secondaryLabel: 'Re-open Replay',
            onSecondary: () => setSelectedRoom('replay'),
          };

  function dismissOnboarding() {
    setShowOnboarding(false);

    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch {
      // Ignore storage errors in demo mode.
    }
  }

  function toggleAdvanced(room: RoomId) {
    setAdvancedOpen((current) => ({
      ...current,
      [room]: !current[room],
    }));
  }

  return (
    <main className="app-shell">
      <div className="app-shell__backdrop" />
      <div className="app-shell__content">
        <header className="hero surface">
          <div className="hero__copy">
            <p className="eyebrow">Public demo</p>
            <h1>Agent Studio</h1>
            <p className="hero__lede">
              A seeded control room for agent workflows. The shell should tell you what state the system is in, what
              changed, and whether the next candidate deserves to ship.
            </p>
            <div className="hero__current-state">
              <div className="hero__state-copy">
                <span className="hero__state-label">Current state</span>
                <strong>{workflow.name}</strong>
                <p>{workflow.description}</p>
              </div>
              <div className="hero__state-line">
                <span className={`status-pill status-pill--${liveRun.status}`}>{titleCaseStatus(liveRun.status)}</span>
                <span className="meta-chip">Replay focus: {failedReplayStep?.title ?? 'Healthy control'}</span>
                <span className="meta-chip">Candidate: {candidateRun.experimentLabel}</span>
              </div>
            </div>
          </div>
          <div className="hero__console">
            <div className="hero__controls" aria-label="Demo controls">
              <div className="hero__controls-header">
                <div>
                  <p className="eyebrow">Command surface</p>
                  <h2>Runtime and workflow</h2>
                </div>
                <span className="meta-chip">Demo operator view</span>
              </div>
              <label className="select-field">
                <span>Runtime</span>
                <select aria-label="Runtime" value={runtimeId} onChange={(event) => setRuntimeId(event.target.value)}>
                  {demoState.runtimeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <small>{selectedRuntime?.detail}</small>
              </label>
              <label className="select-field">
                <span>Workflow</span>
                <select aria-label="Workflow" value={workflowId} onChange={(event) => setWorkflowId(event.target.value)}>
                  {demoState.workflows.map((option) => (
                    <option key={option.workflowId} value={option.workflowId}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <small>{workflow.description}</small>
              </label>
            </div>
            <div className="hero__status-grid">
              <article className="hero-signal hero-signal--live">
                <span className="hero-signal__label">Live posture</span>
                <strong>{titleCaseStatus(liveRun.status)}</strong>
                <p>{liveRun.experimentLabel}</p>
                <div className="hero-signal__meta">
                  <span>{formatCredits(liveRun.actualCredits)}</span>
                  <span>{formatDuration(liveRun.durationMs)}</span>
                </div>
              </article>
              <article className="hero-signal hero-signal--replay">
                <span className="hero-signal__label">Replay pressure</span>
                <strong>{failedReplayStep?.title ?? 'No failing step'}</strong>
                <p>{failedReplayStep?.error ?? failedReplayStep?.summary ?? 'The latest run is healthy.'}</p>
                <div className="hero-signal__meta">
                  <span>{titleCaseStatus(replayRun.status)}</span>
                  <span>{formatCredits(replayRun.actualCredits)}</span>
                </div>
              </article>
              <article className="hero-signal hero-signal--optimize">
                <span className="hero-signal__label">Release call</span>
                <strong>{candidateCreditsDelta < 0 ? `${Math.abs(candidateCreditsDelta)} credits leaner` : 'Guardrails preserved'}</strong>
                <p>{selectedWorkflowState.optimize.promotionSummary}</p>
                <div className="hero-signal__meta">
                  <span>{candidateDurationDeltaSeconds < 0 ? `${Math.abs(candidateDurationDeltaSeconds)}s faster` : 'No speed gain'}</span>
                  <span>{selectedWorkflowState.optimize.candidatePlan?.name ?? 'Saved plan'}</span>
                </div>
              </article>
            </div>
          </div>
        </header>

        {showOnboarding ? <OnboardingPanel onDismiss={dismissOnboarding} /> : null}

        <section className="surface overview-panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">Control loop</p>
              <h2>Live, Replay, Optimize</h2>
              <p className="muted overview-panel__body">One operating loop: inspect the live system, explain the weak run, then ship a safer candidate.</p>
            </div>
            <span className="meta-chip">Demo mode only</span>
          </div>
          <div className="overview-grid">
            <article className="overview-card overview-card--live">
              <div className="overview-card__header">
                <div>
                  <p className="eyebrow">01 · Live</p>
                  <h3>{selectedWorkflowState.live.run.experimentLabel}</h3>
                </div>
                <span className={`status-pill status-pill--${selectedWorkflowState.live.run.status}`}>
                  {titleCaseStatus(selectedWorkflowState.live.run.status)}
                </span>
              </div>
              <p className="overview-card__summary">Operate the current system before you touch history or overrides.</p>
              <div className="overview-card__metric">
                <span>Current workflow</span>
                <strong>{workflow.name}</strong>
              </div>
              <div className="overview-card__path">
                <span>{formatCredits(selectedWorkflowState.live.run.actualCredits)}</span>
                <span>{formatDuration(selectedWorkflowState.live.run.durationMs)}</span>
              </div>
            </article>
            <article className="overview-card overview-card--replay">
              <div className="overview-card__header">
                <div>
                  <p className="eyebrow">02 · Replay</p>
                  <h3>{selectedWorkflowState.replay.run.experimentLabel}</h3>
                </div>
                <span className={`status-pill status-pill--${selectedWorkflowState.replay.run.status}`}>
                  {titleCaseStatus(selectedWorkflowState.replay.run.status)}
                </span>
              </div>
              <p className="overview-card__summary">Find the exact break and turn it into the next fix, not another theory.</p>
              <div className="overview-card__metric overview-card__metric--warning">
                <span>Pressure point</span>
                <strong>{failedReplayStep?.title ?? 'No failed step recorded'}</strong>
              </div>
              <div className="overview-card__path">
                <span>{failedReplayStep?.assignedRole ?? 'reviewer'}</span>
                <span>{formatCredits(selectedWorkflowState.replay.run.actualCredits)}</span>
              </div>
            </article>
            <article className="overview-card overview-card--optimize">
              <div className="overview-card__header">
                <div>
                  <p className="eyebrow">03 · Optimize</p>
                  <h3>{selectedWorkflowState.optimize.candidateRun.experimentLabel}</h3>
                </div>
                <span className="status-pill status-pill--succeeded">Promotion-ready</span>
              </div>
              <p className="overview-card__summary">Compare the candidate against the healthy control and only ship what clearly improves the loop.</p>
              <div className="overview-card__metric overview-card__metric--success">
                <span>Release delta</span>
                <strong>{candidateCreditsDelta < 0 ? `${Math.abs(candidateCreditsDelta)} credits saved` : 'Stable quality retained'}</strong>
              </div>
              <div className="overview-card__path">
                <span>{selectedWorkflowState.optimize.candidatePlan?.name ?? 'Saved plan'}</span>
                <span>{candidateDurationDeltaSeconds < 0 ? `${Math.abs(candidateDurationDeltaSeconds)}s faster` : 'No speed gain'}</span>
              </div>
            </article>
          </div>
        </section>

        <section className="room-nav surface">
          <div className="room-nav__intro">
            <p className="eyebrow">Room switcher</p>
            <h2>Move through one mode at a time</h2>
            <p className="muted">The mode switcher is the operating rhythm: observe, explain, release.</p>
          </div>
          <div className="room-nav__buttons" role="tablist" aria-label="Room switcher">
            {(['live', 'replay', 'optimize'] as RoomId[]).map((room) => (
              <button
                key={room}
                type="button"
                role="tab"
                aria-label={ROOM_LABELS[room].title}
                aria-selected={selectedRoom === room}
                className={`room-tab ${selectedRoom === room ? 'room-tab--active' : ''}`}
                onClick={() => setSelectedRoom(room)}
              >
                <span className="room-tab__path">{ROOM_LABELS[room].path}</span>
                <strong>{ROOM_LABELS[room].title}</strong>
                <small>{ROOM_LABELS[room].summary}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="control-strip surface">
          <div className="control-strip__copy">
            <p className="eyebrow">{controlLoopCue.eyebrow}</p>
            <h2>{controlLoopCue.title}</h2>
            <p className="muted">{controlLoopCue.body}</p>
          </div>
          <div className="control-strip__actions">
            <button type="button" className="control-strip__primary" onClick={controlLoopCue.onPrimary}>
              {controlLoopCue.primaryLabel}
            </button>
            {controlLoopCue.secondaryLabel && controlLoopCue.onSecondary ? (
              <button type="button" className="ghost-button" onClick={controlLoopCue.onSecondary}>
                {controlLoopCue.secondaryLabel}
              </button>
            ) : null}
          </div>
        </section>

        {selectedRoom === 'live' ? (
          <RoomShell
            roomId="live"
            eyebrow={ROOM_COPY.live.eyebrow}
            title={ROOM_COPY.live.title}
            body={ROOM_COPY.live.body}
            items={ROOM_COPY.live.items}
            advanced={<LiveAdvancedPanel replay={selectedWorkflowState.live.replay} />}
            showAdvanced={advancedOpen.live}
            onToggleAdvanced={() => toggleAdvanced('live')}
            advancedEyebrow={ROOM_COPY.live.advancedEyebrow}
            advancedTitle={ROOM_COPY.live.advancedTitle}
            advancedBody={ROOM_COPY.live.advancedBody}
            openLabel={ROOM_COPY.live.openLabel}
            closeLabel={ROOM_COPY.live.closeLabel}
          >
            <LivePanel
              workflow={workflow}
              run={selectedWorkflowState.live.run}
              replay={selectedWorkflowState.live.replay}
              controlPlane={selectedControlPlaneSystem}
            />
          </RoomShell>
        ) : null}

        {selectedRoom === 'replay' ? (
          <RoomShell
            roomId="replay"
            eyebrow={ROOM_COPY.replay.eyebrow}
            title={ROOM_COPY.replay.title}
            body={ROOM_COPY.replay.body}
            items={ROOM_COPY.replay.items}
            advanced={<ReplayAdvancedPanel replay={selectedWorkflowState.replay.replay} controlPlane={selectedControlPlaneSystem} />}
            showAdvanced={advancedOpen.replay}
            onToggleAdvanced={() => toggleAdvanced('replay')}
            advancedEyebrow={ROOM_COPY.replay.advancedEyebrow}
            advancedTitle={ROOM_COPY.replay.advancedTitle}
            advancedBody={ROOM_COPY.replay.advancedBody}
            openLabel={ROOM_COPY.replay.openLabel}
            closeLabel={ROOM_COPY.replay.closeLabel}
          >
            <ReplayPanel
              replay={selectedWorkflowState.replay.replay}
              baselineRun={selectedWorkflowState.replay.baselineRun}
              controlPlane={selectedControlPlaneSystem}
            />
          </RoomShell>
        ) : null}

        {selectedRoom === 'optimize' ? (
          <RoomShell
            roomId="optimize"
            eyebrow={ROOM_COPY.optimize.eyebrow}
            title={ROOM_COPY.optimize.title}
            body={ROOM_COPY.optimize.body}
            items={ROOM_COPY.optimize.items}
            advanced={
              <OptimizeAdvancedPanel
                savedPlans={selectedWorkflowState.optimize.candidateReplay.studioState?.savedPlans ?? []}
                promotionHistory={selectedWorkflowState.optimize.promotionHistory}
                controlPlane={selectedControlPlaneSystem}
              />
            }
            showAdvanced={advancedOpen.optimize}
            onToggleAdvanced={() => toggleAdvanced('optimize')}
            advancedEyebrow={ROOM_COPY.optimize.advancedEyebrow}
            advancedTitle={ROOM_COPY.optimize.advancedTitle}
            advancedBody={ROOM_COPY.optimize.advancedBody}
            openLabel={ROOM_COPY.optimize.openLabel}
            closeLabel={ROOM_COPY.optimize.closeLabel}
          >
            <OptimizePanel
              baselineRun={selectedWorkflowState.optimize.baselineRun}
              candidateRun={selectedWorkflowState.optimize.candidateRun}
              candidateReplay={selectedWorkflowState.optimize.candidateReplay}
              candidatePlan={selectedWorkflowState.optimize.candidatePlan}
              promotionSummary={selectedWorkflowState.optimize.promotionSummary}
              controlPlane={selectedControlPlaneSystem}
            />
          </RoomShell>
        ) : null}
      </div>
    </main>
  );
}
