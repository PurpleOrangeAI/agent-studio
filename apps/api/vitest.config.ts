import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@agent-studio/contracts': path.resolve(rootDir, '../../packages/contracts/src/index.ts'),
      '@agent-studio/demo': path.resolve(rootDir, '../../packages/demo/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
});
