import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const pkgDir = (...segments: string[]) => resolve(repoRoot, ...segments);

/** Pure-package projects run with the ambient-API traps of TDS-5.5 (design
 * D4); shell and reference projects keep stock globals. */
const PURE_PACKAGES = new Set(['core', 'content', 'protocol', 'app', 'testkit']);

const packageProject = (name: string, dir: string, overrides: Record<string, unknown> = {}) => ({
  test: {
    name,
    root: pkgDir(dir),
    environment: 'node' as const,
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.browser.test.ts'],
    passWithNoTests: true,
    ...(PURE_PACKAGES.has(name) ? { setupFiles: [pkgDir('tools/vitest.purity-setup.ts')] } : {}),
    ...overrides,
  },
});

export default defineConfig({
  resolve: {
    alias: {
      '@aesfw/core': pkgDir('packages/core/src/index.ts'),
      '@aesfw/content': pkgDir('packages/content/src/index.ts'),
      '@aesfw/protocol': pkgDir('packages/protocol/src/index.ts'),
      '@aesfw/app': pkgDir('packages/app/src/index.ts'),
      '@aesfw/testkit': pkgDir('packages/testkit/src/index.ts'),
      '@aesfw/host-web/worker': pkgDir('packages/host-web/src/worker/index.ts'),
      '@aesfw/host-web/client': pkgDir('packages/host-web/src/client/index.ts'),
    },
  },
  test: {
    projects: [
      packageProject('core', 'packages/core'),
      packageProject('content', 'packages/content'),
      packageProject('protocol', 'packages/protocol'),
      packageProject('app', 'packages/app'),
      packageProject('testkit', 'packages/testkit', { testTimeout: 30000 }),
      packageProject('host-web', 'packages/host-web'),
      packageProject('host-node', 'packages/host-node'),
      packageProject('client-web', 'reference/client-web'),
    ],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**', 'reference/client-web/src/**'],
      exclude: ['**/*.test.ts', '**/dist/**'],
    },
  },
});
