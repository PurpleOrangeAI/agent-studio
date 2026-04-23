import { useMemo, useState } from 'react';

import type { DemoState, WorkflowDemoState } from '../../app/demo';
import {
  ANALYTICS_WINDOW_OPTIONS,
  filterSystemStateByWindow,
  getAgentLabel,
  getAnalyticsWindowLabel,
  summarizeSystem,
  type AnalyticsWindow,
  type ControlPlaneStorageInfo,
  type ControlPlaneSystemState,
} from '../../app/control-plane';
import { formatCredits, formatDuration, titleCaseStatus } from '../../app/format';
import { AgentDetailPanel } from './AgentDetailPanel';
import { AgentFleetPanel } from './AgentFleetPanel';
import { BirdviewPanel } from './BirdviewPanel';
import { FleetOverviewPanel } from './FleetOverviewPanel';
import { FleetAnalyticsPanel } from './FleetAnalyticsPanel';
import { SystemCatalogPanel } from './SystemCatalogPanel';
import { SystemHistoryPanel } from './SystemHistoryPanel';
import { SystemPerformancePanel } from './SystemPerformancePanel';

interface SystemOverviewRouteProps {
  demoState: DemoState;
  sortedSystems: ControlPlaneSystemState[];
  selectedSystem: ControlPlaneSystemState | null;
  selectedWorkflowState: WorkflowDemoState | null;
  storage: ControlPlaneStorageInfo | null;
  selectedAgentId: string | null;
  onSelectSystem: (systemId: string) => void;
  onSelectAgent: (agentId: string) => void;
}

type OverviewWorkspaceView = 'command' | 'analytics' | 'history';

const OVERVIEW_WORKSPACE_VIEWS: Array<{
  id: OverviewWorkspaceView;
  label: string;
  summary: string;
}> = [
  { id: 'command', label: 'Command', summary: 'Agent roster and detail' },
  { id: 'analytics', label: 'Analytics', summary: 'Pressure and posture' },
  { id: 'history', label: 'History', summary: 'Operator timeline' },
];

