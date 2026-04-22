import type { ControlPlaneSystemState } from '../../app/control-plane';
import { getMetricDelta, summarizeAgents, summarizeSystem } from '../../app/control-plane';
import { formatCredits, formatDateTime, formatDelta, formatDuration, titleCaseStatus } from '../../app/format';

interface SystemPerformancePanelProps {
  systemState: ControlPlaneSystemState | null;
}

export function SystemPerformancePanel({ systemState }: SystemPerformancePanelProps) {
  const summary = summarizeSystem(systemState);
  const topAgents = summarizeAgents(systemState).slice(0, 2);
  const latestEvaluation = summary?.latestEvaluation ?? null;
  const latestRelease = summary?.latestRelease ?? null;
  const creditsDelta = getMetricDelta(latestEvaluation, 'credits.actual');
  const durationDelta = getMetricDelta(latestEvaluation, 'duration.ms');

  if (!summary) {
    return null;
  }

  return (
    <section className="surface">
      <div className="section-header">
        <div>
          <p className="eyebrow">Performance cockpit</p>
          <h2>{summary.system.name}</h2>
          <p className="muted">Use this before you enter the rooms. It gives the current operating posture, the release posture, and the hottest agents in one place.</p>
        </div>
        <span className={`status-pill status-pill--${summary.latestExecution?.status ?? summary.system.status ?? 'active'}`}>
          {titleCaseStatus(summary.latestExecution?.status ?? summary.system.status ?? 'active')}
        </span>
      </div>
      <div className="metric-grid">
        <div className="metric-card metric-card--primary">
          <span>Latest execution</span>
          <strong>{summary.latestExecution?.metadata?.experimentLabel?.toString() ?? 'No execution yet'}</strong>
        </div>
        <div className="metric-card">
          <span>Avg spend</span>
          <strong>{formatCredits(summary.avgCredits)}</strong>
        </div>
        <div className="metric-card metric-card--accent">
          <span>Avg duration</span>
          <strong>{formatDuration(summary.avgDurationMs)}</strong>
        </div>
        <div className="metric-card metric-card--success">
          <span>Success rate</span>
          <strong>{Math.round(summary.successRate * 100)}%</strong>
        </div>
      </div>
      <div className="signal-band">
        <article className="signal-band__card">
          <p className="eyebrow">Execution posture</p>
          <strong>{summary.latestExecution?.status ? titleCaseStatus(summary.latestExecution.status) : 'No execution'}</strong>
          <p>{summary.latestExecution ? formatDateTime(summary.latestExecution.finishedAt ?? summary.latestExecution.startedAt) : 'No execution timestamp recorded yet.'}</p>
        </article>
        <article className="signal-band__card signal-band__card--accent">
          <p className="eyebrow">Release posture</p>
          <strong>{latestRelease ? titleCaseStatus(latestRelease.decision) : 'No release decision'}</strong>
          <p>{latestRelease?.summary ?? latestEvaluation?.summary ?? 'No release audit has been recorded yet.'}</p>
        </article>
        <article className="signal-band__card signal-band__card--directive">
          <p className="eyebrow">Hottest agents</p>
          <strong>{topAgents.map((agent) => agent.agent.label).join(' · ') || 'No active agents'}</strong>
          <p>{topAgents[0] ? `${topAgents[0].activeInterventionCount} directives · ${topAgents[0].failedSpanCount} failed spans` : 'No pressure signal recorded.'}</p>
        </article>
      </div>
      {(creditsDelta || durationDelta || latestRelease) ? (
        <div className="inline-callout inline-callout--success">
          <span className="eyebrow">Release audit</span>
          <p>
            {latestRelease?.summary ?? latestEvaluation?.summary ?? 'No release summary recorded.'}
            {creditsDelta ? ` Credits delta ${formatDelta(creditsDelta.delta ?? 0)}.` : ''}
            {durationDelta ? ` Duration delta ${formatDelta(Math.round((durationDelta.delta ?? 0) / 1000))}s.` : ''}
          </p>
        </div>
      ) : null}
      {topAgents.length ? (
        <div className="stack-list">
          {topAgents.map((agent) => (
            <div key={agent.agent.agentId} className="stack-list__item stack-list__item--body">
              <strong>{agent.agent.label}</strong>
              <p>
                {Math.round(agent.successRate * 100)}% success · {formatCredits(agent.totalCredits)} total credits · last active{' '}
                {formatDateTime(agent.lastActiveAt ?? undefined)}
                {agent.latestSpan ? ` · latest span ${agent.latestSpan.name}` : ''}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
