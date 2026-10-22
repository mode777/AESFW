# Design — add-client-shell

## Context

2.6 (worker host) and 2.7 (R0 content) are archived. REF-14.1 fixes the module layout and REF-14.2 the data flow. This document records the shell's composition and the testable boundary.

## Goals / Non-Goals

**Goals:** the Vite app skeleton, signals, the mirror, view state, i18n, the top bar, and the debug overlay.

**Non-Goals:** the inspector, tables, grid, world map, interaction modes (2.9, 3.7–3.8, 6.8–6.9); Playwright smoke (2.10); full accessibility (11.4).

## Decisions

### D1 — Module layout

`reference/client-web/src/` holds `main.ts`, `session/`, `store/` (`signals.ts`, `mirror.ts`, `view-state.ts`), `selectors/`, `views/`, `dom/`, `i18n/`, and `style/`, matching REF-14.1. `index.html` and `vite.config.ts` sit at the package root.

### D2 — Signals

`signal<T>(initial)` returns a callable getter with `set` and `subscribe`. `computed<T>(fn)` tracks which signals `fn` reads and recomputes lazily on read when any dependency changed; it notifies its own subscribers. Equality is `Object.is`.

### D3 — Mirror

`createMirror({ requestSnapshot })` holds a projection signal and an events signal. `applySnapshot` replaces the projection and clears pending events. `applyDelta` uses `canApplyDelta`/`applyDelta` from `@aesfw/protocol`; on mismatch it calls `requestSnapshot` and leaves the projection unchanged.

### D4 — View state and i18n

`createViewState()` holds selection, mode, overlays, open panel, and locale as signals. `createI18n(entries)` returns `t` (key fallback) and `formatBaseUnits` (manual grouping, no `Intl`, so it is deterministic and unit-testable).

### D5 — Views

`views/top-bar.ts` and `views/debug-overlay.ts` take a host element and a view-model getter and re-render on signal changes. They use `dom/h.ts` helpers. The composition root `main.ts` creates the worker via `new Worker(new URL('@aesfw/host-web/worker', import.meta.url), { type: 'module' })`, the `SessionClient`, the mirror, and the views. It is a shell module and is exercised by the browser checks.

### D6 — Vite

`vite.config.ts` uses the default Vite app build with `index.html` as the entry; `@aesfw/host-web/worker` resolves through the workspace. `vite` is a devDependency resolved from the pnpm store.

## Amendments and clarifications to 01–07

- None.

## Risks / Trade-offs

- [DOM views are not unit-tested locally] → the pure modules (signals, mirror, i18n) carry the unit tests; DOM is covered by Playwright (2.10) on the build box.
- [Worker URL resolution] → Vite handles the `new URL(..., import.meta.url)` worker form; the exact wiring is verified on the build box.

## Migration Plan

Additive client modules. No framework or golden change. Rollback is reverting the change.

## Open Questions

None blocking.
