import type { AnalyticsWindow, ControlPlaneSystemState } from '../../app/control-plane';
import { getAnalyticsWindowLabel, summarizeFleetAnalytics } from '../../app/control-plane';
import { formatCredits, formatDateTime, formatDuration, titleCaseStatus } from '../../app/format';

interface FleetAnalyticsPanelProps {
  systemState: ControlPlaneSystemState | null;
  analyticsWindow: AnalyticsWindow;
}

export function FleetAnalyticsPanel({ systemState, analyticsWindow }: FleetAnalyticsPanelProps) {
  const analytics = summarizeFleetAnalytics(systemState);

  if (!analytics) {
    return null;
  }

  return (
    <section className="surface">
      <div className="section-header">
        <div>
          <p className="eyebrow">Fleet analytics</p>
          <h2>Pressure, failures, and recent activity</h2>
          <p className="muted">
            This is the first real history layer for the system. It turns persisted executions, spans, directives, and
            release evidence into something an operator can scan fast.
          </p>
        </div>
        <span className="meta-chip">
          {analytics.eventCount} events · {getAnalyticsWindowLabel(analyticsWindow)}
        </span>
      </div>
      <div className="analytics-grid">
        <article className="metric-card metric-card--primary">
          <span>Execution mix</span>
          <strong>
            {analytics.executionStatusCounts.succeeded} ok · {analytics.executionStatusCounts.running} running ·{' '}
            {analytics.executionStatusCounts.failed} failed
          </strong>
        </article>
        <article className="metric-card metric-card--warning">
          <span>Span health</span>
          <strong>
            {analytics.failedSpans} failed of {analytics.totalSpans}
          </strong>
        </article>
        <article className="metric-card metric-card--accent">
          <span>Average spend</span>
          <strong>{formatCredits(analytics.avgCredits)}</strong>
        </article>
        <article className="metric-card metric-card--success">
          <span>Average duration</span>
          <strong>{formatDuration(analytics.avgDurationMs)}</strong>
        </article>
      </div>
      <div className="analytics-columns">
        <section className="mini-surface">
          <p className="eyebrow">Pressure leaderboard</p>
          <div className="stack-list">
            {analytics.hottestAgents.length ? (
              analytics.hottestAgents.map((agent) => (
                <div key={agent.agent.agentId} className="stack-list__item stack-list__item--body">
                  <strong>{agent.agent.label}</strong>
                  <p>
                    {agent.failedSpanCount} failed spans · {agent.activeInterventionCount} active directives · last
                    active {formatDateTime(agent.lastActiveAt ?? undefined)}
                  </p>
                </div>
              ))
            ) : (
              <div className="stack-list__item stack-list__item--body">
                <strong>No hot agents yet</strong>
                <p>Import more spans and directives to build a real pressure leaderboard.</p>
              </div>
            )}
          </div>
        </section>
        <section className="mini-surface">
          <p className="eyebrow">Window posture</p>
          <div className="stack-list">
            <div className="stack-list__item stack-list__item--body">
              <strong>{analytics.executionCount} tracked execution{analytics.executionCount === 1 ? '' : 's'}</strong>
              <p>
                {Math.round(analytics.successRate * 100)}% success · {analytics.activeDirectives} active directives ·
                latest event {formatDateTime(analytics.latestEventAt ?? undefined)}
              </p>
            </div>
            {analytics.recentFailures.length ? (
              analytics.recentFailures.map((event) => (
                <div key={event.eventId} className="stack-list__item stack-list__item--body">
                  <strong>{event.title}</strong>
                  <p>
                    {titleCaseStatus(event.status)} · {formatDateTime(event.occurredAt)} · {event.summary}
                  </p>
                </div>
              ))
            ) : (
              <div className="stack-list__item stack-list__item--body">
                <strong>No failures or holds in this window</strong>
                <p>The selected time scope does not show failed executions, hold evaluations, or rollback releases.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
