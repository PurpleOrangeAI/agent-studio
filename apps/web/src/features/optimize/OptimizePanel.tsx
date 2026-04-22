import { useEffect, useState } from 'react';

import type { Replay, Run, SavedPlan } from '@agent-studio/contracts';

import type { ControlPlaneSystemState } from '../../app/control-plane';
import {
  getAgentLabel,
  getExecutionForRun,
  getExecutionSpans,
  getLatestEvaluation,
  getLatestReleaseDecision,
  getMetricDelta,
  summarizeAgents,
} from '../../app/control-plane';
import { formatCredits, formatDateTime, formatDelta, formatDuration, titleCaseStatus } from '../../app/format';

type ComposerScope = 'system' | 'agent';
type SystemAction = 'release.hold' | 'release.promote' | 'release.rollback';
type AgentAction = 'directive.cheaper' | 'directive.review' | 'directive.promote';

interface ActionOption<T extends string> {
  value: T;
  label: string;
  summary: string;
}

interface OptimizePanelProps {
  baselineRun: Run;
  candidateRun: Run;
  candidateReplay: Replay;
  candidatePlan: SavedPlan | null;
  promotionSummary: string;
  controlPlane?: ControlPlaneSystemState | null;
}

const SYSTEM_ACTIONS: ActionOption<SystemAction>[] = [
  {
    value: 'release.hold',
    label: 'Hold release',
    summary: 'Pause the system release while we collect another round of evidence.',
  },
  {
    value: 'release.promote',
    label: 'Promote candidate',
    summary: 'Carry the current candidate into the live system once the release call is clear.',
  },
  {
    value: 'release.rollback',
    label: 'Prepare rollback',
    summary: 'Keep the baseline hot and make the rollback path explicit before widening.',
  },
];

const AGENT_ACTIONS: ActionOption<AgentAction>[] = [
  {
    value: 'directive.review',
    label: 'Raise review pressure',
    summary: 'Tighten review on one agent before widening the candidate across the system.',
  },
  {
    value: 'directive.cheaper',
    label: 'Lower spend',
    summary: 'Push one agent toward a cheaper posture while preserving the release guardrail.',
  },
  {
    value: 'directive.promote',
    label: 'Promote behavior',
    summary: 'Push the candidate behavior into one agent first as a bounded intervention.',
  },
];

