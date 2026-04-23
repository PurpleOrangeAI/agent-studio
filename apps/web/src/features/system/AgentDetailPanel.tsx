import type { ControlPlaneSystemState } from '../../app/control-plane';
import { summarizeAgent } from '../../app/control-plane';
import { formatCredits, formatDateTime, formatDuration, titleCaseStatus } from '../../app/format';

interface AgentDetailPanelProps {
  systemState: ControlPlaneSystemState | null;
  agentId: string | null;
}

export function AgentDetailPanel({ systemState, agentId }: AgentDetailPanelProps) {
  const summary = agentId ? summarizeAgent(systemState, agentId) : null;

  if (!summary) {
    return (
      <section className="surface agent-detail-panel">
        <div className="section-header">
          <div>
            <p className="eyebrow">Agent detail</p>
            <h2>Select an agent</h2>
          </div>
        </div>
        <p className="muted">Pick an agent from the fleet to inspect recent activity, directives, and runtime profile.</p>
      </section>
    );
  }

  return (
    <section className="surface agent-detail-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Agent detail</p>
          <h2>{summary.agent.label}</h2>
          <p className="muted">{summary.agent.role ?? summary.agent.kind}</p>
        </div>
        <span className={`status-pill status-pill--${summary.failedSpanCount > 0 ? 'failed' : summary.agent.status ?? 'active'}`}>
          {titleCaseStatus(summary.failedSpanCount > 0 ? 'failed' : summary.agent.status ?? 'active')}
        </span>
      </div>
      <div className="metric-grid">
        <div className="metric-card">
          <span>Spans</span>
          <strong>{summary.spanCount}</strong>
        </div>
        <div className="metric-card metric-card--warning">
          <span>Failures</span>
          <strong>{summary.failedSpanCount}</strong>
        </div>
        <div className="metric-card metric-card--accent">
          <span>Avg duration</span>
          <strong>{formatDuration(summary.avgDurationMs)}</strong>
        </div>
        <div className="metric-card metric-card--primary">
          <span>Total credits</span>
          <strong>{formatCredits(summary.totalCredits)}</strong>
        </div>
      </div>
      <div className="detail-stack">
        <div className="mini-surface">
          <p className="eyebrow">Runtime profile</p>
          <div className="stack-list">
            <div className="stack-list__item stack-list__item--body">
              <strong>Version</strong>
              <p>{summary.agent.version ?? 'Unknown version'}</p>
            </div>
            <div className="stack-list__item stack-list__item--body">
              <strong>Capabilities</strong>
              <p>{summary.agent.capabilities?.join(', ') || 'No capabilities recorded.'}</p>
            </div>
            <div className="stack-list__item stack-list__item--body">
              <strong>Tools</strong>
              <p>{summary.agent.toolRefs?.join(', ') || 'No tools recorded.'}</p>
            </div>
          </div>
        </div>
        <div className="mini-surface">
          <p className="eyebrow">Latest trace</p>
          <div className="stack-list">
            <div className="stack-list__item stack-list__item--body">
              <strong>{summary.latestSpan?.name ?? 'No span recorded.'}</strong>
              <p>{summary.latestSpan?.summary ?? 'This agent has not emitted a traced span yet.'}</p>
            </div>
            {summary.latestSpan ? (
              <div className="stack-list__item stack-list__item--body">
                <strong>{titleCaseStatus(summary.latestSpan.status)}</strong>
                <p>
                  {formatDateTime(summary.latestSpan.finishedAt ?? summary.latestSpan.startedAt)} ·{' '}
                  {formatDuration(summary.latestSpan.usage?.durationMs)} · {formatCredits(summary.latestSpan.usage?.credits)}
                </p>
              </div>
            ) : null}
          </div>
        </div>
        <div className="mini-surface">
          <p className="eyebrow">Directive state</p>
          <div className="stack-list">
            <div className="stack-list__item stack-list__item--body">
              <strong>{summary.activeInterventionCount} active directives</strong>
              <p>{summary.latestIntervention?.reason ?? 'No intervention history recorded for this agent.'}</p>
            </div>
            {summary.latestIntervention ? (
              <div className="stack-list__item stack-list__item--body">
                <strong>{summary.latestIntervention.action}</strong>
                <p>{formatDateTime(summary.latestIntervention.appliedAt ?? summary.latestIntervention.requestedAt)}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
