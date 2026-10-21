# Proposal

## Why

Roadmap 08, M0 item 0.9 (`add-browser-determinism-check`, capability `testkit/determinism-matrix`, size S). The M0 exit criterion is that an empty world's hashes are equal in Node and Chromium. The Node side is covered by the pipeline determinism test; the browser side needs a browser-mode replay that compares the same hash checkpoints. This row closes R-01 (determinism breaks through engine differences) with an executable cross-environment check. Depends on: `add-testkit-foundation` (0.7) — archived 2026-10-21.

## What Changes

- Add a pure, browser-safe empty-world runner to `@aesfw/testkit` that builds a world from an empty registry, steps it 10,000 ticks, and records a hash checkpoint every 1,000 ticks.
- Record the Node-produced checkpoint list as a committed golden (`empty-world.hashes.ts`) and add a Node test that asserts the runner reproduces it, pinning the Node reference.
- Add a Vitest browser-mode configuration (`vitest.browser.config.ts`) with the Playwright provider, headless Chromium, and the shared `@aesfw/*` source aliases, plus a browser test that runs the same runner and asserts the Chromium checkpoints equal the Node golden.
- Add the root script `pnpm test:browser` and the Chromium determinism stage in `.github/workflows/ci.yml` (VER-15.3), including a Playwright browser-install step; note the all-engines extension for nightly.
- No **BREAKING** changes; the golden is a new M0 reference, not a change to an existing one.

## Capabilities

### New Capabilities

- `testkit/determinism-matrix`: the cross-environment determinism check that replays an empty world in a browser and compares its hash checkpoints with the Node reference, making the VER-8.2 matrix executable.

### Modified Capabilities

- None. `testkit/harness` is unchanged.

## Impact

- **Packages:** `@aesfw/testkit` gains `src/browser/**` (runner, golden, Node reference test, browser test); `src/index.ts` is unchanged (the runner is test-only). Root `devDependencies` gain `@vitest/browser` and `playwright` at pinned versions.
- **Tooling/CI:** new `vitest.browser.config.ts`, root `test:browser` script, and a Chromium determinism CI stage with `playwright install --with-deps chromium`; `nightly.yml` notes the all-engines extension.
- **Tick phases:** none. **Store kinds:** none. **Commands/events/error codes:** none. **Diagnostic codes:** none.
- **Out of scope:** Firefox and WebKit matrix runs (nightly, later); full Playwright client smoke flows (`add-client-smoke-e2e`, 2.10); browser-mode reuse of the ambient-API traps (the setup file is authored to allow it, but the browser runner uses no ambient APIs).
- **Verification impact:** `pnpm test:browser` becomes runnable and gates the Chromium matrix in CI. The local container cannot launch Chromium (Alpine/musl vs the glibc browser build), so the browser run is exercised in CI and on the Linux build/verification box; the Node reference is verified locally.
