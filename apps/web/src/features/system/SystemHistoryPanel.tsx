import { useMemo, useState } from 'react';

import type { SystemHistoryEvent, ControlPlaneSystemState } from '../../app/control-plane';
import { buildSystemHistoryEvents, getAgentLabel } from '../../app/control-plane';
import { formatDateTime, titleCaseStatus } from '../../app/format';

type HistoryFilter = 'all' | SystemHistoryEvent['kind'];

interface SystemHistoryPanelProps {
  systemState: ControlPlaneSystemState | null;
}

const FILTERS: Array<{ id: HistoryFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'execution', label: 'Executions' },
  { id: 'directive', label: 'Directives' },
  { id: 'evaluation', label: 'Evaluations' },
  { id: 'release', label: 'Releases' },
];

export function SystemHistoryPanel({ systemState }: SystemHistoryPanelProps) {
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const history = useMemo(() => buildSystemHistoryEvents(systemState), [systemState]);
  const filteredHistory = useMemo(() => {
    if (filter === 'all') {
      return history;
    }

    return history.filter((event) => event.kind === filter);
  }, [filter, history]);

  if (!systemState) {
    return null;
  }

  return (
    <section className="surface">
      <div className="section-header">
        <div>
          <p className="eyebrow">Recent history</p>
          <h2>What changed in this system</h2>
          <p className="muted">
            This is the queryable operator timeline: executions, directives, evaluations, and release decisions in one
            stream.
          </p>
        </div>
        <span className="meta-chip">{history.length} events</span>
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
      <div className="history-timeline">
        {filteredHistory.length ? (
          filteredHistory.slice(0, 10).map((event) => {
            const agentLabel = event.relatedAgentId ? getAgentLabel(systemState, event.relatedAgentId) : null;

            return (
              <article key={event.eventId} className="history-item">
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