function formatTokenLabel(value: string) {
  return value
    .split(/[._-]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function readMetadataNumber(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];

  return typeof value === 'number' ? value : null;
}

function readConfigPatchPhases(configPatch: unknown) {
  if (!configPatch || typeof configPatch !== 'object' || Array.isArray(configPatch)) {
    return [];
  }

  const phases = (configPatch as Record<string, unknown>).phases;

  return Array.isArray(phases) ? phases.filter((phase): phase is string => typeof phase === 'string') : [];
}

function formatMetricValue(metric: string, value?: number | null, unit?: string) {
  if (value == null) {
    return '—';
  }

  if (metric === 'credits.actual') {
    return formatCredits(value);
  }

  if (metric === 'duration.ms') {
    return formatDuration(value);
  }

  return unit ? `${value} ${unit}` : `${value}`;
}

function formatMetricDelta(metric: string, value?: number | null, unit?: string) {
  if (value == null) {
    return '—';
  }

  if (metric === 'credits.actual') {
    return `${formatDelta(value)} ${Math.abs(Math.round(value)) === 1 ? 'credit' : 'credits'}`;
  }

  if (metric === 'duration.ms') {
    return `${formatDelta(Math.round(value / 1000))}s`;
  }

  return unit ? `${formatDelta(value)} ${unit}` : formatDelta(value);
}

function buildSuggestedReason(args: {
  scope: ComposerScope;
  action: AgentAction | SystemAction;
  targetLabel: string;
  targetEvidence: string | null;
  evaluationSummary: string | null;
  releaseSummary: string | null;
  promotionSummary: string;
}) {
  const supportingEvidence =
    args.targetEvidence ?? args.evaluationSummary ?? args.releaseSummary ?? args.promotionSummary;

  if (args.scope === 'system') {
    if (args.action === 'release.promote') {
      return args.releaseSummary ?? args.evaluationSummary ?? args.promotionSummary;
    }

    if (args.action === 'release.rollback') {
      return `Keep ${args.targetLabel} on the baseline until the release evidence is cleaner. ${supportingEvidence}`;
    }

    return `Hold the release for ${args.targetLabel} until another evaluation confirms the candidate is safe to widen. ${supportingEvidence}`;
  }

  if (args.action === 'directive.cheaper') {
    return `${args.targetLabel} is the cleanest place to trim spend before touching the rest of the system. ${supportingEvidence}`;
  }

  if (args.action === 'directive.promote') {
    return `${args.targetLabel} can adopt the candidate behavior next because the release evidence is already favorable. ${supportingEvidence}`;
  }

  return `Raise review pressure on ${args.targetLabel} before widening the release. ${supportingEvidence}`;
}

export function OptimizePanel({
  baselineRun,
  candidateRun,
  candidateReplay,
  candidatePlan,
  promotionSummary,
  controlPlane,
}: OptimizePanelProps) {
  const latestEvaluation = getLatestEvaluation(controlPlane);
  const latestRelease = getLatestReleaseDecision(controlPlane);
  const latestIntervention = controlPlane?.interventions[0] ?? null;
  const candidateExecution = getExecutionForRun(controlPlane, candidateRun.runId);
  const candidateSpans = getExecutionSpans(controlPlane, candidateExecution?.executionId);
  const agentSummaries = summarizeAgents(controlPlane);
  const creditsDelta = getMetricDelta(latestEvaluation, 'credits.actual');
  const durationDelta = getMetricDelta(latestEvaluation, 'duration.ms');
  const creditDelta = creditsDelta?.delta ?? ((candidateRun.actualCredits ?? 0) - (baselineRun.actualCredits ?? 0));
  const durationDeltaMs = durationDelta?.delta ?? ((candidateRun.durationMs ?? 0) - (baselineRun.durationMs ?? 0));
  const durationDeltaSeconds = Math.round(durationDeltaMs / 1000);
  const releaseDecisionLabel =
    latestRelease?.decision === 'rollback'
      ? 'Rollback-ready'
      : latestRelease?.decision === 'promote'
        ? 'Promotion-ready'
        : latestRelease?.decision
          ? formatTokenLabel(latestRelease.decision)
          : 'Promotion-ready';
  const releaseLogic =
    latestEvaluation?.summary ??
    latestRelease?.summary ??
    'The candidate is worth shipping because it kept the review guardrail intact while reducing spend and tightening the loop.';
  const releaseConfidence = readMetadataNumber(latestRelease?.metadata, 'confidence');
  const releaseCreditsDelta = readMetadataNumber(latestRelease?.metadata, 'creditsDelta');
  const releaseDurationDelta = readMetadataNumber(latestRelease?.metadata, 'durationDelta');
  const recommendedAgentId =
    (latestIntervention?.targetScopeType === 'agent' ? latestIntervention.targetScopeId : null) ??
    candidateSpans.find((span) => span.agentId)?.agentId ??
    agentSummaries[0]?.agent.agentId ??
    controlPlane?.agents[0]?.agentId ??
    '';

  const [composerScope, setComposerScope] = useState<ComposerScope>('system');
  const [systemAction, setSystemAction] = useState<SystemAction>('release.hold');
  const [agentAction, setAgentAction] = useState<AgentAction>('directive.review');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [reasonDraft, setReasonDraft] = useState('');

  useEffect(() => {
    const hasSelectedAgent = selectedAgentId
      ? agentSummaries.some((summary) => summary.agent.agentId === selectedAgentId)
      : false;

    if (!hasSelectedAgent && recommendedAgentId) {
      setSelectedAgentId(recommendedAgentId);
    }
  }, [agentSummaries, recommendedAgentId, selectedAgentId]);

  const selectedAgentSummary =
    agentSummaries.find((summary) => summary.agent.agentId === selectedAgentId) ?? agentSummaries[0] ?? null;
  const selectedAgentTrace = candidateSpans.find((span) => span.agentId === selectedAgentSummary?.agent.agentId) ?? null;
  const activeAction = composerScope === 'system' ? systemAction : agentAction;
  const activeActionOption =
    composerScope === 'system'
      ? SYSTEM_ACTIONS.find((option) => option.value === systemAction)
      : AGENT_ACTIONS.find((option) => option.value === agentAction);
  const targetLabel = composerScope === 'system' ? controlPlane?.system.name ?? candidateReplay.workflow.name : selectedAgentSummary?.agent.label ?? 'Selected agent';
  const targetScopeId =
    composerScope === 'system' ? controlPlane?.system.systemId ?? candidateReplay.workflow.workflowId : selectedAgentSummary?.agent.agentId ?? selectedAgentId;
  const targetEvidence =
    composerScope === 'system'
      ? latestRelease?.summary ?? latestEvaluation?.summary ?? null
      : selectedAgentSummary?.latestIntervention?.reason ??
        selectedAgentSummary?.latestSpan?.summary ??
        selectedAgentTrace?.summary ??
        null;
  const composerReason =
    reasonDraft.trim() ||
    buildSuggestedReason({
      scope: composerScope,
      action: activeAction,
      targetLabel,
      targetEvidence,
      evaluationSummary: latestEvaluation?.summary ?? null,
      releaseSummary: latestRelease?.summary ?? null,
      promotionSummary,
    });
  const draftStatus =
    composerScope === 'system'
      ? systemAction === 'release.rollback'
        ? 'failed'
        : systemAction === 'release.promote'
          ? 'succeeded'
          : 'active'
      : agentAction === 'directive.review'
        ? 'active'
        : agentAction === 'directive.promote'
          ? 'succeeded'
          : 'active';
  const draftEvidenceRef =
    latestEvaluation?.evaluationId ?? latestRelease?.releaseId ?? candidateExecution?.executionId ?? candidateRun.runId;
  const latestInterventionPhases = readConfigPatchPhases(latestIntervention?.configPatch);

  return (
    <div className="room-stack">
      <section className="surface">
        <div className="section-header">
          <div>
            <p className="eyebrow">Release workbench</p>
            <h3>{candidateRun.experimentLabel}</h3>
          </div>
          <span className={`status-pill status-pill--${latestRelease?.decision === 'rollback' ? 'failed' : 'succeeded'}`}>
            {releaseDecisionLabel}
          </span>
        </div>
        <p className="feature-summary">
          {latestRelease?.summary ?? promotionSummary} Optimize now stays scoped to interventions and release work that the control plane can already explain.
        </p>
        <div className="metric-grid">
          <div className="metric-card">
            <span>Baseline</span>
            <strong>{formatCredits(creditsDelta?.baselineValue ?? baselineRun.actualCredits)}</strong>
          </div>
          <div className="metric-card metric-card--primary">
            <span>Candidate</span>
            <strong>{formatCredits(creditsDelta?.candidateValue ?? candidateRun.actualCredits)}</strong>
          </div>
          <div className="metric-card metric-card--success">
            <span>Credits delta</span>
            <strong>{formatDelta(creditDelta)}</strong>
          </div>
          <div className="metric-card metric-card--accent">
            <span>Duration delta</span>
            <strong>{formatDelta(durationDeltaSeconds)}s</strong>
          </div>
        </div>
        <div className="signal-band">
          <article className="signal-band__card">
            <span className="eyebrow">Latest evaluation</span>
            <strong>{latestEvaluation ? titleCaseStatus(latestEvaluation.verdict) : 'Candidate fallback'}</strong>
            <p>{latestEvaluation?.summary ?? candidatePlan?.notes ?? 'No evaluation is recorded yet, so the saved candidate story stays in front.'}</p>
          </article>
          <article className="signal-band__card signal-band__card--accent">
            <span className="eyebrow">Latest release</span>
            <strong>{latestRelease ? formatTokenLabel(latestRelease.decision) : 'Promotion story'}</strong>
            <p>{latestRelease?.summary ?? promotionSummary}</p>
          </article>
          <article className="signal-band__card signal-band__card--directive">
            <span className="eyebrow">Scoped target</span>
            <strong>{composerScope === 'system' ? targetLabel : selectedAgentSummary?.agent.label ?? 'Pick an agent'}</strong>
            <p>
              {composerScope === 'system'
                ? 'System-level release action staged from the latest evaluation and release call.'
                : targetEvidence ?? 'Use the agent selector to scope the next intervention.'}
            </p>
          </article>
        </div>
        <div className="inline-callout inline-callout--success">
          <span className="eyebrow">Release logic</span>
          <p>{releaseLogic}</p>
        </div>
        {candidateExecution ? (
          <div className="inline-callout">
            <span className="eyebrow">Candidate execution</span>
            <p>
              Optimize is reading execution <strong>{candidateExecution.executionId}</strong> directly with{' '}
              <strong>{candidateSpans.length}</strong> traced spans behind this candidate.
            </p>
          </div>
        ) : null}
      </section>

      <section className="surface">
        <div className="section-header">
          <div>
            <p className="eyebrow">Scoped intervention</p>
            <h3>Compose from current control-plane evidence</h3>
          </div>
          <span className="meta-chip">{composerScope === 'system' ? 'system target' : 'agent target'}</span>
        </div>
        <p className="feature-summary">
          This composer stays intentionally bounded: it lets you shape the next intervention around the current system or one agent without inventing a second release workflow.
        </p>
        <div className="optimize-workbench">
          <div className="mini-surface">
            <div className="optimize-composer__grid">
              <label className="select-field">
                <span>Target scope</span>
                <select value={composerScope} onChange={(event) => setComposerScope(event.target.value as ComposerScope)}>
                  <option value="system">System</option>
                  <option value="agent">Agent</option>
                </select>
              </label>
              {composerScope === 'agent' ? (
                <label className="select-field">
                  <span>Agent target</span>
                  <select value={selectedAgentSummary?.agent.agentId ?? ''} onChange={(event) => setSelectedAgentId(event.target.value)}>
                    {agentSummaries.map((summary) => (
                      <option key={summary.agent.agentId} value={summary.agent.agentId}>
                        {summary.agent.label}
                      </option>
                    ))}
                  </select>
                  <small>
                    {selectedAgentSummary
                      ? `${selectedAgentSummary.failedSpanCount} failed spans, ${selectedAgentSummary.activeInterventionCount} active directives`
                      : 'No agent pressure data is available yet.'}
                  </small>
                </label>
              ) : (
                <div className="mini-note">
                  <span className="eyebrow">System target</span>
                  <strong>{controlPlane?.system.name ?? candidateReplay.workflow.name}</strong>
                  <p className="muted">
                    Use this when the next move is a release call or a system-wide guardrail, not a single-agent correction.
                  </p>
                </div>
              )}
            </div>
            <label className="select-field">
              <span>{composerScope === 'system' ? 'Release action' : 'Agent action'}</span>
              <select
                value={activeAction}
                onChange={(event) =>
                  composerScope === 'system'
                    ? setSystemAction(event.target.value as SystemAction)
                    : setAgentAction(event.target.value as AgentAction)
                }
              >
                {(composerScope === 'system' ? SYSTEM_ACTIONS : AGENT_ACTIONS).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <small>{activeActionOption?.summary}</small>
            </label>
            <label className="text-field">
              <span>Intervention reason</span>
              <textarea
                value={reasonDraft}
                onChange={(event) => setReasonDraft(event.target.value)}
                placeholder="Use the live evidence on the right or keep the suggested rationale."
              />
            </label>
            <div className={`inline-callout inline-callout--${draftStatus === 'failed' ? 'warning' : 'success'}`}>
              <span className="eyebrow">Draft intervention</span>
              <p>{composerReason}</p>
              <div className="optimize-composer__meta">
                <span className={`status-pill status-pill--${draftStatus}`}>{formatTokenLabel(activeAction)}</span>
                <span className="meta-chip">{composerScope}</span>
                <span className="meta-chip">{targetScopeId}</span>
                <span className="meta-chip">{draftEvidenceRef}</span>
              </div>
            </div>
          </div>

          <div className="mini-surface">
            <p className="eyebrow">Latest evidence</p>
            <div className="stack-list">
              <div className="stack-list__item stack-list__item--body">
                <strong>{latestEvaluation ? `${titleCaseStatus(latestEvaluation.verdict)} evaluation` : 'Candidate fallback story'}</strong>
                <p>{latestEvaluation?.summary ?? candidatePlan?.notes ?? promotionSummary}</p>
                <div className="optimize-record__meta">
                  <span className="meta-chip">{latestEvaluation ? formatDateTime(latestEvaluation.createdAt) : 'Saved candidate'}</span>
                  <span className="meta-chip">
                    {latestEvaluation ? `${latestEvaluation.baselineRefs.length} baseline ref${latestEvaluation.baselineRefs.length === 1 ? '' : 's'}` : baselineRun.runId}
                  </span>
                  <span className="meta-chip">
                    {latestEvaluation ? `${latestEvaluation.candidateRefs.length} candidate ref${latestEvaluation.candidateRefs.length === 1 ? '' : 's'}` : candidateRun.runId}
                  </span>
                </div>
              </div>
              {latestEvaluation?.metricDeltas?.map((metric) => (
                <div key={metric.metric} className="stack-list__item stack-list__item--body">
                  <strong>{formatTokenLabel(metric.metric)}</strong>
                  <p>
                    Baseline {formatMetricValue(metric.metric, metric.baselineValue, metric.unit)} · Candidate{' '}
                    {formatMetricValue(metric.metric, metric.candidateValue, metric.unit)} · Delta{' '}
                    {formatMetricDelta(metric.metric, metric.delta, metric.unit)}
                  </p>
                </div>
              ))}
              <div className="stack-list__item stack-list__item--body">
                <strong>{latestRelease ? `${formatTokenLabel(latestRelease.decision)} release` : 'Promotion fallback'}</strong>
                <p>{latestRelease?.summary ?? promotionSummary}</p>
                <div className="optimize-record__meta">
                  <span className="meta-chip">{latestRelease ? formatDateTime(latestRelease.appliedAt ?? latestRelease.requestedAt) : 'Saved release story'}</span>
                  <span className="meta-chip">{latestRelease?.status ?? 'candidate summary'}</span>
                  {releaseConfidence != null ? <span className="meta-chip">{Math.round(releaseConfidence * 100)}% confidence</span> : null}
                </div>
              </div>
              {latestIntervention ? (
                <div className="stack-list__item stack-list__item--body">
                  <strong>{formatTokenLabel(latestIntervention.action)}</strong>
                  <p>{latestIntervention.reason}</p>
                  <div className="optimize-record__meta">
                    <span className="meta-chip">
                      {latestIntervention.targetScopeType === 'system'
                        ? controlPlane?.system.name ?? latestIntervention.targetScopeId
                        : getAgentLabel(controlPlane, latestIntervention.targetScopeId) ?? latestIntervention.targetScopeId}
                    </span>
                    <span className="meta-chip">{formatDateTime(latestIntervention.appliedAt ?? latestIntervention.requestedAt)}</span>
                    {latestInterventionPhases.length ? <span className="meta-chip">{latestInterventionPhases.join(', ')}</span> : null}
                  </div>
                </div>
              ) : null}
            </div>
            {(releaseCreditsDelta != null || releaseDurationDelta != null) ? (
              <div className="inline-callout">
                <span className="eyebrow">Release deltas</span>
                <p>
                  {releaseCreditsDelta != null ? `${formatDelta(releaseCreditsDelta)} credits` : 'No credits delta'} ·{' '}
                  {releaseDurationDelta != null ? `${formatDelta(releaseDurationDelta)}s duration` : 'No duration delta'}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="surface">
        <div className="section-header">
          <div>
            <p className="eyebrow">{candidateExecution ? 'Candidate trace' : 'Candidate fallback'}</p>
            <h3>{candidateExecution ? candidateRun.experimentLabel : candidatePlan?.name ?? 'No saved plan selected'}</h3>
          </div>
          <span className="meta-chip">{candidatePlan?.executionPolicy.reviewPolicy ?? 'standard'} review</span>
        </div>
        <p className="feature-summary">
          {candidateExecution
            ? 'The candidate trace remains the fallback release story when you need to inspect the exact runtime path behind the current evidence.'
            : candidatePlan?.notes ?? 'No candidate notes recorded.'}
        </p>
        <div className="timeline-list">
          {candidateExecution
            ? candidateSpans.map((span) => (
                <article key={span.spanId} className={`timeline-list__item timeline-list__item--${span.status}`}>
                  <div className="timeline-list__index">{span.kind.slice(0, 1).toUpperCase()}</div>
                  <div>
                    <h4>{span.name}</h4>
                    <p>{span.summary ?? 'No span summary recorded.'}</p>
                  </div>
                  <div className="timeline-list__meta">
                    <span className={`status-pill status-pill--${span.status}`}>{span.status}</span>
                    <span>{getAgentLabel(controlPlane, span.agentId) ?? span.kind}</span>
                    <span>{formatDuration(span.usage?.durationMs)}</span>
                    <span>{formatCredits(span.usage?.credits)}</span>
                  </div>
                </article>
              ))
            : candidateReplay.stepExecutions.map((step) => (
                <article key={step.stepId} className={`timeline-list__item timeline-list__item--${step.status}`}>
                  <div className="timeline-list__index">{step.kind.slice(0, 1).toUpperCase()}</div>
                  <div>
                    <h4>{step.title}</h4>
                    <p>{step.summary ?? 'No step summary recorded.'}</p>
                  </div>
                  <div className="timeline-list__meta">
                    <span className="meta-chip">{step.modelTier ?? 'default'}</span>
                    <span>{formatDuration(step.durationMs)}</span>
                  </div>
                </article>
              ))}
        </div>
      </section>
    </div>
  );
}
