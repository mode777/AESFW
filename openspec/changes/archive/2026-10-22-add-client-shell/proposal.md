# Proposal

## Why

Roadmap 08, M2 item 2.8 (`add-client-shell`, capability `reference/client`, size M). M2's demo is the first playtest of the closed loop, which needs a browser shell that renders the simulation and controls the clock. This row delivers the Vite app skeleton, signals, the authoritative mirror, client-local view state, i18n with fallback, the top bar, and the debug overlay. It retires R-08 (the game not legible or fun). Depends on: `add-web-worker-host` (2.6) and `add-reference-content-seed` (2.7) — both archived 2026-10-22.

## What Changes

- Add the `@aesfw-ref/client-web` Vite application: `main.ts` composition root, `index.html`, `vite.config.ts`, and `style/tokens.css` + `base.css`.
- Add the pure client modules: `store/signals.ts`, `store/mirror.ts`, `store/view-state.ts`, `i18n/`, and `dom/` helpers.
- Add the `views/` shell: top bar (tick, speed, run/pause/step, blocked count) and the debug overlay.
- The client imports only `@aesfw/protocol` and `@aesfw/host-web/client` (TDS-4.3 rule 4).
- No **BREAKING** changes; no **HASH-CHANGING** artifacts.

## Capabilities

### New Capabilities

- `reference/client`: the browser client shell.

## Impact

- **Packages:** `@aesfw-ref/client-web` gains `src/**`, `index.html`, and `vite.config.ts`; `vite` is added as a devDependency.
- **Tick phases:** none. **Commands:** the four of 2.2 via the client. **Events:** rendered in the log later (2.9).
- **Out of scope:** the inspector, tables, grid, world map, and interaction modes (2.9, 3.7–3.8, 6.8–6.9); Playwright smoke (2.10); the full keyboard map and accessibility pass (11.4).
- **Verification impact:** `pnpm test` gains pure-module tests (signals, mirror, i18n); DOM views are exercised by the browser checks.
