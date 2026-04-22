import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import type { ApiStoreSnapshot } from './store.js';
import { ApiStore } from './store.js';

export interface ApiStorageInfo {
  mode: 'memory' | 'file';
  persistenceEnabled: boolean;
  filePath: string | null;
  detail: string;
}

const DEFAULT_STORE_FILE = '.agent-studio/store.json';

function resolveStoreFilePath(env: NodeJS.ProcessEnv) {
  const configuredPath = env.AGENT_STUDIO_STORE_FILE?.trim();

  if (!configuredPath) {
    return null;
  }

  return resolve(configuredPath);
}

function readSnapshotFromDisk(filePath: string): ApiStoreSnapshot | null {
  if (!existsSync(filePath)) {
    return null;
  }

  const raw = readFileSync(filePath, 'utf8');

  if (!raw.trim()) {
    return null;
  }

  return JSON.parse(raw) as ApiStoreSnapshot;
}

function writeSnapshotToDisk(filePath: string, snapshot: ApiStoreSnapshot) {
  mkdirSync(dirname(filePath), { recursive: true });

  const tempPath = `${filePath}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  renameSync(tempPath, filePath);
}

export function getApiStorageInfo(env: NodeJS.ProcessEnv = process.env): ApiStorageInfo {
  const configuredPath = resolveStoreFilePath(env);

  if (!configuredPath) {
    return {
      mode: 'memory',
      persistenceEnabled: false,
      filePath: null,
      detail: `Ephemeral in-memory store. Set AGENT_STUDIO_STORE_FILE to persist imports. Suggested default: ${DEFAULT_STORE_FILE}`,
    };
  }

  return {
    mode: 'file',
    persistenceEnabled: true,
    filePath: configuredPath,
    detail: 'Persistent file-backed store for runtimes, systems, traces, interventions, and release history.',
  };
}

export function createConfiguredStore(env: NodeJS.ProcessEnv = process.env) {
  const storage = getApiStorageInfo(env);

  if (storage.mode === 'memory' || !storage.filePath) {
    return {
      store: new ApiStore(),
      storage,
    };
  }

  const snapshot = readSnapshotFromDisk(storage.filePath);
  const store = new ApiStore(undefined, {
    snapshot,
    onChange(nextSnapshot) {
      writeSnapshotToDisk(storage.filePath!, nextSnapshot);
    },
  });

  if (!snapshot) {
    writeSnapshotToDisk(storage.filePath, store.buildSnapshot());
  }

  return {
    store,
    storage,
  };
}
