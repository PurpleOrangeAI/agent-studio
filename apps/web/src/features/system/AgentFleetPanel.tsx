import { useMemo, useState } from 'react';

import type { AgentRosterFocus, AnalyticsWindow, ControlPlaneSystemState } from '../../app/control-plane';
import { filterAgentSummaries, getAnalyticsWindowLabel, summarizeAgents } from '../../app/control-plane';
import { formatCredits, formatDuration, titleCaseStatus } from '../../app/format';

interface AgentFleetPanelProps {
  systemState: ControlPlaneSystemState | null;
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
  analyticsWindow: AnalyticsWindow;
}

const FOCUS_OPTIONS: Array<{ id: AgentRosterFocus; label: string }> = [
  { id: 'all', label: 'All agents' },
  { id: 'attention', label: 'Needs attention' },
  { id: 'failures', label: 'Failures' },
  { id: 'directives', label: 'Directives' },
];

export function AgentFleetPanel({ systemState, selectedAgentId, onSelectAgent, analyticsWindow }: AgentFleetPanelProps) {
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState<AgentRosterFocus>('all');
  const agentSummaries = useMemo(() => summarizeAgents(systemState), [systemState]);
  const filteredAgents = useMemo(() => {
    const focusedAgents = filterAgentSummaries(agentSummaries, focus);
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return focusedAgents;
    }

    return focusedAgents.filter((summary) => {
      const haystacks = [
        summary.agent.label,
        summary.agent.role,
        summary.agent.kind,
        ...(summary.agent.capabilities ?? []),
        ...(summary.agent.toolRefs ?? []),
      ]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.toLowerCase());

      return haystacks.some((value) => value.includes(normalizedQuery));
    });
  }, [agentSummaries, focus, query]);

  return (
    <section className="surface">
      <div className="section-header">
        <div>
          <p className="eyebrow">Agent fleet</p>
          <h2>Searchable agent roster</h2>
          <p className="muted">This is the scalable primary surface. Use the roster to find the hot agent first, then use Live for topology context.</p>
        </div>
        <span className="meta-chip">
          {filteredAgents.length} visible · {getAnalyticsWindowLabel(analyticsWindow)}
        </span>
      </div>
      <label className="text-field">
        <span>Filter agents</span>
        <input
          aria-label="Filter agents"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by role, capability, tool, or agent name"
        />
      </label>
      <div className="history-toolbar">
        {FOCUS_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`history-filter ${focus === option.id ? 'history-filter--active' : ''}`}
            onClick={() => setFocus(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="agent-fleet__list">
        {filteredAgents.map((summary) => (
          <button
            key={summary.agent.agentId}
            type="button"
            className={`agent-row ${selectedAgentId === summary.agent.agentId ? 'agent-row--active' : ''}`}
            onClick={() => onSelectAgent(summary.agent.agentId)}
          >
            <div className="agent-row__identity">
              <strong>{summary.agent.label}</strong>
              <span>{summary.agent.role ?? summary.agent.kind}</span>
            </div>
            <div className="agent-row__metrics">
              <span className={`status-pill status-pill--${summary.failedSpanCount > 0 ? 'failed' : summary.agent.status ?? 'active'}`}>
                {titleCaseStatus(summary.failedSpanCount > 0 ? 'failed' : summary.agent.status ?? 'active')}
              </span>
              <span>{summary.spanCount} spans</span>
              <span>{Math.round(summary.successRate * 100)}% success</span>
              <span>{formatDuration(summary.avgDurationMs)}</span>
              <span>{formatCredits(summary.avgCredits)}</span>
              <span>{summary.activeInterventionCount} directives</span>
            </div>
          </button>
        ))}
        {!filteredAgents.length ? (
          <div className="stack-list__item stack-list__item--body">
            <strong>No agents match the current fleet filter</strong>
            <p>Broaden the focus or time window to bring more of the fleet back into view.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
