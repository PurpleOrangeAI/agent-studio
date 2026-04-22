import type { PromotionEvent, SavedPlan } from '@agent-studio/contracts';

import type { ControlPlaneSystemState } from '../../app/control-plane';
import { getAgentLabel, getLatestEvaluation, getLatestReleaseDecision } from '../../app/control-plane';
import { formatCredits, formatDateTime, formatDelta, formatDuration, titleCaseStatus } from '../../app/format';

interface OptimizeAdvancedPanelProps {
  savedPlans: SavedPlan[];
  promotionHistory: PromotionEvent[];
  controlPlane?: ControlPlaneSystemState | null;
}

function formatTokenLabel(value: string) {
  return value
    .split(/[._-]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function sortByNewest<T>(items: T[], getTimestamp: (item: T) => string | undefined) {
  return [...items].sort((left, right) => {
    const leftValue = getTimestamp(left);
    const rightValue = getTimestamp(right);

    if (leftValue && rightValue) {
      return rightValue.localeCompare(leftValue);
    }

    if (rightValue) {
      return 1;
    }

    if (leftValue) {
      return -1;
    }

    return 0;
  });
}

function readMetadataNumber(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];

  return typeof value === 'number' ? value : null;
}

function readMetadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];

  return typeof value === 'string' ? value : null;
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
    return `${formatDelta(value)} cr`;
  }

  if (metric === 'duration.ms') {
    return `${formatDelta(Math.round(value / 1000))}s`;
  }

  return unit ? `${formatDelta(value)} ${unit}` : formatDelta(value);
}

