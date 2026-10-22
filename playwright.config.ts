import { defineConfig } from 'playwright/test';

/**
 * Playwright configuration for the reference client smoke and determinism
 * checks (VER-13.2, VER-8.2). It builds the workspace and the client, then
 * serves the built client. Chromium is provided by the build/verification box.
 */
export default defineConfig({
  testDir: 'reference/client-web/e2e',
  timeout: 60_000,
  fullyParallel: false,
  use: { baseURL: 'http://localhost:4173' },
  webServer: {
    command:
      'pnpm build && pnpm --filter @aesfw-ref/client-web build && pnpm --filter @aesfw-ref/client-web preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 240_000,
  },
});
