# Proposal

## Why

The reference client is now playable (M2 complete), but it can only be run from a local checkout. Publishing it as a static site lets the first playtest happen in a browser without a build step, which is the M2 "demo" and an input for reference-content and client priorities (08 §9). This change makes the client build subpath-safe and publishes it to GitHub Pages on every push to `main`. It is post-milestone infrastructure; the repository is made public so Pages is available on the current plan.

## What Changes

- Make the reference client build under a configurable base path (`VITE_BASE`, default `/`), so the same build works locally, in `vite preview`, in the Playwright checks, and under `https://<owner>.github.io/AESFW/`.
- Emit the web build to `reference/client-web/dist-web` so it no longer collides with the TypeScript output in `dist`.
- Add a `.github/workflows/pages.yml` workflow that builds the workspace and the client with `VITE_BASE=/AESFW/` and publishes `reference/client-web/dist-web` with `actions/deploy-pages`.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts.

## Capabilities

### Modified Capabilities

- `reference/client`: the client ships as a subpath-safe static site published to GitHub Pages.

## Impact

- **Packages:** `@aesfw-ref/client-web` (build config, a `build:pages` script); `.github/workflows/pages.yml`; `.gitignore`.
- **Tick phases:** none. **Commands:** none. **Events:** none. **Error codes:** none.
- **Out of scope:** custom domains, preview deployments per PR, and caching/CDN tuning.
- **Verification impact:** a local `vite build` under the base path is checked for asset URLs; the deployed URL is smoke-tested manually after the first workflow run. No framework test changes.
