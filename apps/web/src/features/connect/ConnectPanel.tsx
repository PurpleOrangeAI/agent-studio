import { useMemo, useRef, useState } from 'react';

import type { ControlPlaneImportBundle, ControlPlaneStorageInfo, ControlPlaneSystemState } from '../../app/control-plane';
import { ingestControlPlaneBundle, ingestControlPlaneItems, summarizeSystemReadiness } from '../../app/control-plane';
import type { ViewId } from '../../app/routes';
import { ConnectionModesPanel } from './ConnectionModesPanel';
import { LangGraphQuickstartPanel } from './LangGraphQuickstartPanel';

interface ConnectPanelProps {
  selectedSystem: ControlPlaneSystemState | null;
  storage: ControlPlaneStorageInfo | null;
  onRefresh: (nextSystemId?: string, options?: { stayOnConnect?: boolean }) => Promise<void> | void;
  onNavigate: (view: Exclude<ViewId, 'connect'>) => void;
}

interface RegistrationFormState {
  runtimeLabel: string;
  runtimeKind: string;
  adapterId: string;
  systemName: string;
  systemDescription: string;
  workspaceId: string;
}

type TemplateId = 'roster' | 'trace' | 'release';
type SuccessMode = 'register' | 'import' | 'template' | null;

const INITIAL_REGISTRATION_FORM: RegistrationFormState = {
  runtimeLabel: 'Imported runtime',
  runtimeKind: 'custom',
  adapterId: 'custom-ingest',
  systemName: 'Imported system',
  systemDescription: 'A system imported through the Agent Studio control-plane ingest surface.',
  workspaceId: 'workspace_imported',
};

const AFTER_CONNECT_AREAS = [
  {
    title: 'Overview',
    body: 'Choose the system, inspect fleet pressure, then decide which room deserves attention first.',
  },
  {
    title: 'Replay',
    body: 'Use Replay once executions and spans exist. That is where the real break path becomes clear enough to act on.',
  },
  {
    title: 'Optimize',
    body: 'Use Optimize for intervention evidence, evaluation deltas, and release calls, not for guesswork.',
  },
];

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function createId(prefix: string, seed: string) {
  return `${prefix}_${slug(seed)}_${Date.now().toString(36)}`;
}

function createTemplateContext(selectedSystem: ControlPlaneSystemState | null, registrationForm: RegistrationFormState) {
  const systemId = selectedSystem?.system.systemId ?? `system_${slug(registrationForm.systemName || 'imported-system')}`;
  const runtimeId =
    selectedSystem?.system.primaryRuntimeId ??
    selectedSystem?.system.runtimeIds[0] ??
    `runtime_${slug(registrationForm.runtimeLabel || 'imported-runtime')}`;
  const systemName = selectedSystem?.system.name ?? registrationForm.systemName;
  const workspaceId = selectedSystem?.system.workspaceId ?? registrationForm.workspaceId;

  return {
    systemId,
    runtimeId,
    systemName,
    workspaceId,
  };
}

function stringifyTemplate(bundle: ControlPlaneImportBundle) {
  return JSON.stringify(bundle, null, 2);
}

function buildAgentTopologyTemplate(selectedSystem: ControlPlaneSystemState | null, registrationForm: RegistrationFormState): string {
  const now = new Date().toISOString();
  const { runtimeId, systemId } = createTemplateContext(selectedSystem, registrationForm);

  return stringifyTemplate({
    agents: [
      {
        agentId: `${systemId}_manager`,
        systemId,
        runtimeId,
        label: 'Manager',
        kind: 'coordinator',
        role: 'manager',
        status: 'active',
        capabilities: ['route', 'handoff'],
      },
      {
        agentId: `${systemId}_reviewer`,
        systemId,
        runtimeId,
        label: 'Reviewer',
        kind: 'specialist',
        role: 'reviewer',
        status: 'active',
        capabilities: ['review', 'quality-gate'],
      },
    ],
    topologies: [
      {
        snapshotId: `topology_${systemId}`,
        systemId,
        capturedAt: now,
        nodes: [
          {
            nodeId: `${systemId}_node_manager`,
            agentId: `${systemId}_manager`,
            runtimeId,
            label: 'Manager',
            kind: 'coordinator',
            role: 'manager',
          },
          {
            nodeId: `${systemId}_node_reviewer`,
            agentId: `${systemId}_reviewer`,
            runtimeId,
            label: 'Reviewer',
            kind: 'specialist',
            role: 'reviewer',
          },
        ],
        edges: [
          {
            edgeId: `edge_${systemId}_manager_reviewer`,
            sourceNodeId: `${systemId}_node_manager`,
            targetNodeId: `${systemId}_node_reviewer`,
            kind: 'handoff',
          },
        ],
      },
    ],
  });
}

