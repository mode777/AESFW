import { defineConfig } from 'vite';

/**
 * Vite configuration for the reference client (REF-14.6). The app is plain
 * TypeScript, DOM, and SVG; the worker is emitted as an ES module.
 *
 * `VITE_BASE` sets the base path for subpath hosting (GitHub Pages builds with
 * `VITE_BASE=/AESFW/`); it defaults to `/` so local dev, preview, and the
 * Playwright checks are unaffected. The web build goes to `dist-web` so it
 * does not collide with the TypeScript output in `dist`.
 */
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  build: { target: 'es2022', outDir: 'dist-web' },
  worker: { format: 'es' },
});
