import type { AnalyticsWindow, ControlPlaneSystemState } from '../../app/control-plane';
import { getAgentLabel, getAnalyticsWindowLabel, summarizeFleet } from '../../app/control-plane';
import { formatCredits, formatDateTime, formatDuration, titleCaseStatus } from '../../app/format';

interface FleetOverviewPanelProps {
  systems: ControlPlaneSystemState[];
  analyticsWindow: AnalyticsWindow;
  onSelectSystem: (systemId: string) => void;
}

export function FleetOverviewPanel({ systems, analyticsWindow, onSelectSystem }: FleetOverviewPanelProps) {
  const fleet = summarizeFleet(systems);
  const hottestSystem = fleet.hottestSystems[0] ?? null;
  const watchedSystem = fleet.releaseWatchlist[0] ?? null;

  if (!fleet.systemCount) {
    return null;
  }

  return (
    <section className="surface fleet-overview-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Fleet overview</p>
          <h2>Cross-system pressure and release watch</h2>
          <p className="muted">
            This is the fleet-level control plane. It shows what needs attention across systems before you drill into a
            single agent topology or replay tree.
          </p>
        </div>
        <span className="meta-chip">{getAnalyticsWindowLabel(analyticsWindow)} window</span>
      </div>

      <div className="fleet-overview-panel__hero">
        <div className="analytics-grid analytics-grid--fleet">
          <article className="metric-card metric-card--primary">
            <span>Systems in view</span>
            <strong>
              {fleet.activeSystemCount} active of {fleet.systemCount}
            </strong>
          </article>
          <article className="metric-card">
            <span>Tracked agents</span>
            <strong>{fleet.trackedAgentCount}</strong>
          </article>
          <article className="metric-card metric-card--accent">
            <span>Execution volume</span>
            <strong>{fleet.executionCount}</strong>
          </article>
          <article className="metric-card metric-card--success">
            <span>Fleet success rate</span>
            <strong>{Math.round(fleet.avgSuccessRate * 100)}%</strong>
          </article>
        </div>

        <div className="fleet-overview-panel__spotlight">
          <article className="signal-band__card signal-band__card--directive">
            <p className="eyebrow">Pressure spotlight</p>
            <strong>{hottestSystem?.system.name ?? 'No hot system yet'}</strong>
            <p>
              {hottestSystem
                ? `${getAgentLabel(
                    systems.find((systemState) => systemState.system.systemId === hottestSystem.system.systemId) ?? null,
                    hottestSystem.pressureAgentId ?? undefined,
                  ) ?? 'No hot agent'} · ${hottestSystem.activeInterventionCount} directives · ${hottestSystem.executionCount} executions`
                : 'Import more systems and traces to expose the hottest path across the fleet.'}
            </p>
          </article>
          <article className="signal-band__card signal-band__card--accent">
            <p className="eyebrow">Release spotlight</p>
            <strong>{watchedSystem?.system.name ?? 'No release watch item'}</strong>
            <p>
              {watchedSystem
                ? `${titleCaseStatus(
                    watchedSystem.latestRelease?.decision ?? watchedSystem.latestEvaluation?.verdict ?? 'watch',
                  )} · ${watchedSystem.latestRelease?.summary ?? watchedSystem.latestEvaluation?.summary ?? 'Release review still open.'}`
                : 'The current fleet slice does not show a hold or rollback pressure point.'}
            </p>
          </article>
        </div>
      </div>

      <div className="analytics-columns">
        <section className="mini-surface">
          <p className="eyebrow">Pressure leaderboard</p>
          <div className="stack-list">
            {fleet.hottestSystems.length ? (
              fleet.hottestSystems.map((summary) => (
                <button
                  key={summary.system.systemId}
                  type="button"
                  className="stack-list__item stack-list__item--body stack-list__button"
                  onClick={() => onSelectSystem(summary.system.systemId)}
                >
                  <strong>{summary.system.name}</strong>
                  <p>
                    {summary.activeInterventionCount} directives · {summary.executionCount} executions · pressure{' '}
                    {getAgentLabel(
                      systems.find((systemState) => systemState.system.systemId === summary.system.systemId) ?? null,
                      summary.pressureAgentId ?? undefined,
                    ) ?? 'No hot agent'}
                  </p>
                </button>
              ))
            ) : (
              <div className="stack-list__item stack-list__item--body">
                <strong>No hot systems yet</strong>
                <p>Import more systems and traces to build a real fleet pressure picture.</p>
              </div>
            )}
          </div>
        </section>

        <section className="mini-surface">
          <p className="eyebrow">Release watchlist</p>
          <div className="stack-list">
            {fleet.releaseWatchlist.length ? (
              fleet.releaseWatchlist.map((summary) => (
                <button
                  key={summary.system.systemId}
                  type="button"
                  className="stack-list__item stack-list__item--body stack-list__button"
                  onClick={() => onSelectSystem(summary.system.systemId)}
                >
                  <strong>{summary.system.name}</strong>
                  <p>
                    {titleCaseStatus(summary.latestRelease?.decision ?? summary.latestEvaluation?.verdict ?? 'watch')} ·{' '}
                    {summary.latestRelease?.summary ?? summary.latestEvaluation?.summary ?? 'Release review still open.'}
                  </p>
                </button>
              ))
            ) : (
              <div className="stack-list__item stack-list__item--body">
                <strong>No release holds in this window</strong>
                <p>The current fleet slice does not show hold or rollback pressure.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="signal-band fleet-overview-panel__band">
        <article className="signal-band__card">
          <p className="eyebrow">Average spend</p>
          <strong>{formatCredits(fleet.avgCredits)}</strong>
          <p>Average execution cost across the systems in this window.</p>
        </article>
        <article className="signal-band__card signal-band__card--accent">
          <p className="eyebrow">Average duration</p>
          <strong>{formatDuration(fleet.avgDurationMs)}</strong>
          <p>Average execution duration across the systems in this window.</p>
        </article>
        <article className="signal-band__card signal-band__card--directive">
          <p className="eyebrow">Directive load</p>
          <strong>{fleet.activeDirectiveCount} active directives</strong>
          <p>
            {watchedSystem
              ? `Latest watch item ${watchedSystem.system.name} · ${formatDateTime(
                  watchedSystem.latestRelease?.appliedAt ??
                    watchedSystem.latestRelease?.requestedAt ??
                    watchedSystem.latestEvaluation?.createdAt,
                )}`
              : 'No active release watch item in this window.'}
          </p>
        </article>
      </div>
    </section>
  );
}