function buildExecutionTraceTemplate(selectedSystem: ControlPlaneSystemState | null, registrationForm: RegistrationFormState): string {
  const now = new Date().toISOString();
  const { runtimeId, systemId } = createTemplateContext(selectedSystem, registrationForm);
  const executionId = `execution_${slug(systemId)}_latest`;
  const traceId = `trace_${slug(systemId)}_latest`;

  return stringifyTemplate({
    executions: [
      {
        executionId,
        systemId,
        runtimeId,
        traceId,
        status: 'running',
        startedAt: now,
        runId: `run_${slug(systemId)}_latest`,
        metadata: {
          experimentLabel: `${selectedSystem?.system.name ?? registrationForm.systemName} latest execution`,
        },
      },
    ],
    spans: [
      {
        spanId: `${executionId}_capture`,
        traceId,
        executionId,
        agentId: `${systemId}_manager`,
        nodeId: `${systemId}_node_manager`,
        name: 'Capture incoming work',
        kind: 'capture',
        status: 'succeeded',
        startedAt: now,
        finishedAt: now,
        summary: 'Captured the current queue cleanly.',
        usage: {
          credits: 4,
          durationMs: 60000,
        },
      },
      {
        spanId: `${executionId}_review`,
        traceId,
        executionId,
        parentSpanId: `${executionId}_capture`,
        agentId: `${systemId}_reviewer`,
        nodeId: `${systemId}_node_reviewer`,
        name: 'Review the candidate batch',
        kind: 'review',
        status: 'failed',
        startedAt: now,
        finishedAt: now,
        summary: 'The reviewer tripped the quality gate.',
        usage: {
          credits: 7,
          durationMs: 180000,
        },
      },
    ],
    metrics: [
      {
        sampleId: `metric_${executionId}_credits`,
        metric: 'credits.actual',
        unit: 'credits',
        value: 11,
        ts: now,
        scopeType: 'execution',
        scopeId: executionId,
      },
      {
        sampleId: `metric_${executionId}_duration`,
        metric: 'duration.ms',
        unit: 'ms',
        value: 240000,
        ts: now,
        scopeType: 'execution',
        scopeId: executionId,
      },
    ],
  });
}

function buildReleaseEvidenceTemplate(selectedSystem: ControlPlaneSystemState | null, registrationForm: RegistrationFormState): string {
  const now = new Date().toISOString();
  const { systemId } = createTemplateContext(selectedSystem, registrationForm);
  const candidateRef = `run_${slug(systemId)}_latest`;
  const baselineRef = `run_${slug(systemId)}_baseline`;

  return stringifyTemplate({
    interventions: [
      {
        interventionId: `intervention_${slug(systemId)}_review`,
        targetScopeType: 'agent',
        targetScopeId: `${systemId}_reviewer`,
        actor: 'operator',
        action: 'directive.review',
        reason: 'Keep the reviewer under tighter scrutiny until the quality gate stabilizes.',
        requestedAt: now,
        appliedAt: now,
        status: 'applied',
        configPatch: {
          phases: ['review'],
        },
      },
    ],
    evaluations: [
      {
        evaluationId: `evaluation_${slug(systemId)}_latest`,
        targetScopeType: 'system',
        targetScopeId: systemId,
        baselineRefs: [baselineRef],
        candidateRefs: [candidateRef],
        verdict: 'hold',
        createdAt: now,
        summary: 'Hold the release until the reviewer stops tripping the gate.',
        metricDeltas: [
          {
            metric: 'credits.actual',
            unit: 'credits',
            baselineValue: 7,
            candidateValue: 11,
            delta: 4,
          },
        ],
      },
    ],
    releases: [
      {
        releaseId: `release_${slug(systemId)}_latest`,
        systemId,
        candidateRef,
        baselineRef,
        decision: 'hold',
        requestedAt: now,
        appliedAt: now,
        status: 'applied',
        summary: 'Hold until the review path is stable.',
      },
    ],
  });
}

