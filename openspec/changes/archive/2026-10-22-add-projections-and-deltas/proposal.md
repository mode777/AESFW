# Proposal

## Why

Roadmap 08, M2 item 2.3 (`add-projections-and-deltas`, capability `app/projections`, size M). The client sees the simulation only through immutable snapshots and deltas (04 §9), so the application layer must build a per-actor projection and diff two projections. This row retires R-07 (the presentation contract unworkable in practice) by proving the projection and delta shapes against the protocol. Depends on: `add-session-and-command-gateway` (2.2) — archived 2026-10-22.

## What Changes

- Add a read-only `WorldReader` facade to `@aesfw/core` (TDS-10.2) with typed accessors over owners, locations, entities, and inventories.
- Add `@aesfw/app/projections`: `project(session, actor)` builds a full `SnapshotDto`; `diffProjection(prev, next)` produces a `SnapshotDeltaDto`; `applyDelta(prev, delta)` applies a delta (PIC-18, P-10); `canApplyDelta(base, delta)` implements the resync rule.
- Add `applyDelta` to `@aesfw/protocol` so the client (which may import only protocol) can apply deltas.
- Add the P-10 property test: applying `diffProjection(p_n, p_{n+1})` to `p_n` yields `p_{n+1}`.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts.

## Capabilities

### New Capabilities

- `app/projections`: the per-actor projection, the delta computation, and delta application.

## Impact

- **Packages:** `@aesfw/core` gains `src/world/reader.ts`; `@aesfw/protocol` gains `applyDelta`; `@aesfw/app` gains `src/projections/**`.
- **Tick phases:** none. **Commands:** none. **Events:** none. **Error codes:** none new.
- **Out of scope:** fog filtering and owner knowledge in projections (8.4); read models (2.4); save/load (2.5); the worker host (2.6).
- **Verification impact:** `pnpm test` gains projection, delta, and P-10 tests; goldens unchanged.
