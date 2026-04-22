import type { ControlPlaneSystemState } from '../../app/control-plane';
import { getAgentLabel, summarizeSystem } from '../../app/control-plane';
import { formatCredits, formatDuration, titleCaseStatus } from '../../app/format';

interface SystemCatalogPanelProps {
  systems: ControlPlaneSystemState[];
  selectedSystemId: string | null;
  onSelectSystem: (systemId: string) => void;
}

export function SystemCatalogPanel({ systems, selectedSystemId, onSelectSystem }: SystemCatalogPanelProps) {
  return (
    <section className="surface system-catalog">
      <div className="section-header">
        <div>
          <p className="eyebrow">System catalog</p>
          <h2>Registered systems</h2>
          <p className="muted">Pick the system you want to operate, then use Live, Replay, and Optimize against that system instead of a loose demo workflow.</p>
        </div>
        <span className="meta-chip">{systems.length} system{systems.length === 1 ? '' : 's'}</span>
      </div>
      <div className="system-catalog__grid">
        {systems.map((systemState) => {
          const summary = summarizeSystem(systemState);
          if (!summary) {
            return null;
          }

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
      </div>
    </section>
  );
}
