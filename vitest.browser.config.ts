import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const pkgDir = (...segments: string[]) => resolve(repoRoot, ...segments);

/**
 * Browser-mode determinism matrix (VER-8.2). Runs the empty-world replay in
 * headless Chromium and compares it with the Node golden. The `@aesfw/*`
 * aliases point at source so the browser bundle is the same code the Node
 * tests exercise.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@aesfw/core': pkgDir('packages/core/src/index.ts'),
      '@aesfw/content': pkgDir('packages/content/src/index.ts'),
      '@aesfw/protocol': pkgDir('packages/protocol/src/index.ts'),
      '@aesfw/app': pkgDir('packages/app/src/index.ts'),
      '@aesfw/testkit': pkgDir('packages/testkit/src/index.ts'),
    },
  },
  test: {
    include: ['packages/testkit/src/browser/**/*.browser.test.ts'],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
  },
});
