import { useMemo, useState } from 'react';

import type { AgentRosterFocus, AnalyticsWindow, ControlPlaneSystemState } from '../../app/control-plane';
import { filterAgentSummaries, getAnalyticsWindowLabel, summarizeAgents } from '../../app/control-plane';
import { formatCredits, formatDateTime, formatDuration, titleCaseStatus } from '../../app/format';

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
  const featuredAgent = filteredAgents[0] ?? agentSummaries[0] ?? null;

  return (
    <section className="surface agent-fleet-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Agent fleet</p>
          <h2>Searchable agent roster</h2>
          <p className="muted">This is the scalable primary surface for agent management. Find the hot agent here, then use Live for topology context and Replay for the failing path.</p>
        </div>
        <span className="meta-chip">
          {filteredAgents.length} visible · {getAnalyticsWindowLabel(analyticsWindow)}
        </span>
      </div>
      <div className="agent-fleet-panel__spotlight">
        <article className="signal-band__card signal-band__card--directive">
          <p className="eyebrow">Pressure focus</p>
          <strong>{featuredAgent?.agent.label ?? 'No hot agent yet'}</strong>
          <p>
            {featuredAgent
              ? `${featuredAgent.failedSpanCount} failed spans · ${featuredAgent.activeInterventionCount} directives · pressure score ${featuredAgent.pressureScore}`
              : 'Import traces and directives to expose the current pressure point.'}
          </p>
        </article>
        <article className="signal-band__card signal-band__card--accent">
          <p className="eyebrow">Roster posture</p>
          <strong>{agentSummaries.length} tracked agents</strong>
          <p>
            {filteredAgents.length} visible in the current focus. The roster stays practical when you need to isolate hot
            specialists fast.
          </p>
        </article>
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
            <div className="agent-row__header">
              <div className="agent-row__identity">
                <strong>{summary.agent.label}</strong>
                <span>{summary.agent.role ?? summary.agent.kind}</span>
              </div>
              <span className={`status-pill status-pill--${summary.failedSpanCount > 0 ? 'failed' : summary.agent.status ?? 'active'}`}>
                {titleCaseStatus(summary.failedSpanCount > 0 ? 'failed' : summary.agent.status ?? 'active')}
              </span>
            </div>
            <div className="agent-row__chips">
              {summary.agent.capabilities?.slice(0, 2).map((capability) => (
                <span key={capability} className="meta-chip">
                  {capability}
                </span>
              ))}
              {summary.agent.toolRefs?.slice(0, 1).map((toolRef) => (
                <span key={toolRef} className="meta-chip">
                  {toolRef}
                </span>
              ))}
              <span className="meta-chip">Pressure {summary.pressureScore}</span>
            </div>
            <div className="agent-row__metrics agent-row__metrics--grid">
              <div>
                <span>Window success</span>
                <strong>{Math.round(summary.successRate * 100)}%</strong>
              </div>
              <div>
                <span>Failed spans</span>
                <strong>{summary.failedSpanCount}</strong>
              </div>
              <div>
                <span>Avg duration</span>
                <strong>{formatDuration(summary.avgDurationMs)}</strong>
              </div>
              <div>
                <span>Avg spend</span>
                <strong>{formatCredits(summary.avgCredits)}</strong>
              </div>
            </div>
            <div className="agent-row__footer">
              <span>{summary.latestSpan?.name ?? 'No traced span yet'}</span>
              <span>{summary.activeInterventionCount} directives</span>
              <span>{formatDateTime(summary.lastActiveAt ?? undefined)}</span>
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