function getNextTemplateId(readiness: ReturnType<typeof summarizeSystemReadiness>): TemplateId | null {
  if (readiness.agentCount === 0 || !readiness.hasTopology) {
    return 'roster';
  }

  if (readiness.executionCount === 0 || readiness.spanCount === 0) {
    return 'trace';
  }

  if (readiness.evaluationCount === 0 && readiness.releaseCount === 0) {
    return 'release';
  }

  return null;
}

function getBestReadyView(readiness: ReturnType<typeof summarizeSystemReadiness>): Exclude<ViewId, 'connect'> {
  if (readiness.evaluationCount > 0 || readiness.releaseCount > 0) {
    return 'optimize';
  }

  if (readiness.executionCount > 0 && readiness.spanCount > 0) {
    return 'replay';
  }

  if (readiness.agentCount > 0 && readiness.hasTopology) {
    return 'live';
  }

  return 'overview';
}

function getTemplateCopy(templateId: TemplateId) {
  if (templateId === 'roster') {
    return {
      label: 'Load agent roster template',
      status: 'Roster template loaded. Import it to light up Live.',
    };
  }

  if (templateId === 'trace') {
    return {
      label: 'Load execution trace template',
      status: 'Trace template loaded. Import it to light up Replay.',
    };
  }

  return {
    label: 'Load release evidence template',
    status: 'Release template loaded. Import it to light up Optimize.',
  };
}