export function OptimizeAdvancedPanel({ savedPlans, promotionHistory, controlPlane }: OptimizeAdvancedPanelProps) {
  const latestEvaluation = getLatestEvaluation(controlPlane);
  const latestRelease = getLatestReleaseDecision(controlPlane);
  const recentInterventions = (controlPlane?.interventions ?? []).slice(0, 4);
  const recentPlans = sortByNewest(savedPlans, (plan) => plan.createdAt).slice(0, 3);
  const recentPromotions = sortByNewest(promotionHistory, (promotion) => promotion.appliedAt).slice(0, 4);
  const releaseMode = readMetadataString(latestRelease?.metadata, 'mode');
  const releaseConfidence = readMetadataNumber(latestRelease?.metadata, 'confidence');
  const releaseCreditsDelta = readMetadataNumber(latestRelease?.metadata, 'creditsDelta');
  const releaseDurationDelta = readMetadataNumber(latestRelease?.metadata, 'durationDelta');
  const releaseSuccessDelta = readMetadataNumber(latestRelease?.metadata, 'successDelta');

  return (
    <div className="advanced-grid">
      <section className="mini-surface">
        <p className="eyebrow">Latest evaluation</p>
        <div className="stack-list">
          <div className="stack-list__item stack-list__item--body">
            <strong>{latestEvaluation ? `${titleCaseStatus(latestEvaluation.verdict)} verdict` : 'Saved candidate fallback'}</strong>
            <p>{latestEvaluation?.summary ?? recentPlans[0]?.notes ?? 'No evaluation summary recorded.'}</p>
            <div className="optimize-record__meta">
              <span className="meta-chip">{latestEvaluation ? formatDateTime(latestEvaluation.createdAt) : 'Saved plan'}</span>
              <span className="meta-chip">
                {latestEvaluation ? `${latestEvaluation.baselineRefs.length} baseline ref${latestEvaluation.baselineRefs.length === 1 ? '' : 's'}` : 'No baseline refs'}
              </span>
              <span className="meta-chip">
                {latestEvaluation ? `${latestEvaluation.candidateRefs.length} candidate ref${latestEvaluation.candidateRefs.length === 1 ? '' : 's'}` : 'No candidate refs'}
              </span>
            </div>
          </div>
          {latestEvaluation?.metricDeltas?.length ? (
            latestEvaluation.metricDeltas.map((metric) => (
              <div key={metric.metric} className="stack-list__item stack-list__item--body">
                <strong>{formatTokenLabel(metric.metric)}</strong>
                <p>
                  Baseline {formatMetricValue(metric.metric, metric.baselineValue, metric.unit)} · Candidate{' '}
                  {formatMetricValue(metric.metric, metric.candidateValue, metric.unit)} · Delta{' '}
                  {formatMetricDelta(metric.metric, metric.delta, metric.unit)}
                </p>
              </div>
            ))
          ) : (
            <div className="stack-list__item stack-list__item--body">
              <strong>No metric deltas</strong>
              <p>Falling back to the saved candidate plan and promotion story until the control plane records an evaluation.</p>
            </div>
          )}
        </div>
      </section>

      <section className="mini-surface">
        <p className="eyebrow">Release evidence</p>
        <div className="stack-list">
          <div className="stack-list__item stack-list__item--body">
            <strong>{latestRelease ? `${formatTokenLabel(latestRelease.decision)} release` : 'Promotion history fallback'}</strong>
            <p>{latestRelease?.summary ?? recentPromotions[0]?.summary ?? 'No release summary recorded.'}</p>
            <div className="optimize-record__meta">
              <span className="meta-chip">{latestRelease ? formatDateTime(latestRelease.appliedAt ?? latestRelease.requestedAt) : 'Promotion history'}</span>
              <span className="meta-chip">{latestRelease?.status ?? 'fallback story'}</span>
              {releaseMode ? <span className="meta-chip">{formatTokenLabel(releaseMode)}</span> : null}
              {releaseConfidence != null ? <span className="meta-chip">{Math.round(releaseConfidence * 100)}% confidence</span> : null}
            </div>
          </div>
          {latestRelease?.evidenceRefs?.length ? (
            <div className="stack-list__item stack-list__item--body">
              <strong>Evidence refs</strong>
              <p>{latestRelease.evidenceRefs.join(', ')}</p>
            </div>
          ) : null}
          {(releaseCreditsDelta != null || releaseDurationDelta != null || releaseSuccessDelta != null || latestRelease?.rollbackPlan) ? (
            <div className="stack-list__item stack-list__item--body">
              <strong>Release metadata</strong>
              <p>
                {releaseCreditsDelta != null ? `${formatDelta(releaseCreditsDelta)} credits` : 'No credits delta'} ·{' '}
                {releaseDurationDelta != null ? `${formatDelta(releaseDurationDelta)}s duration` : 'No duration delta'} ·{' '}
                {releaseSuccessDelta != null ? `${formatDelta(releaseSuccessDelta)} success` : 'No success delta'}
              </p>
              {latestRelease?.rollbackPlan ? <p>{latestRelease.rollbackPlan}</p> : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mini-surface">
        <p className="eyebrow">Intervention audit</p>
        <div className="stack-list">
          {recentInterventions.length ? (
            recentInterventions.map((intervention) => {
              const phases = readConfigPatchPhases(intervention.configPatch);
              const targetLabel =
                intervention.targetScopeType === 'system'
                  ? controlPlane?.system.name ?? intervention.targetScopeId
                  : getAgentLabel(controlPlane, intervention.targetScopeId) ?? intervention.targetScopeId;

              return (
                <div key={intervention.interventionId} className="stack-list__item stack-list__item--body">
                  <strong>{formatTokenLabel(intervention.action)}</strong>
                  <p>{intervention.reason}</p>
                  <div className="optimize-record__meta">
                    <span className="meta-chip">{targetLabel}</span>
                    <span className="meta-chip">{formatDateTime(intervention.appliedAt ?? intervention.requestedAt)}</span>
                    <span className="meta-chip">{intervention.status ?? 'requested'}</span>
                    {phases.length ? <span className="meta-chip">{phases.join(', ')}</span> : null}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="stack-list__item stack-list__item--body">
              <strong>No interventions recorded</strong>
              <p>The Optimize room falls back to the saved candidate and promotion history until the control plane emits scoped interventions.</p>
            </div>
          )}
        </div>
      </section>

      <section className="mini-surface">
        <p className="eyebrow">Saved plans</p>
        <div className="stack-list">
          {recentPlans.length ? (
            recentPlans.map((plan) => (
              <div key={plan.id} className="stack-list__item stack-list__item--body">
                <strong>{plan.name}</strong>
                <p>{plan.notes ?? 'No notes recorded.'}</p>
                <div className="optimize-record__meta">
                  <span className="meta-chip">{formatDateTime(plan.createdAt)}</span>
                  <span className="meta-chip">{plan.executionPolicy.reviewPolicy} review</span>
                  {plan.intentLabel ? <span className="meta-chip">{plan.intentLabel}</span> : null}
                </div>
              </div>
            ))
          ) : (
            <div className="stack-list__item stack-list__item--body">
              <strong>No saved plans</strong>
              <p>The fallback candidate story is empty because no saved plans were provided.</p>
            </div>
          )}
        </div>
      </section>

      <section className="mini-surface">
        <p className="eyebrow">Promotion history</p>
        <div className="stack-list">
          {recentPromotions.length ? (
            recentPromotions.map((promotion) => (
              <div key={promotion.eventId} className="stack-list__item stack-list__item--body">
                <strong>{formatTokenLabel(promotion.mode)}</strong>
                <p>{promotion.summary}</p>
                <div className="optimize-record__meta">
                  <span className="meta-chip">{formatDateTime(promotion.appliedAt)}</span>
                  {promotion.sourceExperimentLabel ? <span className="meta-chip">{promotion.sourceExperimentLabel}</span> : null}
                  {promotion.confidence != null ? <span className="meta-chip">{Math.round(promotion.confidence * 100)}% confidence</span> : null}
                  {promotion.creditsDelta != null ? <span className="meta-chip">{formatDelta(promotion.creditsDelta)} credits</span> : null}
                </div>
              </div>
            ))
          ) : (
            <div className="stack-list__item stack-list__item--body">
              <strong>No promotion history</strong>
              <p>The release fallback story is empty because no promotion history was provided.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
