import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { get, put } from '@vercel/blob';

import type { ApiStoreSnapshot } from './store.js';
import { ApiStore } from './store.js';

export interface ApiStorageInfo {
  mode: 'memory' | 'file' | 'blob';
  persistenceEnabled: boolean;
  filePath: string | null;
  blobPath: string | null;
  detail: string;
}

const DEFAULT_STORE_FILE = '.agent-studio/store.json';
const DEFAULT_BLOB_PATH = 'control-plane/store.json';

function readStorageMode(env: NodeJS.ProcessEnv): 'memory' | 'file' | 'blob' | null {
  const rawMode = env.AGENT_STUDIO_STORAGE_MODE?.trim().toLowerCase();

  if (rawMode === 'memory' || rawMode === 'file' || rawMode === 'blob') {
    return rawMode;
  }

  return null;
}

function resolveStoreFilePath(env: NodeJS.ProcessEnv) {
  const configuredPath = env.AGENT_STUDIO_STORE_FILE?.trim();

  if (!configuredPath) {
    return null;
  }

  return resolve(configuredPath);
}

function resolveBlobPath(env: NodeJS.ProcessEnv) {
  const configuredPath = env.AGENT_STUDIO_BLOB_PATH?.trim();

  if (!configuredPath) {
    return DEFAULT_BLOB_PATH;
  }

  return configuredPath.replace(/^\/+/, '');
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

async function readSnapshotFromBlob(blobPath: string, token?: string) {
  const result = await get(blobPath, {
    access: 'private',
    token,
    useCache: false,
  });

  if (!result || result.statusCode !== 200 || !result.stream) {
    return null;
  }

  const raw = await new Response(result.stream).text();

  if (!raw.trim()) {
    return null;
  }

  return JSON.parse(raw) as ApiStoreSnapshot;
}

async function writeSnapshotToBlob(blobPath: string, snapshot: ApiStoreSnapshot, token?: string) {
  await put(blobPath, `${JSON.stringify(snapshot, null, 2)}\n`, {
    access: 'private',
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
    token,
  });
}

export function getApiStorageInfo(env: NodeJS.ProcessEnv = process.env): ApiStorageInfo {
  const explicitMode = readStorageMode(env);
  const filePath = resolveStoreFilePath(env);
  const blobPath = resolveBlobPath(env);
  const blobToken = env.BLOB_READ_WRITE_TOKEN?.trim();

  if (explicitMode === 'blob') {
    if (blobToken) {
      return {
        mode: 'blob',
        persistenceEnabled: true,
        filePath: null,
        blobPath,
        detail: 'Persistent hosted Vercel Blob store for public imports, fleet history, and control-plane state.',
      };
    }

    return {
      mode: 'memory',
      persistenceEnabled: false,
      filePath: null,
      blobPath,
      detail: 'Blob mode was requested, but BLOB_READ_WRITE_TOKEN is missing. Falling back to ephemeral in-memory storage.',
    };
  }

  if (explicitMode === 'file') {
    if (filePath) {
      return {
        mode: 'file',
        persistenceEnabled: true,
        filePath,
        blobPath: null,
        detail: 'Persistent file-backed store for self-hosted Agent Studio deployments.',
      };
    }

    return {
      mode: 'memory',
      persistenceEnabled: false,
      filePath: null,
      blobPath: null,
      detail: `File mode was requested, but AGENT_STUDIO_STORE_FILE is missing. Falling back to ephemeral in-memory storage. Suggested default: ${DEFAULT_STORE_FILE}`,
    };
  }

  if (blobToken) {
    return {
      mode: 'blob',
      persistenceEnabled: true,
      filePath: null,
      blobPath,
      detail: 'Persistent hosted Vercel Blob store for public imports, fleet history, and control-plane state.',
    };
  }

  if (filePath) {
    return {
      mode: 'file',
      persistenceEnabled: true,
      filePath,
      blobPath: null,
      detail: 'Persistent file-backed store for self-hosted Agent Studio deployments.',
    };
  }

  return {
    mode: 'memory',
    persistenceEnabled: false,
    filePath: null,
    blobPath: null,
    detail: `Ephemeral in-memory store. Set AGENT_STUDIO_STORAGE_MODE=blob with BLOB_READ_WRITE_TOKEN for hosted persistence, or AGENT_STUDIO_STORE_FILE for self-hosted file persistence. Suggested file default: ${DEFAULT_STORE_FILE}`,
  };
}

export async function createConfiguredStore(env: NodeJS.ProcessEnv = process.env) {
  const storage = getApiStorageInfo(env);

  if (storage.mode === 'blob' && storage.blobPath) {
    const token = env.BLOB_READ_WRITE_TOKEN?.trim();
    const snapshot = await readSnapshotFromBlob(storage.blobPath, token);
    const store = new ApiStore(undefined, {
      snapshot,
      onChange(nextSnapshot) {
        return writeSnapshotToBlob(storage.blobPath!, nextSnapshot, token);
      },
    });

    if (!snapshot) {
      await writeSnapshotToBlob(storage.blobPath, store.buildSnapshot(), token);
    }

    return {
      store,
      storage,
    };
  }

  if (storage.mode === 'file' && storage.filePath) {
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

  return {
    store: new ApiStore(),
    storage,
  };
}
