import type { ControlPlaneSystemState } from '../../app/control-plane';
import { summarizeFleetAnalytics } from '../../app/control-plane';
import { formatDateTime, titleCaseStatus } from '../../app/format';

interface FleetAnalyticsPanelProps {
  systemState: ControlPlaneSystemState | null;
}

export function FleetAnalyticsPanel({ systemState }: FleetAnalyticsPanelProps) {
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
        <span className="meta-chip">{analytics.recentEventCount7d} events in 7d</span>
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
          <span>Active directives</span>
          <strong>{analytics.activeDirectives}</strong>
        </article>
        <article className="metric-card metric-card--success">
          <span>Recent activity</span>
          <strong>{analytics.recentEventCount24h} in last 24h</strong>
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
          <p className="eyebrow">Recent failures and holds</p>
          <div className="stack-list">
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
                <strong>No recent failures</strong>
                <p>The current history does not show failed executions, hold evaluations, or rollback releases.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
