# Proposal

## Why

Roadmap 08, M0 item 0.5 (`add-world-state-model`, capability `kernel/world-state`, size M). The deterministic primitives of 0.3 and 0.4 have nothing to operate on until there is an authoritative `World` record with stable iteration, an entity allocator, and encode/decode/clone/hash operations. This row retires R-01 (determinism breaks through iteration order and engine differences) at the state layer and is the foundation the tick pipeline (0.6), the testkit harness (0.7), and every later system build on. Depends on: `add-fixed-point-arithmetic` (0.3) and `add-deterministic-primitives` (0.4) — both archived 2026-10-21.

## What Changes

- Add the `World` record of TDS-8.1 to `@aesfw/core` (`packages/core/src/world/`): `formatVersion`, `tick`, `nextEntityId`, `nextReservationId`, `rng`, `owners`, `stores`, `ledger`, `accumulators`, `timers`, `exchanges`, `commandQueue`, `modules`, `metrics`, and the non-authoritative `caches`. Fields owned by later rows are present as empty plain-data containers whose value types are refined by their owning rows.
- Add `ComponentStore<T>` (TDS-8.2) with ascending entity-ID iteration and phase-30 tombstones, and a `ComponentStores` container covering the v1 store kinds of TDS-8.3.
- Add the entity and reservation allocators: `allocateEntity` and `allocateReservation`, monotonic, never reusing an ID (ARCH-3.1, TDS-7).
- Add the owners table (TDS-8.1): per-owner knowledge, accounts, purpose locks, unlock state, and deficit-pause state, as sorted plain data.
- Add `createWorld(registry, setup)` returning `Result<World, Diagnostic[]>` (TDS-10.1) with the `WorldSetup` fields of TDS-10.1, plus the minimal core `Registry` abstraction (definition-type handle ↔ string ID) that `@aesfw/content` will implement in 1.4.
- Add `encodeWorld`, `decodeWorld`, `cloneWorld`, and `hashWorld` (TDS-8.5): canonical state uses string definition IDs, sorted keys, ascending entity order; caches are excluded and left dirty by decode/clone; the hash is `fnv1a64-canonical-json-v1`.
- Add L0/L2 unit tests for the store, allocators, codec round-trip, clone independence, and cache exclusion, and an invariant test for INV-10, INV-18, and INV-24.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts (no goldens exist yet).

## Capabilities

### New Capabilities

- `kernel/world-state`: the authoritative `World` record, component stores with deterministic iteration and tombstones, entity and reservation allocation, the owners table, and the canonical encode/decode/clone/hash operations — the state substrate every system mutates through commands.

### Modified Capabilities

- None. `foundation/determinism` and `foundation/fixed-point` are unchanged.

## Impact

- **Packages:** `@aesfw/core` gains `src/world/**` and `src/registry/types.ts`; `src/det/canonical.ts` gains the exported `JsonValue` type; `src/errors/diagnostic.ts` gains the core `Diagnostic` shape used by `createWorld`/`decodeWorld` (TDS-20.3; `@aesfw/content` re-exports it in 1.4). No runtime dependency is added.
- **Tick phases:** none yet (phase 30 tombstone compaction and phase 04 cache rebuild are implemented as store/codec behavior, not as systems; 0.6 registers the phase table). **Store kinds:** the v1 kinds of TDS-8.3 are registered empty. **Commands/events/error codes:** none. **Diagnostic codes:** `invalid_canonical_state` (decode) and `unknown_definition_handle` (encode), as `Diagnostic` codes.
- **Out of scope:** the tick pipeline, `step`, `runPhases`, `TickContext`, and write-set checks (`add-tick-pipeline-skeleton`, 0.6); the testkit builders and `checkInvariants` (`add-testkit-foundation`, 0.7); the real compiled `Registry` (`add-registry-compilation`, 1.4); component value schemas (`add-core-definition-schemas`, 1.2); transactions and the reservation ledger semantics (`add-inventory-transactions`, 1.7); spatial caches (`add-grid-spatial-policy`, 3.1).
- **Verification impact:** `pnpm test` gains world-state L0/L2 tests; INV-10, INV-18, and INV-24 become testable ahead of the 0.7 checker.
