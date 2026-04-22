import { useMemo, useState } from 'react';

import type { ControlPlaneSystemState } from '../../app/control-plane';
import {
  filterSystemSummaries,
  getAgentLabel,
  SYSTEM_CATALOG_FOCUS_OPTIONS,
  summarizeSystem,
  type SystemCatalogFocus,
} from '../../app/control-plane';
import { formatCredits, formatDuration, titleCaseStatus } from '../../app/format';

interface SystemCatalogPanelProps {
  systems: ControlPlaneSystemState[];
  selectedSystemId: string | null;
  onSelectSystem: (systemId: string) => void;
}

export function SystemCatalogPanel({ systems, selectedSystemId, onSelectSystem }: SystemCatalogPanelProps) {
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState<SystemCatalogFocus>('all');
  const summaries = useMemo(
    () =>
      systems
        .map((systemState) => ({
          systemState,
          summary: summarizeSystem(systemState),
        }))
        .filter((item): item is { systemState: ControlPlaneSystemState; summary: NonNullable<ReturnType<typeof summarizeSystem>> } => item.summary != null),
    [systems],
  );
  const filteredSystems = useMemo(() => {
    const focused = filterSystemSummaries(
      summaries.map((item) => item.summary),
      focus,
    );
    const focusedIds = new Set(focused.map((summary) => summary.system.systemId));
    const normalizedQuery = query.trim().toLowerCase();

    return summaries.filter(({ systemState, summary }) => {
      if (!focusedIds.has(summary.system.systemId)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystacks = [
        summary.system.name,
        summary.system.description,
        ...summary.system.runtimeIds,
        ...systemState.agents.map((agent) => agent.label),
        ...systemState.agents.map((agent) => agent.role),
      ]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.toLowerCase());

      return haystacks.some((value) => value.includes(normalizedQuery));
    });
  }, [focus, query, summaries]);

  return (
    <section className="surface system-catalog">
      <div className="section-header">
        <div>
          <p className="eyebrow">System catalog</p>
          <h2>Registered systems</h2>
          <p className="muted">Pick the system you want to operate, then use Live, Replay, and Optimize against that system instead of a loose demo workflow.</p>
        </div>
        <span className="meta-chip">{filteredSystems.length} visible</span>
      </div>
      <label className="text-field">
        <span>Filter systems</span>
        <input
          aria-label="Filter systems"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by system, runtime, or agent"
        />
      </label>
      <div className="history-toolbar">
        {SYSTEM_CATALOG_FOCUS_OPTIONS.map((option) => (
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
      <div className="system-catalog__grid">
        {filteredSystems.map(({ systemState, summary }) => {
          const pressureAgentLabel = getAgentLabel(systemState, summary.pressureAgentId ?? undefined);

          return (
            <button
              key={systemState.system.systemId}
              type="button"
              className={`system-card ${selectedSystemId === systemState.system.systemId ? 'system-card--active' : ''}`}
              onClick={() => onSelectSystem(systemState.system.systemId)}
            >
              <div className="system-card__header">
                <div>
                  <p className="eyebrow">System</p>
                  <h3>{summary.system.name}</h3>
                </div>
                <span className={`status-pill status-pill--${summary.latestExecution?.status ?? summary.system.status ?? 'active'}`}>
                  {titleCaseStatus(summary.latestExecution?.status ?? summary.system.status ?? 'active')}
                </span>
              </div>
              <p className="system-card__summary">{summary.system.description ?? 'No system description recorded yet.'}</p>
              <div className="system-card__metrics">
                <div>
                  <span>Agents</span>
                  <strong>{summary.agentCount}</strong>
                </div>
                <div>
                  <span>Executions</span>
                  <strong>{summary.executionCount}</strong>
                </div>
                <div>
                  <span>Avg spend</span>
                  <strong>{formatCredits(summary.avgCredits)}</strong>
                </div>
                <div>
                  <span>Avg duration</span>
                  <strong>{formatDuration(summary.avgDurationMs)}</strong>
                </div>
              </div>
              <div className="system-card__footer">
                <span className="meta-chip">{Math.round(summary.successRate * 100)}% success</span>
                <span className="meta-chip">{summary.activeInterventionCount} active directives</span>
                {pressureAgentLabel ? <span className="meta-chip">Pressure: {pressureAgentLabel}</span> : null}
              </div>
            </button>
          );
        })}
        {!filteredSystems.length ? (
          <div className="stack-list__item stack-list__item--body">
            <strong>No systems match the current filter</strong>
            <p>Broaden the focus or search query to bring more of the fleet back into view.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
