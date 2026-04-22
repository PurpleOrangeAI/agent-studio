import { startTransition, useEffect, useState } from 'react';

import { loadControlPlaneState, type ControlPlaneState } from './control-plane';
import { loadDemoState, type DemoState } from './demo';
import { formatCredits, formatDuration, titleCaseStatus } from './format';
import { RoomShell } from './RoomShell';
import { buildAppRoute, parseAppRoute, type AppRouteState, type ViewId } from './routes';
import { ConnectPanel } from '../features/connect/ConnectPanel';
import { LiveAdvancedPanel } from '../features/live/LiveAdvancedPanel';
import { LivePanel } from '../features/live/LivePanel';
import { OnboardingPanel } from '../features/onboarding/OnboardingPanel';
import { OptimizeAdvancedPanel } from '../features/optimize/OptimizeAdvancedPanel';
import { OptimizePanel } from '../features/optimize/OptimizePanel';
import { ReplayAdvancedPanel } from '../features/replay/ReplayAdvancedPanel';
import { ReplayPanel } from '../features/replay/ReplayPanel';
import { SystemOverviewRoute } from '../features/system/SystemOverviewRoute';
import {
  buildSystemWorkflowState,
  getAgentLabel,
  getWorkflowIdForSystem,
  sortSystemsByActivity,
  summarizeSystem,
} from './control-plane';

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

const ONBOARDING_STORAGE_KEY = 'agent-studio-demo-onboarding-dismissed';

function getInitialRouteState(): AppRouteState {
  if (typeof window === 'undefined') {
    return {
      view: 'overview',
      systemId: null,
    };
  }

  return parseAppRoute(window.location.pathname);
}

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

