import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const pkgDir = (...segments: string[]) => resolve(repoRoot, ...segments);

const packageProject = (name: string, dir: string) => ({
  test: {
    name,
    root: pkgDir(dir),
    environment: 'node' as const,
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
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
      packageProject('testkit', 'packages/testkit'),
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