export function ConnectPanel({ selectedSystem, storage, onRefresh, onNavigate }: ConnectPanelProps) {
  const [registrationForm, setRegistrationForm] = useState(INITIAL_REGISTRATION_FORM);
  const [bundleText, setBundleText] = useState<string>('{\n  "agents": [],\n  "topologies": [],\n  "executions": [],\n  "spans": [],\n  "metrics": []\n}');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMode, setSuccessMode] = useState<SuccessMode>(null);
  const bundleTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const readiness = summarizeSystemReadiness(selectedSystem);
  const systemName = selectedSystem?.system.name ?? registrationForm.systemName;
  const templateContext = useMemo(
    () => createTemplateContext(selectedSystem, registrationForm),
    [registrationForm, selectedSystem],
  );
  const templates = [
    {
      id: 'roster',
      label: 'Agent roster + topology',
      body: 'Lights up Live with real agents, roles, and handoffs.',
      build: () => buildAgentTopologyTemplate(selectedSystem, registrationForm),
    },
    {
      id: 'trace',
      label: 'Execution trace',
      body: 'Adds executions, spans, and metrics so Replay can stop guessing.',
      build: () => buildExecutionTraceTemplate(selectedSystem, registrationForm),
    },
    {
      id: 'release',
      label: 'Release evidence',
      body: 'Adds directives, evaluations, and release decisions for Optimize.',
      build: () => buildReleaseEvidenceTemplate(selectedSystem, registrationForm),
    },
  ] as const;

  async function handleRegisterRuntimeAndSystem() {
    setSubmitting(true);
    setStatus(null);
    setError(null);
    setSuccessMode(null);

    try {
      const runtimeId = createId('runtime', registrationForm.runtimeLabel);
      const systemId = createId('system', registrationForm.systemName);

      await ingestControlPlaneItems('/api/control/ingest/runtimes', {
        runtimeId,
        kind: registrationForm.runtimeKind,
        adapterId: registrationForm.adapterId,
        label: registrationForm.runtimeLabel,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await ingestControlPlaneItems('/api/control/ingest/systems', {
        systemId,
        workspaceId: registrationForm.workspaceId,
        name: registrationForm.systemName,
        description: registrationForm.systemDescription,
        runtimeIds: [runtimeId],
        primaryRuntimeId: runtimeId,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await onRefresh(systemId, { stayOnConnect: true });
      setSuccessMode('register');
      setStatus(`Registered ${registrationForm.systemName} on ${registrationForm.runtimeLabel}. Add agents and topology next.`);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Failed to register runtime and system.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleImportBundle() {
    setSubmitting(true);
    setStatus(null);
    setError(null);
    setSuccessMode(null);

    try {
      const parsed = JSON.parse(bundleText) as ControlPlaneImportBundle;
      await ingestControlPlaneBundle(parsed);
      const nextSystemId = parsed.systems?.[0]?.systemId ?? parsed.agents?.[0]?.systemId ?? selectedSystem?.system.systemId;
      await onRefresh(nextSystemId, { stayOnConnect: true });
      setSuccessMode('import');
      setStatus('Imported the control-plane bundle successfully.');
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Failed to import the control-plane bundle.');
    } finally {
      setSubmitting(false);
    }
  }

  function applyTemplate(templateId: TemplateId) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    setBundleText(template.build());
    setSuccessMode('template');
    setStatus(`Loaded the ${template.label.toLowerCase()} template for ${templateContext.systemId}.`);
    setError(null);
    window.requestAnimationFrame(() => {
      bundleTextareaRef.current?.focus();
      bundleTextareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function updateRegistrationField<Key extends keyof RegistrationFormState>(key: Key, value: RegistrationFormState[Key]) {
    setRegistrationForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  const nextTemplateId = getNextTemplateId(readiness);
  const nextTemplateAction = nextTemplateId ? getTemplateCopy(nextTemplateId) : null;
  const suggestedView = getBestReadyView(readiness);
  const roomGuide = readiness.roomReadiness.filter((room) => !['overview', 'connect'].includes(room.roomId));

  function renderSuccessActions() {
    const actions: Array<{ id: string; label: string; onClick: () => void; primary?: boolean }> = [];

    if ((successMode === 'register' || successMode === 'import') && nextTemplateId && nextTemplateAction) {
      actions.push({
        id: `template-${nextTemplateId}`,
        label: nextTemplateAction.label,
        onClick: () => applyTemplate(nextTemplateId),
        primary: true,
      });
    }

    if (successMode === 'template') {
      actions.push({
        id: 'import-bundle',
        label: 'Import loaded bundle',
        onClick: () => void handleImportBundle(),
        primary: true,
      });
    }

    if (successMode === 'import') {
      actions.push({
        id: `open-${suggestedView}`,
        label: `Open ${suggestedView.charAt(0).toUpperCase() + suggestedView.slice(1)}`,
        onClick: () => onNavigate(suggestedView),
        primary: actions.length === 0,
      });
    }

    if (successMode === 'register') {
      actions.push({
        id: 'open-overview',
        label: 'Open Overview',
        onClick: () => onNavigate('overview'),
        primary: actions.length === 0,
      });
    }

    if (successMode === 'template' && nextTemplateId === null) {
      actions.push({
        id: `open-${suggestedView}`,
        label: `Open ${suggestedView.charAt(0).toUpperCase() + suggestedView.slice(1)}`,
        onClick: () => onNavigate(suggestedView),
        primary: actions.length === 0,
      });
    }

    return actions.slice(0, 2);
  }

  const successActions = renderSuccessActions();

  return (
    <section className="surface">
      <div className="section-header">
        <div>
          <p className="eyebrow">Connect and import</p>
          <h2>Bring your own system</h2>
          <p className="muted">
            The shortest safe path is simple: register the system home, add the agent roster and topology, ingest
            executions and spans, then add evaluation and release evidence.
          </p>
        </div>
        <span className="meta-chip">{selectedSystem?.system.name ?? 'No system selected'}</span>
      </div>

      <div className={`inline-callout ${storage?.persistenceEnabled ? 'inline-callout--success' : 'inline-callout--warning'}`}>
        <span className="eyebrow">Storage mode</span>
        <p>
          <strong>
            {storage?.mode === 'blob'
              ? 'Persistent hosted blob store'
              : storage?.mode === 'file'
                ? 'Persistent file store'
                : 'Ephemeral memory store'}
          </strong>{' '}
          {storage?.detail ?? 'Storage metadata unavailable.'}
        </p>
        {storage?.filePath ? <code>{storage.filePath}</code> : null}
        {!storage?.filePath && storage?.blobPath ? <code>{storage.blobPath}</code> : null}
      </div>

      <div className={`inline-callout ${readiness.stageId === 'operational' ? 'inline-callout--success' : ''}`}>
        <span className="eyebrow">Next missing layer</span>
        <p>
          <strong>{readiness.title}</strong> {readiness.body}
        </p>
        <div className="guide-actions">
          {nextTemplateId && nextTemplateAction ? (
            <button type="button" className="control-strip__primary" onClick={() => applyTemplate(nextTemplateId)}>
              {nextTemplateAction.label}
            </button>
          ) : (
            <button type="button" className="control-strip__primary" onClick={() => onNavigate(suggestedView)}>
              Open {suggestedView.charAt(0).toUpperCase() + suggestedView.slice(1)}
            </button>
          )}
          <button type="button" className="ghost-button" onClick={() => onNavigate('overview')}>
            Open Overview
          </button>
          <span className="meta-chip">
            {readiness.completedSteps}/{readiness.totalSteps} stages ready
          </span>
        </div>
      </div>

      <div className="guide-grid">
        <section className="mini-surface">
          <p className="eyebrow">Room unlocks</p>
          <h3>What this system can do right now</h3>
          <p className="muted">
            Connect should make the next room obvious. Live needs roster plus topology, Replay needs execution traces,
            and Optimize needs evaluation or release evidence.
          </p>
          <div className="onboarding-rail onboarding-rail--compact">
            {roomGuide.map((room) => (
              <article key={room.roomId} className={`onboarding-rail__card onboarding-rail__card--${room.state}`}>
                <div className="guide-step__header">
                  <strong>{room.roomId.charAt(0).toUpperCase() + room.roomId.slice(1)}</strong>
                  <span className="meta-chip">{room.label}</span>
                </div>
                <p>{room.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <ConnectionModesPanel systemName={systemName} />
      </div>

      <div className="guide-grid">
        <LangGraphQuickstartPanel
          systemName={systemName}
          readiness={readiness}
          onLoadTemplate={applyTemplate}
          onNavigate={onNavigate}
        />

        <section className="mini-surface">
          <p className="eyebrow">Import templates</p>
          <h3>Fill the JSON with a real starting point</h3>
          <p className="muted">
            Templates target <strong>{templateContext.systemId}</strong> on <strong>{templateContext.runtimeId}</strong>. Register the system home first, then use these to light up rooms in order.
          </p>
          <div className="template-toolbar">
            {templates.map((template) => (
              <button key={template.id} type="button" className="template-button" onClick={() => applyTemplate(template.id)}>
                <strong>{template.label}</strong>
                <span>{template.body}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="connect-grid">
        <section className="mini-surface">
          <p className="eyebrow">Quick register</p>
          <h3>Create the system home</h3>
          <p className="muted">This creates the runtime and system record only. Agents, topology, traces, and releases come next.</p>
          <div className="text-field">
            <span>Runtime label</span>
            <input value={registrationForm.runtimeLabel} onChange={(event) => updateRegistrationField('runtimeLabel', event.target.value)} />
          </div>
          <div className="connect-split">
            <label className="text-field">
              <span>Runtime kind</span>
              <input value={registrationForm.runtimeKind} onChange={(event) => updateRegistrationField('runtimeKind', event.target.value)} />
            </label>
            <label className="text-field">
              <span>Adapter ID</span>
              <input value={registrationForm.adapterId} onChange={(event) => updateRegistrationField('adapterId', event.target.value)} />
            </label>
          </div>
          <div className="text-field">
            <span>System name</span>
            <input value={registrationForm.systemName} onChange={(event) => updateRegistrationField('systemName', event.target.value)} />
          </div>
          <div className="text-field">
            <span>System description</span>
            <textarea rows={4} value={registrationForm.systemDescription} onChange={(event) => updateRegistrationField('systemDescription', event.target.value)} />
          </div>
          <div className="text-field">
            <span>Workspace ID</span>
            <input value={registrationForm.workspaceId} onChange={(event) => updateRegistrationField('workspaceId', event.target.value)} />
          </div>
          <button type="button" className="control-strip__primary" onClick={handleRegisterRuntimeAndSystem} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Register runtime and system'}
          </button>
        </section>

        <section className="mini-surface">
          <p className="eyebrow">Bulk import</p>
          <h3>Import the next missing layer</h3>
          <p className="muted">
            Import order matters: agents and topology first, executions and spans second, release evidence last. The
            selected system does not become useful by magic; it becomes useful as the ingest model fills in.
          </p>
          <label className="text-field">
            <span>Import JSON</span>
            <textarea ref={bundleTextareaRef} rows={16} value={bundleText} onChange={(event) => setBundleText(event.target.value)} />
          </label>
          <button type="button" className="control-strip__primary" onClick={handleImportBundle} disabled={submitting}>
            {submitting ? 'Importing…' : 'Import control-plane bundle'}
          </button>
        </section>
      </div>

      <div className="guide-grid">
        <section className="mini-surface">
          <p className="eyebrow">After import</p>
          <h3>Where to go next</h3>
          <div className="guide-stack">
            {AFTER_CONNECT_AREAS.map((area) => (
              <article key={area.title} className="guide-step guide-step--ready">
                <strong>{area.title}</strong>
                <p>{area.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mini-surface">
          <p className="eyebrow">Current coverage</p>
          <h3>What is already imported</h3>
          <div className="ingest-grid ingest-grid--compact">
            <article className={`ingest-card ${readiness.agentCount > 0 ? 'ingest-card--ready' : 'ingest-card--thin'}`}>
              <span>Agents</span>
              <strong>{readiness.agentCount}</strong>
            </article>
            <article className={`ingest-card ${readiness.hasTopology ? 'ingest-card--ready' : 'ingest-card--thin'}`}>
              <span>Topology</span>
              <strong>{readiness.hasTopology ? 'Ready' : 'Missing'}</strong>
            </article>
            <article className={`ingest-card ${readiness.executionCount > 0 ? 'ingest-card--ready' : 'ingest-card--thin'}`}>
              <span>Executions</span>
              <strong>{readiness.executionCount}</strong>
            </article>
            <article className={`ingest-card ${readiness.spanCount > 0 ? 'ingest-card--ready' : 'ingest-card--thin'}`}>
              <span>Spans</span>
              <strong>{readiness.spanCount}</strong>
            </article>
            <article className={`ingest-card ${readiness.interventionCount > 0 ? 'ingest-card--ready' : 'ingest-card--thin'}`}>
              <span>Directives</span>
              <strong>{readiness.interventionCount}</strong>
            </article>
            <article className={`ingest-card ${readiness.evaluationCount > 0 ? 'ingest-card--ready' : 'ingest-card--thin'}`}>
              <span>Evaluations</span>
              <strong>{readiness.evaluationCount}</strong>
            </article>
            <article className={`ingest-card ${readiness.releaseCount > 0 ? 'ingest-card--ready' : 'ingest-card--thin'}`}>
              <span>Releases</span>
              <strong>{readiness.releaseCount}</strong>
            </article>
          </div>
        </section>
      </div>

      {status ? (
        <div className="inline-callout inline-callout--success">
          <span className="eyebrow">Status</span>
          <p>{status}</p>
          {successActions.length ? (
            <div className="guide-actions">
              {successActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className={action.primary ? 'control-strip__primary' : 'ghost-button'}
                  onClick={action.onClick}
                  disabled={submitting}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <div className="inline-callout inline-callout--warning">
          <span className="eyebrow">Import error</span>
          <p>{error}</p>
        </div>
      ) : null}
    </section>
  );
}
