# Design — add-client-smoke-e2e

## Context

2.9 (inspector and tables) is archived. VER-13.2 lists the Playwright smoke flows and VER-8.2 the cross-environment matrix. This document records the e2e layout and the determinism check.

## Goals / Non-Goals

**Goals:** smoke flows 1, 2, 4, 6 and the browser-versus-CLI determinism check.

**Non-Goals:** flows 3 and 5 (3.8, 6.9); axe and full keyboard navigation (11.4); visual regression.

## Decisions

### D1 — Playwright layout

`playwright.config.ts` at the repository root starts the client with `vite preview` (after `vite build`) and runs the tests in `reference/client-web/e2e/`. The `pnpm test:e2e` script runs it. Chromium is provided by the build/verification box (the development container cannot launch it).

### D2 — Delta hash

The worker tracks the last good hash (already kept for the error boundary) and includes it as `hash` on each `delta` response. The client stores it in its debug metadata; the debug overlay shows it. This is additive to TDS-21.1 and lets the determinism test read the hash through the UI without a privileged channel.

### D3 — Determinism check

The determinism test builds the client, opens it, steps `20` ticks through the top bar (seed `[0, 0]`, the worker default), toggles the debug overlay, and reads the hash. It then runs `aesfw run` on a scenario with the same content, seed, and tick count and compares the checkpoint hash. Because `tick_duration_ms` is not part of the hashed world state, the worker's `100` and the scenario's `1000` do not affect the comparison.

### D4 — Test hooks

The flows use the stable `data-testid`s of 07 §16 (`topbar-tick`, `topbar-play`, `topbar-step`, `entity-item-*`, `inspector`, `inspector-toggle-enabled`, `debug-overlay`).

## Amendments and clarifications to 01–07

- None.

## Risks / Trade-offs

- [Playwright cannot run locally] → the flows run on the build/verification box and in CI's L10 stage; the development container reports an environment limitation, not a test failure (AGENTS.md).
- [Stepping through the UI is slower than a direct API] → the flows use the step control and a small tick count.

## Migration Plan

Additive e2e and protocol changes. No goldens change. Rollback is reverting the change.

## Open Questions

None blocking.
