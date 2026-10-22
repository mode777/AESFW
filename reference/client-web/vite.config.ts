import { defineConfig } from 'vite';

/**
 * Vite configuration for the reference client (REF-14.6). The app is plain
 * TypeScript, DOM, and SVG; the worker is emitted as an ES module.
 */
export default defineConfig({
  build: { target: 'es2022' },
  worker: { format: 'es' },
});
