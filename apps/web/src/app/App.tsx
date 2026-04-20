import { startTransition, useEffect, useState } from 'react';

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

    loadDemoState()
      .then((state) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setDemoState(state);
          setRuntimeId(state.runtimeOptions[0]?.id ?? 'demo');
          setWorkflowId((current) => (current && state.workflowStates[current] ? current : state.defaultWorkflowId));
          setLoadError(null);
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setLoadError(error instanceof Error ? error.message : 'Failed to load demo state.');
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
              A seeded control room for agent workflows. The product is obvious on first load: Live, Replay, Optimize as
              one operator loop.
            </p>
          </div>
          <div className="hero__controls" aria-label="Demo controls">
            <label className="select-field">
              <span>Runtime</span>
              <select aria-label="Runtime" value={runtimeId} onChange={(event) => setRuntimeId(event.target.value)}>
                {demoState.runtimeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <small>{demoState.runtimeOptions.find((option) => option.id === runtimeId)?.detail}</small>
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
        </header>

        {showOnboarding ? <OnboardingPanel onDismiss={dismissOnboarding} /> : null}

        <section className="surface overview-panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">Control loop</p>
              <h2>Live, Replay, Optimize</h2>
            </div>
            <span className="meta-chip">Demo mode only</span>
          </div>
          <div className="overview-grid">
            <article className="overview-card overview-card--live">
              <p className="eyebrow">Live</p>
              <h3>{selectedWorkflowState.live.run.experimentLabel}</h3>
              <p>{titleCaseStatus(selectedWorkflowState.live.run.status)} with a clean publish path and stable guardrails.</p>
              <div className="overview-card__stats">
                <span>{formatCredits(selectedWorkflowState.live.run.actualCredits)}</span>
                <span>{formatDuration(selectedWorkflowState.live.run.durationMs)}</span>
              </div>
            </article>
            <article className="overview-card overview-card--replay">
              <p className="eyebrow">Replay</p>
              <h3>{selectedWorkflowState.replay.run.experimentLabel}</h3>
              <p>{selectedWorkflowState.replay.replay.stepExecutions.find((step) => step.status === 'failed')?.error}</p>
              <div className="overview-card__stats">
                <span>{titleCaseStatus(selectedWorkflowState.replay.run.status)}</span>
                <span>{formatCredits(selectedWorkflowState.replay.run.actualCredits)}</span>
              </div>
            </article>
            <article className="overview-card overview-card--optimize">
              <p className="eyebrow">Optimize</p>
              <h3>{selectedWorkflowState.optimize.candidateRun.experimentLabel}</h3>
              <p>{selectedWorkflowState.optimize.promotionSummary}</p>
              <div className="overview-card__stats">
                <span>{selectedWorkflowState.optimize.candidatePlan?.name ?? 'Saved plan'}</span>
                <span>{formatCredits(selectedWorkflowState.optimize.candidateRun.actualCredits)}</span>
              </div>
            </article>
          </div>
        </section>

        <section className="room-nav surface">
          <div>
            <p className="eyebrow">Room switcher</p>
            <h2>Open one room at a time</h2>
          </div>
          <div className="room-nav__buttons" role="tablist" aria-label="Room switcher">
            {(['live', 'replay', 'optimize'] as RoomId[]).map((room) => (
              <button
                key={room}
                type="button"
                role="tab"
                aria-selected={selectedRoom === room}
                className={`room-tab ${selectedRoom === room ? 'room-tab--active' : ''}`}
                onClick={() => setSelectedRoom(room)}
              >
                {room.charAt(0).toUpperCase() + room.slice(1)}
              </button>
            ))}
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
            <LivePanel workflow={workflow} run={selectedWorkflowState.live.run} replay={selectedWorkflowState.live.replay} />
          </RoomShell>
        ) : null}

        {selectedRoom === 'replay' ? (
          <RoomShell
            roomId="replay"
            eyebrow={ROOM_COPY.replay.eyebrow}
            title={ROOM_COPY.replay.title}
            body={ROOM_COPY.replay.body}
            items={ROOM_COPY.replay.items}
            advanced={<ReplayAdvancedPanel replay={selectedWorkflowState.replay.replay} />}
            showAdvanced={advancedOpen.replay}
            onToggleAdvanced={() => toggleAdvanced('replay')}
            advancedEyebrow={ROOM_COPY.replay.advancedEyebrow}
            advancedTitle={ROOM_COPY.replay.advancedTitle}
            advancedBody={ROOM_COPY.replay.advancedBody}
            openLabel={ROOM_COPY.replay.openLabel}
            closeLabel={ROOM_COPY.replay.closeLabel}
          >
            <ReplayPanel replay={selectedWorkflowState.replay.replay} baselineRun={selectedWorkflowState.replay.baselineRun} />
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
            />
          </RoomShell>
        ) : null}
      </div>
    </main>
  );
}
