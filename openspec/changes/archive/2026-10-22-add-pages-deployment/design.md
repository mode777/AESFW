# Design — add-pages-deployment

## Context

The reference client builds with Vite but has no base path and writes to `dist`, which collides with the TypeScript output. The repository is private on a Free plan, so it is made public to enable GitHub Pages. This document records the deployment wiring.

## Goals / Non-Goals

**Goals:** a subpath-safe client build and a Pages workflow.

**Non-Goals:** custom domains, per-PR previews, and CDN/caching tuning.

## Decisions

### D1 — Base path via `VITE_BASE`

`vite.config.ts` sets `base: process.env.VITE_BASE ?? '/'`. Local `dev`, `preview`, and the Playwright webServer leave it unset, so they stay at `/`. The Pages workflow sets `VITE_BASE=/AESFW/`.

### D2 — Separate web output

`build.outDir` is `dist-web`. `tsc --build` continues to write `dist` (the package's declared `exports`). `.gitignore` gains `dist-web/`. The `build:pages` script runs `vite build` with `VITE_BASE=/AESFW/` for convenience.

### D3 — Worker under a subpath

The worker is imported with Vite's `?worker` form, so Vite emits it as an asset and rewrites its URL with the base. The deployed smoke check (below) verifies this on the real URL.

### D4 — Workflow

`.github/workflows/pages.yml` runs on push to `main` and `workflow_dispatch`: checkout, `pnpm/action-setup@v4`, `actions/setup-node@v4` (Node 22, `cache: pnpm`), `pnpm install --frozen-lockfile`, `pnpm build`, the client build with `VITE_BASE=/AESFW/`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3` (path `reference/client-web/dist-web`), then `actions/deploy-pages@v4`. Permissions: `pages: write`, `id-token: write`.

### D5 — Repository visibility and Pages

The repository is switched to public and Pages is enabled with `build_type: workflow` via the API, since Pages is not available for private repositories on the Free plan.

### D6 — Verification

Locally: build with `VITE_BASE=/AESFW/` and assert `dist-web/index.html` references `/AESFW/assets/`. On the box or in CI: the workflow run. After the first run: load the Pages URL and confirm the shell becomes ready and the tick advances (the same checks as smoke flow 1).

## Amendments and clarifications to 01–07

- None.

## Risks / Trade-offs

- [Public repository] → the framework and content are abstract and theme-free; no secrets are in the tree (credentials live only in environment variables). This is a deliberate choice to enable Pages on the Free plan.
- [Base path is repo-name specific] → `VITE_BASE` is configurable, so a rename only changes the workflow env.

## Migration Plan

Additive build config and workflow. No framework or golden change. Rollback is reverting the change (the repo can stay public).

## Open Questions

None blocking.
