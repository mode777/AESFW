# Design — add-browser-determinism-check

## Context

0.7 is archived: the pipeline, the world codec, and the testkit harness exist. The M0 exit criterion requires equal hashes in Node and Chromium (VER-8.2). What the check must do is fixed by VER-8.2 and VER-15.3; this document records only the choices they leave open.

## Goals / Non-Goals

**Goals:** a browser-safe empty-world replay runner; a committed Node golden; a browser-mode Vitest project on Playwright/Chromium that compares against the golden; a `pnpm test:browser` script and a CI stage.

**Non-Goals:** Firefox and WebKit runs (nightly, later); client smoke flows (`add-client-smoke-e2e`, 2.10); browser-mode ambient-API traps (the runner uses no ambient APIs); benchmark runs.

## Decisions

### D1 — Layout

`packages/testkit/src/browser/` holds `empty-world-runner.ts` (pure), `empty-world.hashes.ts` (the committed golden), `empty-world-golden.test.ts` (the Node reference test, run by the normal Vitest projects), and `determinism.browser.test.ts` (the browser-mode test). `vitest.browser.config.ts` at the repository root configures the browser project.

### D2 — The runner is pure and browser-safe

`runEmptyWorldCheckpoints(ticks = 10000, interval = 1000)` builds a world from `createEmptyRegistry()` with a fixed seed, steps it with `hash: false`, and records `hashWorld` every `interval` ticks. It uses only `@aesfw/core` pure exports and no Node or DOM API, so Vite can bundle it for the browser unchanged. The fixed seed `[1, 2]` makes the golden reproducible.

### D3 — The golden is a TypeScript module, not JSON

The golden is `export const EMPTY_WORLD_HASHES: readonly string[]`, imported by both tests. This avoids enabling `resolveJsonModule` and keeps the value typed and tree-shakeable. The Node test asserts the runner reproduces it; a change to the runner or to hashing breaks the Node test until the golden is deliberately regenerated (VER-9.4), and the browser test then confirms the same value in Chromium.

### D4 — Browser project configuration and separation

`vitest.browser.config.ts` enables Vitest browser mode with `provider: 'playwright'`, `headless: true`, and a single `chromium` instance, includes only `packages/testkit/src/browser/**/*.browser.test.ts`, and repeats the `@aesfw/*` source aliases so the browser bundle uses source, not `dist`. The main `vitest.config.ts` Node projects exclude `**/*.browser.test.ts` so the browser test is not also run in Node. `vitest.browser.config.ts` is added to the ESLint ignore list beside `vitest.config.ts` (it is not part of a package tsconfig project).

### D5 — Scripts and CI

The root gains `test:browser` (`vitest run --config vitest.browser.config.ts`). `.github/workflows/ci.yml` gains a browser-install step (`pnpm exec playwright install --with-deps chromium`) and a `pnpm test:browser` step in the L7 position after the unit tests (VER-15.3); `nightly.yml` notes the all-engines extension. Root `devDependencies` gain `@vitest/browser` and `playwright` at pinned versions.

### D6 — Local execution limitation

The development container is Alpine/musl and cannot launch the glibc Playwright Chromium build (missing system libraries; `apk add` is unavailable). The browser stage therefore runs in CI (ubuntu-latest) and on the Linux build/verification box. Locally, the Node reference test and the configuration are verified; the browser test is exercised where a browser is available. This is a known environment limit, not a gap in the check.

## Amendments and clarifications to 01–07

None. The check implements VER-8.2 and VER-15.3 without refining any document.

## Risks / Trade-offs

- [Browser mode adds heavy devDependencies] → they are root devDependencies only, pinned, and used solely by the L7 stage.
- [The golden could drift from the Node run] → the Node test pins it, so drift is a test failure with a clear cause.
- [10,000 ticks in the browser could be slow] → the run is a single pass over no-op phases with ten hashes; well within the PR budget.
- [Alpine cannot run Chromium locally] → recorded in D6; CI and the verification box cover it.

## Migration Plan

Additive testkit sources, one browser config, scripts, and devDependencies; no state, save, protocol, or golden change beyond adding a new M0 reference. Rollback is reverting the change.

## Open Questions

None blocking.
