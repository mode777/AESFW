# Design — add-web-worker-host

## Context

2.3 (projections) and 2.5 (save/load) are archived. TDS-21.1 defines the worker protocol, clock, coalescing, persistence, and error boundary. This document records the host's composition and the testability boundary.

## Goals / Non-Goals

**Goals:** the worker session host and the main-thread `SessionClient`, testable in-process with a fake port and clock.

**Non-Goals:** IndexedDB wiring and the reference client (2.8–2.9).

## Decisions

### D1 — Instantiation moves to app

`instantiateContentEntities` moves from `@aesfw/testkit/src/scenario/instantiate.ts` to `@aesfw/app/src/content/instantiate.ts` and is exported from `@aesfw/app`. The testkit scenario and bench runners import it from `@aesfw/app`. The code is unchanged, so goldens do not move.

### D2 — Injected composition root

`createSessionHost(options)` takes `port` (`postMessage`/`onMessage`), `loadContent(): CompiledContent`, `now()`, `setTimer(fn, ms)`, `clearTimer(id)`, `storage` (`get(slot)`/`put(slot, doc)`), `tickDurationMs`, `actor`, `actorId`, and `maxCatchUpTicks` (default `8`). It is synchronous; the worker entry performs the async content fetch and then constructs it. This makes the host testable with an in-process fake port and a fake clock (VER-12).

### D3 — Protocol and flow

`init` loads content (or a save slot), calls `createSession`, `instantiateWorld(defaultWorldPlan(registry))`, and `instantiateContentEntities`, then posts `ready`. `subscribe` stores the actor and posts a full `snapshot` (`project(session, actor)`). `command` calls `submitCommand` and posts `command_result`. `query` posts a `query_result` (empty in M2; read-model queries arrive later). `save`/`load` use `save`/`load` and `storage`.

### D4 — Clock and coalescing

The host holds `speed` (ticks per tick duration), a `running` flag, and the last published projection. On `run` it schedules a wake via `setTimer` for `tickDurationMs`; each wake computes `ticks = min(speed, maxCatchUpTicks)`, advances that many ticks, diffs the newest projection against the last published one, and posts one `delta` with all events since the last publication. `pause` clears the timer. `step` advances immediately without starting the loop. Speed defaults to `1`.

### D5 — Error boundary

`advance` is wrapped; an `InvariantViolation` stops the clock and posts `error` with `code`, `arguments`, and the last good hash (`hashWorld`). The session is left intact for inspection.

### D6 — Session client

`createSessionClient(port)` returns `{ init, subscribe, command, control, query, save, load, onMessage }`, sending `WorkerRequestDto`s with `protocol_version` `1` and decoding responses with `decodeWorkerResponse`. It imports only `@aesfw/protocol`.

## Amendments and clarifications to 01–07

- The `init` message carries the content sources (additive to TDS-21.1's arrows), so the client can pass fetched content to the worker.

## Risks / Trade-offs

- [Content fetch is outside the host] → keeps the host synchronous and testable; the worker entry owns the async boundary.
- [Query is a stub] → read-model queries are typed but empty until a later row needs them.

## Migration Plan

Additive host modules and one moved app module. No goldens change. Rollback is reverting the change.

## Open Questions

None blocking.
