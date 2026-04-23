import { useMemo, useState } from 'react';

import type { ControlPlaneImportBundle, ControlPlaneStorageInfo, ControlPlaneSystemState } from '../../app/control-plane';
import { ingestControlPlaneBundle, ingestControlPlaneItems, summarizeSystemReadiness } from '../../app/control-plane';
import { ConnectionModesPanel } from './ConnectionModesPanel';
import { LangGraphQuickstartPanel } from './LangGraphQuickstartPanel';

interface ConnectPanelProps {
  selectedSystem: ControlPlaneSystemState | null;
  storage: ControlPlaneStorageInfo | null;
  onRefresh: (nextSystemId?: string) => Promise<void> | void;
}

interface RegistrationFormState {
  runtimeLabel: string;
  runtimeKind: string;
  adapterId: string;
  systemName: string;
  systemDescription: string;
  workspaceId: string;
}

const INITIAL_REGISTRATION_FORM: RegistrationFormState = {
  runtimeLabel: 'Imported runtime',
  runtimeKind: 'custom',
  adapterId: 'custom-ingest',
  systemName: 'Imported system',
  systemDescription: 'A system imported through the Agent Studio control-plane ingest surface.',
  workspaceId: 'workspace_imported',
};

const MANAGEMENT_AREAS = [
  {
    title: 'Overview',
    body: 'Choose the system, inspect the fleet, and decide which agent or room deserves attention first.',
  },
  {
    title: 'Agent roster',
    body: 'Use the roster to inspect capabilities, latest trace activity, failures, and active directives per agent.',
  },
  {
    title: 'Replay',
    body: 'Use Replay once executions and spans exist. That is where the real break path becomes clear.',
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

export function ConnectPanel({ selectedSystem, storage, onRefresh }: ConnectPanelProps) {
  const [registrationForm, setRegistrationForm] = useState(INITIAL_REGISTRATION_FORM);
  const [bundleText, setBundleText] = useState<string>('{\n  "agents": [],\n  "topologies": [],\n  "executions": [],\n  "spans": [],\n  "metrics": []\n}');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
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

      await onRefresh(systemId);
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

    try {
      const parsed = JSON.parse(bundleText) as ControlPlaneImportBundle;
      await ingestControlPlaneBundle(parsed);
      const nextSystemId = parsed.systems?.[0]?.systemId ?? parsed.agents?.[0]?.systemId ?? selectedSystem?.system.systemId;
      await onRefresh(nextSystemId);
      setStatus('Imported the control-plane bundle successfully.');
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Failed to import the control-plane bundle.');
    } finally {
      setSubmitting(false);
    }
  }

  function applyTemplate(templateId: (typeof templates)[number]['id']) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    setBundleText(template.build());
    setStatus(`Loaded the ${template.label.toLowerCase()} template for ${templateContext.systemId}.`);
    setError(null);
  }

  function updateRegistrationField<Key extends keyof RegistrationFormState>(key: Key, value: RegistrationFormState[Key]) {
    setRegistrationForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

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

      <div className="guide-grid">
        <section className="mini-surface">
          <p className="eyebrow">Current path</p>
          <h3>{readiness.title}</h3>
          <p className="muted">{readiness.body}</p>
          <div className="guide-stack">
            {readiness.roomReadiness.map((room) => (
              <article key={room.roomId} className={`guide-step guide-step--${room.state}`}>
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
        <LangGraphQuickstartPanel systemName={systemName} readiness={readiness} />

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

        <section className="mini-surface">
          <p className="eyebrow">What unlocks next</p>
          <h3>Use import order on purpose</h3>
          <div className="guide-stack">
            <article className="guide-step guide-step--ready">
              <strong>Agents + topology</strong>
              <p>Live becomes an operator surface instead of a static placeholder.</p>
            </article>
            <article className="guide-step guide-step--ready">
              <strong>Executions + spans</strong>
              <p>Replay stops guessing and starts showing the real break tree.</p>
            </article>
            <article className="guide-step guide-step--ready">
              <strong>Evaluations + releases</strong>
              <p>Optimize becomes a release workbench instead of a hypothetical lab.</p>
            </article>
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
            <textarea rows={16} value={bundleText} onChange={(event) => setBundleText(event.target.value)} />
          </label>
          <button type="button" className="control-strip__primary" onClick={handleImportBundle} disabled={submitting}>
            {submitting ? 'Importing…' : 'Import control-plane bundle'}
          </button>
        </section>
      </div>

      <div className="guide-grid">
        <section className="mini-surface">
          <p className="eyebrow">Manage after connect</p>
          <h3>How to manage systems and agents</h3>
          <div className="guide-stack">
            {MANAGEMENT_AREAS.map((area) => (
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