function formatTokenLabel(value: string) {
  return value
    .split(/[._-]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

const VIEW_LABELS: Record<
  ViewId,
  {
    title: string;
    summary: string;
    path: string;
  }
> = {
  overview: {
    title: 'Overview',
    summary: 'Operate the full system',
    path: 'System',
  },
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
  connect: {
    title: 'Connect',
    summary: 'Register and import systems',
    path: 'Import',
  },
};

const ROOM_COPY: Record<
  Exclude<ViewId, 'overview' | 'connect'>,
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
  const initialRoute = getInitialRouteState();
  const [demoState, setDemoState] = useState<DemoState | null>(null);
  const [controlPlaneState, setControlPlaneState] = useState<ControlPlaneState | null>(null);
  const [selectedView, setSelectedView] = useState<ViewId>(initialRoute.view);
  const [runtimeId, setRuntimeId] = useState<string>('demo');
  const [systemId, setSystemId] = useState<string>(initialRoute.systemId ?? '');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [workflowId, setWorkflowId] = useState<string>('');
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
          const initialSystem =
            controlPlaneResult.status === 'fulfilled'
              ? controlPlaneResult.value.systems.find((systemState) => systemState.system.systemId === initialRoute.systemId) ??
                controlPlaneResult.value.systemsByWorkflowId[demoResult.value.defaultWorkflowId] ??
                sortSystemsByActivity(controlPlaneResult.value.systems)[0] ??
                null
              : null;
          const initialRuntimeId =
            initialSystem?.system.primaryRuntimeId ?? initialSystem?.system.runtimeIds[0] ?? demoResult.value.runtimeOptions[0]?.id ?? 'demo';

          setDemoState(demoResult.value);
          setRuntimeId(initialRuntimeId);
          setSystemId(initialRoute.view === 'connect' ? '' : initialSystem?.system.systemId ?? initialRoute.systemId ?? '');
          setSelectedAgentId(initialSystem?.agents[0]?.agentId ?? '');
          setWorkflowId(
            getWorkflowIdForSystem(initialSystem) ??
              demoResult.value.defaultWorkflowId,
          );
          setControlPlaneState(controlPlaneResult.status === 'fulfilled' ? controlPlaneResult.value : null);
          setLoadError(null);
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    function syncRouteFromLocation() {
      const route = parseAppRoute(window.location.pathname);
      setSelectedView(route.view);
      setSystemId(route.systemId ?? '');
    }

    window.addEventListener('popstate', syncRouteFromLocation);

    return () => {
      window.removeEventListener('popstate', syncRouteFromLocation);
    };
  }, []);

  const sortedSystems = controlPlaneState ? sortSystemsByActivity(controlPlaneState.systems) : [];
  const selectedSystemState =
    sortedSystems.find((systemState) => systemState.system.systemId === systemId) ??
    controlPlaneState?.systemsByWorkflowId[workflowId] ??
    sortedSystems[0] ??
    null;
  const selectedSystemWorkflowId = getWorkflowIdForSystem(selectedSystemState);
  const defaultWorkflowState = demoState ? demoState.workflowStates[demoState.defaultWorkflowId] ?? null : null;
  const seededWorkflowState =
    demoState && selectedSystemWorkflowId ? demoState.workflowStates[selectedSystemWorkflowId] ?? null : selectedSystemState ? null : defaultWorkflowState;
  const selectedWorkflowState = seededWorkflowState ?? buildSystemWorkflowState(selectedSystemState);
  const hasRoomProjection = Boolean(selectedWorkflowState);
  const workflow = selectedWorkflowState?.workflow ?? null;
  const liveRun = selectedWorkflowState?.live.run ?? null;
  const replayRun = selectedWorkflowState?.replay.run ?? null;
  const failedReplayStep =
    selectedWorkflowState?.replay.replay.stepExecutions.find((step) => step.status === 'failed') ??
    selectedWorkflowState?.replay.replay.stepExecutions[0] ??
    null;
  const candidateRun = selectedWorkflowState?.optimize.candidateRun ?? null;
  const candidateCreditsDelta =
    candidateRun != null
      ? (candidateRun.actualCredits ?? 0) - (selectedWorkflowState?.optimize.baselineRun.actualCredits ?? 0)
      : 0;
  const candidateDurationDeltaSeconds =
    candidateRun != null
      ? Math.round(((candidateRun.durationMs ?? 0) - (selectedWorkflowState?.optimize.baselineRun.durationMs ?? 0)) / 1000)
      : 0;
  const runtimeOptions =
    controlPlaneState?.runtimes.length
      ? controlPlaneState.runtimes.map((runtime) => ({
          id: runtime.runtimeId,
          label: runtime.label,
          detail: `${formatTokenLabel(runtime.kind)} runtime · ${runtime.adapterId}`,
        }))
      : demoState?.runtimeOptions ?? [];
  const selectedRuntime = runtimeOptions.find((option) => option.id === runtimeId) ?? null;
  const selectedControlPlaneSystem = selectedSystemState ?? (workflow ? controlPlaneState?.systemsByWorkflowId[workflow.workflowId] ?? null : null);
  const selectedSystemSummary = summarizeSystem(selectedControlPlaneSystem);
  const pressureAgentLabel = getAgentLabel(selectedControlPlaneSystem, selectedSystemSummary?.pressureAgentId ?? undefined);
  const currentStateStatus = selectedSystemSummary?.latestExecution?.status ?? liveRun?.status ?? 'active';
  const currentStateName = selectedControlPlaneSystem?.system.name ?? workflow?.name ?? 'Seeded demo system';
  const currentStateDescription =
    selectedControlPlaneSystem?.system.description ?? workflow?.description ?? 'A seeded control-room demo with runtime-aware routes.';
  const replayPressureSummary = hasRoomProjection
    ? failedReplayStep?.error ?? failedReplayStep?.summary ?? 'No active pressure point is recorded in the current system.'
    : selectedSystemSummary?.pressureAgentId
      ? 'This system has a hot agent in the registry, but it does not yet map to a seeded replay walkthrough.'
      : 'Import executions and spans to light up Replay for this system.';
  const releaseHeadline = hasRoomProjection
    ? candidateCreditsDelta < 0
      ? `${Math.abs(candidateCreditsDelta)} credits leaner`
      : 'Guardrails preserved'
    : selectedSystemSummary?.latestRelease
      ? formatTokenLabel(selectedSystemSummary.latestRelease.decision)
      : selectedSystemSummary?.latestEvaluation
        ? titleCaseStatus(selectedSystemSummary.latestEvaluation.verdict)
        : 'No release evidence yet';
  const releaseSummary = hasRoomProjection
    ? selectedWorkflowState?.optimize.promotionSummary ?? 'No promotion story recorded.'
    : selectedSystemSummary?.latestRelease?.summary ??
      selectedSystemSummary?.latestEvaluation?.summary ??
      'Import evaluations and release decisions to turn Optimize into a real release workbench.';

  function navigateTo(view: ViewId, nextSystemId = systemId || selectedControlPlaneSystem?.system.systemId || null, replace = false) {
    const targetPath = buildAppRoute({
      view,
      systemId: view === 'connect' ? null : nextSystemId,
    });

    setSelectedView(view);
    if (view !== 'connect') {
      setSystemId(nextSystemId ?? '');
    }

    if (typeof window !== 'undefined') {
      window.history[replace ? 'replaceState' : 'pushState']({}, '', targetPath);
    }
  }

  useEffect(() => {
    if (!selectedControlPlaneSystem?.agents.length) {
      return;
    }

    const hasSelectedAgent = selectedControlPlaneSystem.agents.some((agent) => agent.agentId === selectedAgentId);
    if (hasSelectedAgent) {
      return;
    }

    setSelectedAgentId(selectedSystemSummary?.pressureAgentId ?? selectedControlPlaneSystem.agents[0]?.agentId ?? '');
  }, [selectedAgentId, selectedControlPlaneSystem, selectedSystemSummary?.pressureAgentId]);

  useEffect(() => {
    if (!selectedControlPlaneSystem) {
      return;
    }

    const preferredRuntimeId = selectedControlPlaneSystem.system.primaryRuntimeId ?? selectedControlPlaneSystem.system.runtimeIds[0];
    if (!preferredRuntimeId || preferredRuntimeId === runtimeId) {
      return;
    }

    setRuntimeId(preferredRuntimeId);
  }, [runtimeId, selectedControlPlaneSystem]);

  useEffect(() => {
    if (!selectedControlPlaneSystem || selectedView === 'connect') {
      return;
    }

    const route = parseAppRoute(typeof window !== 'undefined' ? window.location.pathname : '/');
    if (route.systemId === selectedControlPlaneSystem.system.systemId && route.view === selectedView) {
      return;
    }

    navigateTo(selectedView, selectedControlPlaneSystem.system.systemId, true);
  }, [selectedControlPlaneSystem, selectedView]);

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

  if (!demoState) {
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

  function handleSystemChange(nextSystemId: string) {
    setSystemId(nextSystemId);
    const nextSystem = sortedSystems.find((systemState) => systemState.system.systemId === nextSystemId) ?? null;
    setRuntimeId(nextSystem?.system.primaryRuntimeId ?? nextSystem?.system.runtimeIds[0] ?? runtimeId);
    setSelectedAgentId(nextSystem?.agents[0]?.agentId ?? '');
    const nextWorkflowId = getWorkflowIdForSystem(nextSystem);
    if (nextWorkflowId) {
      setWorkflowId(nextWorkflowId);
    }
    navigateTo(selectedView === 'connect' ? 'overview' : selectedView, nextSystemId);
  }

  async function handleRefreshControlPlane(nextSystemId?: string) {
    const nextState = await loadControlPlaneState();
    setControlPlaneState(nextState);

    if (nextSystemId) {
      navigateTo(selectedView === 'connect' ? 'overview' : selectedView, nextSystemId, true);
      return;
    }

    if (!nextState.systems.length) {
      return;
    }

    const refreshedSystem =
      nextState.systems.find((systemState) => systemState.system.systemId === (selectedControlPlaneSystem?.system.systemId ?? systemId)) ??
      sortSystemsByActivity(nextState.systems)[0];

    if (refreshedSystem) {
      navigateTo(selectedView === 'connect' ? 'overview' : selectedView, refreshedSystem.system.systemId, true);
    }
  }

  const controlLoopCue: ControlLoopCue =
    selectedView === 'overview'
      ? {
          eyebrow: 'Control loop',
          title: 'Start from the live system',
          body: 'Use the overview to find the right system and hot agents, then move into Live when you want to operate the active execution path.',
          primaryLabel: 'Open Live',
          onPrimary: () => navigateTo('live'),
          secondaryLabel: 'Open Connect',
          onSecondary: () => navigateTo('connect', null),
        }
      : selectedView === 'connect'
        ? {
            eyebrow: 'Control loop',
            title: 'Next: return to the system overview',
            body: 'After you register or import a system, come back to Overview to inspect fleet health and decide where to drill in.',
            primaryLabel: 'Open Overview',
            onPrimary: () => navigateTo('overview'),
          }
      : !hasRoomProjection
        ? {
            eyebrow: 'Control loop',
            title: 'This room needs trace-backed system history',
            body: 'The system is registered, but there is no seeded room projection for it yet. Import executions, spans, evaluations, and releases, or attach a workflowId if you want to reuse the seeded walkthrough.',
            primaryLabel: 'Open Connect',
            onPrimary: () => navigateTo('connect', null),
            secondaryLabel: 'Open Overview',
            onSecondary: () => navigateTo('overview'),
          }
      : selectedView === 'live'
        ? {
            eyebrow: 'Control loop',
            title: 'Next: open Replay',
            body: `${replayRun?.experimentLabel ?? 'The selected replay'} is the clearest weak run in the loop. Use Replay to confirm what broke before you tune anything else.`,
            primaryLabel: 'Open Replay',
            onPrimary: () => navigateTo('replay'),
            secondaryLabel: failedReplayStep?.title ? `Focus ${failedReplayStep.title}` : undefined,
            onSecondary: failedReplayStep?.title ? () => navigateTo('replay') : undefined,
          }
        : selectedView === 'replay'
        ? {
            eyebrow: 'Control loop',
            title: 'Next: test the fix in Optimize',
            body: `Replay already identified the break. Move into Optimize and pressure-test ${candidateRun?.experimentLabel ?? 'the current candidate'} against the healthy control.`,
            primaryLabel: 'Open Optimize',
            onPrimary: () => navigateTo('optimize'),
            secondaryLabel: 'Back to Live',
            onSecondary: () => navigateTo('live'),
          }
        : {
            eyebrow: 'Control loop',
            title: 'Next: validate the promoted system in Live',
            body: `${candidateRun?.experimentLabel ?? 'The current candidate'} looks strong enough to ship. Move back to Live and confirm the loop still feels healthy after the release call.`,
            primaryLabel: 'Open Live',
            onPrimary: () => navigateTo('live'),
            secondaryLabel: 'Re-open Replay',
            onSecondary: () => navigateTo('replay'),
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

  function renderProjectionUnavailableRoom(room: RoomId) {
    return (
      <section className="surface overview-panel">
        <div className="section-header">
          <div>
            <p className="eyebrow">{VIEW_LABELS[room].title}</p>
            <h2>No seeded room projection for this system</h2>
            <p className="muted overview-panel__body">
              This system is visible in the control plane, but this room still depends on trace-backed walkthrough data.
              Import executions, spans, evaluations, and releases, or attach `metadata.workflowId` if you want to reuse
              the seeded workflow projection.
            </p>
          </div>
          <span className="meta-chip">{selectedControlPlaneSystem?.system.name ?? 'No system selected'}</span>
        </div>
        <div className="signal-band">
          <article className="signal-band__card">
            <span className="eyebrow">Tracked agents</span>
            <strong>{selectedSystemSummary?.agentCount ?? 0}</strong>
            <p>{selectedSystemSummary?.executionCount ?? 0} executions currently registered for this system.</p>
          </article>
          <article className="signal-band__card signal-band__card--directive">
            <span className="eyebrow">Pressure point</span>
            <strong>{pressureAgentLabel ?? 'No hot agent yet'}</strong>
            <p>{replayPressureSummary}</p>
          </article>
          <article className="signal-band__card signal-band__card--accent">
            <span className="eyebrow">Next move</span>
            <strong>Open Connect</strong>
            <p>Bring in trace, evaluation, and release evidence so this room can switch from placeholder to real control-plane mode.</p>
          </article>
        </div>
      </section>
    );
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
              A seeded control room for bring-your-own multi-agent systems. The shell should start from the system,
              expose agent pressure fast, and make the next intervention or release call obvious.
            </p>
            <div className="hero__current-state">
              <div className="hero__state-copy">
                <span className="hero__state-label">Current state</span>
                <strong>{currentStateName}</strong>
                <p>{currentStateDescription}</p>
              </div>
              <div className="hero__state-line">
                <span className={`status-pill status-pill--${currentStateStatus}`}>
                  {titleCaseStatus(currentStateStatus)}
                </span>
                <span className="meta-chip">{selectedSystemSummary?.agentCount ?? 0} agents</span>
                <span className="meta-chip">{selectedSystemSummary?.executionCount ?? 0} executions</span>
                <span className="meta-chip">Pressure: {pressureAgentLabel ?? failedReplayStep?.title ?? 'Healthy control'}</span>
              </div>
            </div>
          </div>
          <div className="hero__console">
            <div className="hero__controls" aria-label="Demo controls">
              <div className="hero__controls-header">
                <div>
                  <p className="eyebrow">Command surface</p>
                  <h2>Runtime and system</h2>
                </div>
                <span className="meta-chip">System-first operator view</span>
              </div>
              <label className="select-field">
                <span>Runtime</span>
                <select aria-label="Runtime" value={runtimeId} onChange={(event) => setRuntimeId(event.target.value)}>
                  {runtimeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <small>{selectedRuntime?.detail}</small>
              </label>
              {sortedSystems.length ? (
                <label className="select-field">
                  <span>System</span>
                  <select
                    aria-label="System"
                    value={selectedControlPlaneSystem?.system.systemId ?? ''}
                    onChange={(event) => handleSystemChange(event.target.value)}
                  >
                    {sortedSystems.map((systemState) => (
                      <option key={systemState.system.systemId} value={systemState.system.systemId}>
                        {systemState.system.name}
                      </option>
                    ))}
                  </select>
                  <small>{selectedControlPlaneSystem?.system.description ?? currentStateDescription}</small>
                </label>
              ) : (
                <label className="select-field">
                  <span>Workflow</span>
                  <select aria-label="Workflow" value={workflowId} onChange={(event) => setWorkflowId(event.target.value)}>
                    {demoState.workflows.map((option) => (
                      <option key={option.workflowId} value={option.workflowId}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  <small>{workflow?.description ?? currentStateDescription}</small>
                </label>
              )}
            </div>
            <div className="hero__status-grid">
              <article className="hero-signal hero-signal--live">
                <span className="hero-signal__label">Live posture</span>
                <strong>{titleCaseStatus(currentStateStatus)}</strong>
                <p>{currentStateName}</p>
                <div className="hero-signal__meta">
                  <span>{formatCredits(selectedSystemSummary?.avgCredits ?? liveRun?.actualCredits)}</span>
                  <span>{formatDuration(selectedSystemSummary?.avgDurationMs ?? liveRun?.durationMs)}</span>
                </div>
              </article>
              <article className="hero-signal hero-signal--replay">
                <span className="hero-signal__label">Replay pressure</span>
                <strong>{pressureAgentLabel ?? failedReplayStep?.title ?? 'No failing step'}</strong>
                <p>{replayPressureSummary}</p>
                <div className="hero-signal__meta">
                  <span>{replayRun ? titleCaseStatus(replayRun.status) : `${selectedSystemSummary?.executionCount ?? 0} executions`}</span>
                  <span>{formatCredits(replayRun?.actualCredits ?? selectedSystemSummary?.avgCredits)}</span>
                </div>
              </article>
              <article className="hero-signal hero-signal--optimize">
                <span className="hero-signal__label">Release call</span>
                <strong>{releaseHeadline}</strong>
                <p>{releaseSummary}</p>
                <div className="hero-signal__meta">
                  <span>{hasRoomProjection ? (candidateDurationDeltaSeconds < 0 ? `${Math.abs(candidateDurationDeltaSeconds)}s faster` : 'No speed gain') : 'Control-plane evidence'}</span>
                  <span>{selectedWorkflowState?.optimize.candidatePlan?.name ?? selectedSystemSummary?.latestRelease?.releaseId ?? 'Release audit'}</span>
                </div>
              </article>
            </div>
          </div>
        </header>

        {showOnboarding ? (
          <OnboardingPanel
            onDismiss={dismissOnboarding}
            controlPlaneState={controlPlaneState}
            systemState={selectedControlPlaneSystem}
            runtimeLabel={selectedRuntime?.label ?? null}
          />
        ) : null}

        <section className="room-nav surface">
          <div className="room-nav__intro">
            <p className="eyebrow">System routes</p>
            <h2>Move through the operating surface</h2>
            <p className="muted">The URL now tracks where you are: overview, live, replay, optimize, or connect.</p>
          </div>
          <div className="room-nav__buttons" role="tablist" aria-label="Room switcher">
            {(['overview', 'live', 'replay', 'optimize', 'connect'] as ViewId[]).map((view) => (
              <button
                key={view}
                type="button"
                role="tab"
                aria-label={VIEW_LABELS[view].title}
                aria-selected={selectedView === view}
                className={`room-tab ${selectedView === view ? 'room-tab--active' : ''}`}
                onClick={() => navigateTo(view)}
              >
                <span className="room-tab__path">{VIEW_LABELS[view].path}</span>
                <strong>{VIEW_LABELS[view].title}</strong>
                <small>{VIEW_LABELS[view].summary}</small>
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

        {selectedView === 'overview' ? (
          <SystemOverviewRoute
            demoState={demoState}
            sortedSystems={sortedSystems}
            selectedSystem={selectedControlPlaneSystem}
            selectedWorkflowState={selectedWorkflowState}
            storage={controlPlaneState?.storage ?? null}
            selectedAgentId={selectedAgentId || null}
            onSelectSystem={handleSystemChange}
            onSelectAgent={setSelectedAgentId}
          />
        ) : null}

        {selectedView === 'connect' ? (
          <ConnectPanel
            selectedSystem={selectedControlPlaneSystem}
            storage={controlPlaneState?.storage ?? null}
            onRefresh={handleRefreshControlPlane}
          />
        ) : null}

        {selectedView === 'live' && hasRoomProjection && selectedWorkflowState && workflow ? (
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

        {selectedView === 'live' && !hasRoomProjection ? renderProjectionUnavailableRoom('live') : null}

        {selectedView === 'replay' && hasRoomProjection && selectedWorkflowState ? (
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

        {selectedView === 'replay' && !hasRoomProjection ? renderProjectionUnavailableRoom('replay') : null}

        {selectedView === 'optimize' && hasRoomProjection && selectedWorkflowState ? (
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

        {selectedView === 'optimize' && !hasRoomProjection ? renderProjectionUnavailableRoom('optimize') : null}
      </div>
    </main>
  );
}
