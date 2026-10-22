# Proposal

## Why

Roadmap 08, M2 item 2.10 (`add-client-smoke-e2e`, capability `reference/client`, size S). M2's exit criteria require that the browser and CLI hashes match and that the closed loop is playable end to end. This row adds the Playwright smoke flows and the browser-vs-CLI determinism check. Depends on: `add-client-inspector-and-tables` (2.9) — archived 2026-10-22.

## What Changes

- Add a Playwright configuration and the smoke flows 1 (load, start, tick advances), 2 (inspect an entity), 4 (toggle an entity), and 6 (save and reload).
- Add the browser-versus-CLI determinism check: step the client a fixed number of ticks and compare its state hash with a headless run of the same content, seed, and tick count.
- Extend the `delta` worker response with an optional `hash` so the client can display and check the last state hash.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts.

## Capabilities

### Modified Capabilities

- `reference/client`: the smoke and determinism checks.
- `app/protocol`: the `delta` response carries the last state hash.

## Impact

- **Packages:** `@aesfw-ref/client-web` gains `e2e/**` and a Playwright config; `@aesfw/protocol` and `@aesfw/host-web` carry the delta hash.
- **Tick phases:** none. **Commands:** none new. **Events:** none. **Error codes:** none.
- **Out of scope:** flows 3 and 5 (placement and routes, 3.8 and 6.9); axe checks and full keyboard navigation (11.4); visual regression.
- **Verification impact:** `pnpm test` gains a protocol codec test; the Playwright flows run on the build/verification box (the development container cannot launch Chromium).
