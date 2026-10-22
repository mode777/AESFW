# Proposal

## Why

Roadmap 08, M2 item 2.6 (`add-web-worker-host`, capability `host/web`, size M). M2's exit criteria require the R0 loop to run in a Web Worker off the UI thread, with a clock, coalesced deltas, saves, and an error boundary. This row retires R-06 (browser performance) and R-07 (presentation contract). Depends on: `add-projections-and-deltas` (2.3) and `add-save-load` (2.5) — both archived 2026-10-22.

## What Changes

- Add the worker session host to `@aesfw/host-web/worker`: `createSessionHost` implements the TDS-21.1 message protocol (init, subscribe, command, control, query, save, load) over an injected `MessagePort`, clock, and save storage, so it is testable in-process.
- Add the main-thread `SessionClient` to `@aesfw/host-web/client`: a thin proxy over the protocol that depends only on `@aesfw/protocol`.
- The host owns the clock: speed, `max_catch_up_ticks` (default 8), coalesced deltas, and an error boundary that stops the clock on an `InvariantViolation` and reports the last good hash.
- Extend the `init` worker message with the content files to load (additive), so the client can pass the reference content to the worker.
- Move content-to-world entity instantiation from `@aesfw/testkit` into `@aesfw/app` so both the worker host and the scenario runner share it.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts (the moved instantiation is byte-identical).

## Capabilities

### New Capabilities

- `host/web`: the worker session host and the main-thread session client.

### Modified Capabilities

- `app/protocol`: the `init` message carries the content files.

## Impact

- **Packages:** `@aesfw/host-web` gains `src/worker/session-host.ts` and a real `src/client/**`; `@aesfw/app` gains `src/content/instantiate.ts`; `@aesfw/testkit` imports instantiation from `@aesfw/app`.
- **Tick phases:** none. **Commands:** the four of 2.2. **Events:** the domain events of a tick. **Error codes:** none new.
- **Out of scope:** IndexedDB is wrapped behind an injected storage interface; the browser wiring of it and the reference client arrive in 2.8–2.9.
- **Verification impact:** `pnpm test` gains in-process host tests with a fake port and clock.
