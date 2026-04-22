import { useState } from 'react';

import type { ControlPlaneImportBundle, ControlPlaneSystemState } from '../../app/control-plane';
import { ingestControlPlaneBundle, ingestControlPlaneItems } from '../../app/control-plane';

interface ConnectPanelProps {
  selectedSystem: ControlPlaneSystemState | null;
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

export function ConnectPanel({ selectedSystem, onRefresh }: ConnectPanelProps) {
  const [registrationForm, setRegistrationForm] = useState(INITIAL_REGISTRATION_FORM);
  const [bundleText, setBundleText] = useState<string>('{\n  "agents": [],\n  "topologies": [],\n  "executions": [],\n  "spans": [],\n  "metrics": []\n}');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      setStatus(`Registered ${registrationForm.systemName} on ${registrationForm.runtimeLabel}.`);
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
      const nextSystemId = parsed.systems?.[0]?.systemId;
      await onRefresh(nextSystemId);
      setStatus('Imported the control-plane bundle successfully.');
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Failed to import the control-plane bundle.');
    } finally {
      setSubmitting(false);
    }
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
            Register a runtime and system, then ingest agents, topology, executions, spans, metrics, interventions,
            evaluations, and releases through the same routes the seeded demo uses.
          </p>
        </div>
        <span className="meta-chip">{selectedSystem?.system.name ?? 'No system selected'}</span>
      </div>
      <div className="connect-grid">
        <section className="mini-surface">
          <p className="eyebrow">Quick register</p>
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
          <p className="muted">
            Paste a control-plane bundle with any of these keys: `runtimes`, `systems`, `agents`, `topologies`,
            `executions`, `spans`, `metrics`, `interventions`, `evaluations`, `releases`.
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