function formatTokenLabel(value: string) {
  return value
    .split(/[._-]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

export function SystemOverviewRoute({
  demoState,
  sortedSystems,
  selectedSystem,
  selectedWorkflowState,
  storage,
  selectedAgentId,
  onSelectSystem,
  onSelectAgent,
}: SystemOverviewRouteProps) {
  const [analyticsWindow, setAnalyticsWindow] = useState<AnalyticsWindow>('7d');
  const [workspaceView, setWorkspaceView] = useState<OverviewWorkspaceView>('command');
  const isFleetMode = sortedSystems.length > 1;
  const fleetSystems = useMemo(
    () => sortedSystems.map((systemState) => filterSystemStateByWindow(systemState, analyticsWindow) ?? systemState),
    [analyticsWindow, sortedSystems],
  );
  const windowedSystemState = useMemo(
    () => filterSystemStateByWindow(selectedSystem, analyticsWindow),
    [selectedSystem, analyticsWindow],
  );
  const selectedSystemSummary = summarizeSystem(windowedSystemState);
  const pressureAgentLabel = getAgentLabel(windowedSystemState, selectedSystemSummary?.pressureAgentId ?? undefined);
  const latestRelease = selectedSystemSummary?.latestRelease ?? null;
  const latestEvaluation = selectedSystemSummary?.latestEvaluation ?? null;
  const windowLabel = getAnalyticsWindowLabel(analyticsWindow);

  function renderAnalyticsScope() {
    if (!selectedSystem) {
      return null;
    }

    return (
      <section className="surface analytics-query-panel">
        <div className="section-header">
          <div>
            <p className="eyebrow">Analytics scope</p>
            <h2>Time-windowed system view</h2>
            <p className="muted">
              Filter the control-plane history first. Performance, fleet pressure, and system history all follow the
              same window so the operator view stays consistent.
            </p>
          </div>
          <span className="meta-chip">{windowLabel} window</span>
        </div>
        <div className="history-toolbar">
          {ANALYTICS_WINDOW_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`history-filter ${analyticsWindow === option.id ? 'history-filter--active' : ''}`}
              onClick={() => setAnalyticsWindow(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
    );
  }

  function renderOverviewWorkspace() {
    if (!selectedSystem) {
      return null;
    }

    return (
      <>
        <section className="surface overview-workspace">
          <div className="section-header">
            <div>
              <p className="eyebrow">Operator workspace</p>
              <h2>Work one layer at a time</h2>
              <p className="muted">
                Overview now keeps the deep surfaces behind a focused workspace. Stay in one layer, then move to the
                next when you actually need it.
              </p>
            </div>
            <span className="meta-chip">{OVERVIEW_WORKSPACE_VIEWS.find((view) => view.id === workspaceView)?.summary}</span>
          </div>
          <div className="history-toolbar">
            {OVERVIEW_WORKSPACE_VIEWS.map((view) => (
              <button
                key={view.id}
                type="button"
                className={`history-filter ${workspaceView === view.id ? 'history-filter--active' : ''}`}
                onClick={() => setWorkspaceView(view.id)}
              >
                {view.label}
              </button>
            ))}
          </div>
        </section>

        {workspaceView === 'command' ? (
          <section className="system-layout">
            <AgentFleetPanel
              systemState={windowedSystemState}
              selectedAgentId={selectedAgentId}
              onSelectAgent={onSelectAgent}
              analyticsWindow={analyticsWindow}
            />
            <AgentDetailPanel systemState={windowedSystemState} agentId={selectedAgentId} />
          </section>
        ) : null}

        {workspaceView === 'analytics' ? (
          <FleetAnalyticsPanel systemState={windowedSystemState} analyticsWindow={analyticsWindow} />
        ) : null}

        {workspaceView === 'history' ? (
          <SystemHistoryPanel systemState={windowedSystemState} analyticsWindow={analyticsWindow} />
        ) : null}
      </>
    );
  }

  function renderControlPlaneOverviewPanel() {
    return (
      <section className="surface overview-panel">
        <div className="section-header">
          <div>
            <p className="eyebrow">System overview</p>
            <h2>Control-plane system summary</h2>
            <p className="muted overview-panel__body">
              This system is registered in the control plane, but it does not map to a seeded workflow walkthrough yet.
              Overview stays useful from the live registry, agent fleet, and release evidence you have already imported.
            </p>
          </div>
          <span className="meta-chip">{demoState.workflows.length} seeded workflow{demoState.workflows.length === 1 ? '' : 's'}</span>
        </div>
        <div className="overview-grid">
          <article className="overview-card overview-card--live">
            <div className="overview-card__header">
              <div>
                <p className="eyebrow">01 · Live</p>
                <h3>{selectedSystem?.system.name ?? 'No system selected'}</h3>
              </div>
              <span className={`status-pill status-pill--${selectedSystemSummary?.latestExecution?.status ?? 'active'}`}>
                {titleCaseStatus(selectedSystemSummary?.latestExecution?.status ?? 'active')}
              </span>
            </div>
            <p className="overview-card__summary">Operate the actual system registry first: latest execution, active agents, and current pressure.</p>
            <div className="overview-card__metric">
              <span>Execution posture</span>
              <strong>{selectedSystemSummary?.executionCount ?? 0} recorded execution{selectedSystemSummary?.executionCount === 1 ? '' : 's'}</strong>
            </div>
            <div className="overview-card__path">
              <span>{formatCredits(selectedSystemSummary?.avgCredits)}</span>
              <span>{formatDuration(selectedSystemSummary?.avgDurationMs)}</span>
            </div>
          </article>
          <article className="overview-card overview-card--replay">
            <div className="overview-card__header">
              <div>
                <p className="eyebrow">02 · Replay</p>
                <h3>{pressureAgentLabel ?? 'No hot agent yet'}</h3>
              </div>
              <span className={`status-pill status-pill--${selectedSystemSummary?.pressureAgentId ? 'failed' : 'active'}`}>
                {selectedSystemSummary?.pressureAgentId ? 'Hot path' : 'Waiting'}
              </span>
            </div>
            <p className="overview-card__summary">Replay gets stronger once this system has imported executions and spans to compare.</p>
            <div className="overview-card__metric overview-card__metric--warning">
              <span>Trace pressure</span>
              <strong>
                {selectedSystemSummary?.pressureAgentId ? `${pressureAgentLabel} is carrying the most pressure` : 'Import spans to expose the break tree'}
              </strong>
            </div>
            <div className="overview-card__path">
              <span>{selectedSystemSummary?.agentCount ?? 0} tracked agents</span>
              <span>{selectedSystemSummary?.activeInterventionCount ?? 0} active directives</span>
            </div>
          </article>
          <article className="overview-card overview-card--optimize">
            <div className="overview-card__header">
              <div>
                <p className="eyebrow">03 · Optimize</p>
                <h3>{latestRelease ? formatTokenLabel(latestRelease.decision) : latestEvaluation ? titleCaseStatus(latestEvaluation.verdict) : 'No release record yet'}</h3>
              </div>
              <span className={`status-pill status-pill--${latestRelease?.decision === 'rollback' ? 'failed' : latestRelease ? 'succeeded' : 'active'}`}>
                {latestRelease ? 'Release audit' : latestEvaluation ? 'Evaluation' : 'Waiting'}
              </span>
            </div>
            <p className="overview-card__summary">Optimize stays practical only when the system has evaluation and release evidence to work from.</p>
            <div className="overview-card__metric overview-card__metric--success">
              <span>Latest decision</span>
              <strong>{latestRelease?.summary ?? latestEvaluation?.summary ?? 'Import evaluations and releases to light up the workbench.'}</strong>
            </div>
            <div className="overview-card__path">
              <span>{selectedSystemSummary?.interventionCount ?? 0} interventions</span>
              <span>{selectedSystemSummary?.lastActiveAt ? 'Recently active' : 'No recent release activity'}</span>
            </div>
          </article>
        </div>
      </section>
    );
  }

  function renderSeededOverviewPanel() {
    if (!selectedWorkflowState) {
      return null;
    }

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

    return (
      <section className="surface overview-panel">
        <div className="section-header">
          <div>
            <p className="eyebrow">System overview</p>
            <h2>Live, Replay, Optimize</h2>
            <p className="muted overview-panel__body">This overview shows the current operating loop for the selected system before you drop into a specific room.</p>
          </div>
          <span className="meta-chip">{demoState.workflows.length} seeded workflow{demoState.workflows.length === 1 ? '' : 's'}</span>
        </div>
        <div className="overview-grid">
          <article className="overview-card overview-card--live">
            <div className="overview-card__header">
              <div>
                <p className="eyebrow">01 · Live</p>
                <h3>{liveRun.experimentLabel}</h3>
              </div>
              <span className={`status-pill status-pill--${liveRun.status}`}>{titleCaseStatus(liveRun.status)}</span>
            </div>
            <p className="overview-card__summary">Operate the current system before you touch history or overrides.</p>
            <div className="overview-card__metric">
              <span>Current workflow</span>
              <strong>{workflow.name}</strong>
            </div>
            <div className="overview-card__path">
              <span>{formatCredits(liveRun.actualCredits)}</span>
              <span>{formatDuration(liveRun.durationMs)}</span>
            </div>
          </article>
          <article className="overview-card overview-card--replay">
            <div className="overview-card__header">
              <div>
                <p className="eyebrow">02 · Replay</p>
                <h3>{replayRun.experimentLabel}</h3>
              </div>
              <span className={`status-pill status-pill--${replayRun.status}`}>{titleCaseStatus(replayRun.status)}</span>
            </div>
            <p className="overview-card__summary">Find the exact break and turn it into the next fix, not another theory.</p>
            <div className="overview-card__metric overview-card__metric--warning">
              <span>Pressure point</span>
              <strong>{failedReplayStep?.title ?? 'No failed step recorded'}</strong>
            </div>
            <div className="overview-card__path">
              <span>{failedReplayStep?.assignedRole ?? 'reviewer'}</span>
              <span>{formatCredits(replayRun.actualCredits)}</span>
            </div>
          </article>
          <article className="overview-card overview-card--optimize">
            <div className="overview-card__header">
              <div>
                <p className="eyebrow">03 · Optimize</p>
                <h3>{candidateRun.experimentLabel}</h3>
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
    );
  }

  return (
    <>
      <BirdviewPanel systemState={selectedSystem} storage={storage} />

      {isFleetMode ? (
        <>
          <FleetOverviewPanel systems={fleetSystems} analyticsWindow={analyticsWindow} onSelectSystem={onSelectSystem} />
          <SystemCatalogPanel
            systems={fleetSystems}
            selectedSystemId={selectedSystem?.system.systemId ?? null}
            onSelectSystem={onSelectSystem}
          />
        </>
      ) : null}

      {selectedWorkflowState ? renderSeededOverviewPanel() : renderControlPlaneOverviewPanel()}
      {renderAnalyticsScope()}
      {selectedSystem ? <SystemPerformancePanel systemState={windowedSystemState} storage={storage} analyticsWindow={analyticsWindow} /> : null}
      {renderOverviewWorkspace()}
    </>
  );
}
