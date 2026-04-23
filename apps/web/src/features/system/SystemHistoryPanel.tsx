import { useMemo, useState } from 'react';

import type { AnalyticsWindow, SystemHistoryEvent, ControlPlaneSystemState } from '../../app/control-plane';
import { buildSystemHistoryEvents, getAgentLabel, getAnalyticsWindowLabel } from '../../app/control-plane';
import { formatDateTime, titleCaseStatus } from '../../app/format';

type HistoryFilter = 'all' | SystemHistoryEvent['kind'];
type HistoryStatusFilter = 'all' | 'attention' | 'healthy' | 'active';

interface SystemHistoryPanelProps {
  systemState: ControlPlaneSystemState | null;
  analyticsWindow: AnalyticsWindow;
}

const FILTERS: Array<{ id: HistoryFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'execution', label: 'Executions' },
  { id: 'directive', label: 'Directives' },
  { id: 'evaluation', label: 'Evaluations' },
  { id: 'release', label: 'Releases' },
];

const STATUS_FILTERS: Array<{ id: HistoryStatusFilter; label: string }> = [
  { id: 'all', label: 'All statuses' },
  { id: 'attention', label: 'Attention' },
  { id: 'healthy', label: 'Healthy' },
  { id: 'active', label: 'Active' },
];

function getHistoryTone(status: string) {
  if (['failed', 'hold', 'rollback'].includes(status)) {
    return 'attention';
  }

  if (['succeeded', 'approved', 'promoted', 'released'].includes(status)) {
    return 'healthy';
  }

  return 'active';
}

function matchesStatusFilter(event: SystemHistoryEvent, filter: HistoryStatusFilter) {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'attention') {
    return ['failed', 'hold', 'rollback'].includes(event.status);
  }

  if (filter === 'healthy') {
    return ['succeeded', 'approved', 'promoted', 'released'].includes(event.status);
  }

  return ['running', 'active', 'applied', 'recorded'].includes(event.status);
}

export function SystemHistoryPanel({ systemState, analyticsWindow }: SystemHistoryPanelProps) {
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>('all');
  const history = useMemo(() => buildSystemHistoryEvents(systemState), [systemState]);
  const eventCounts = useMemo(
    () => ({
      execution: history.filter((event) => event.kind === 'execution').length,
      directive: history.filter((event) => event.kind === 'directive').length,
      evaluation: history.filter((event) => event.kind === 'evaluation').length,
      release: history.filter((event) => event.kind === 'release').length,
    }),
    [history],
  );
  const filteredHistory = useMemo(() => {
    return history.filter((event) => {
      const matchesKind = filter === 'all' ? true : event.kind === filter;
      return matchesKind && matchesStatusFilter(event, statusFilter);
    });
  }, [filter, history, statusFilter]);

  if (!systemState) {
    return null;
  }

  return (
    <section className="surface history-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Recent history</p>
          <h2>What changed in this system</h2>
          <p className="muted">
            This is the queryable operator timeline: executions, directives, evaluations, and release decisions in one
            stream.
          </p>
        </div>
        <span className="meta-chip">
          {filteredHistory.length} events · {getAnalyticsWindowLabel(analyticsWindow)}
        </span>
      </div>
      <div className="history-overview">
        <article className="mini-surface history-overview__card">
          <span className="eyebrow">Executions</span>
          <strong>{eventCounts.execution}</strong>
          <p>Run-level changes and posture updates.</p>
        </article>
        <article className="mini-surface history-overview__card">
          <span className="eyebrow">Directives</span>
          <strong>{eventCounts.directive}</strong>
          <p>Manual interventions and live operator guidance.</p>
        </article>
        <article className="mini-surface history-overview__card">
          <span className="eyebrow">Evaluations</span>
          <strong>{eventCounts.evaluation}</strong>
          <p>Comparisons that shaped release judgment.</p>
        </article>
        <article className="mini-surface history-overview__card">
          <span className="eyebrow">Releases</span>
          <strong>{eventCounts.release}</strong>
          <p>Promotion, hold, and rollback decisions.</p>
        </article>
      </div>
      <div className="history-toolbar">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`history-filter ${filter === item.id ? 'history-filter--active' : ''}`}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="history-toolbar">
        {STATUS_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`history-filter ${statusFilter === item.id ? 'history-filter--active' : ''}`}
            onClick={() => setStatusFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="history-timeline">
        {filteredHistory.length ? (
          filteredHistory.slice(0, 10).map((event) => {
            const agentLabel = event.relatedAgentId ? getAgentLabel(systemState, event.relatedAgentId) : null;
            const tone = getHistoryTone(event.status);

            return (
              <article key={event.eventId} className={`history-item history-item--${tone}`}>
                <div className="history-item__header">
                  <div>
                    <p className="eyebrow">{titleCaseStatus(event.kind)}</p>
                    <h3>{event.title}</h3>
                  </div>
                  <span className={`status-pill status-pill--${event.status === 'hold' ? 'failed' : event.status}`}>
                    {titleCaseStatus(event.status)}
                  </span>
                </div>
                <p className="history-item__summary">{event.summary}</p>
                <div className="history-item__meta">
                  <span>{formatDateTime(event.occurredAt)}</span>
                  {agentLabel ? <span>{agentLabel}</span> : null}
                  {event.relatedExecutionId ? <span>{event.relatedExecutionId}</span> : null}
                </div>
              </article>
            );
          })
        ) : (
          <article className="history-item">
            <div className="history-item__header">
              <div>
                <p className="eyebrow">No history</p>
                <h3>No matching events yet</h3>
              </div>
            </div>
            <p className="history-item__summary">Import traces, directives, evaluations, or releases to populate the operator timeline.</p>
          </article>
        )}
      </div>
    </section>
  );
}
