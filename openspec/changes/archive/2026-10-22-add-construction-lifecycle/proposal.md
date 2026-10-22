# Proposal

## Why

Roadmap 08, M3 item 3.2 (`add-construction-lifecycle`, capability `sim/construction`, size L). M3 is the space-and-construction milestone and retires R-09 (spatial and placement complexity). The grid policy of 3.1 can validate and place a footprint, and 1.7 provides the reservation ledger and atomic transaction builder, but an entity still has no lifecycle: there is no way to plan a building, reserve its construction costs, construct it over a configured duration, commit those costs under a commit policy, cancel it, or deconstruct it. Phases 03 and 30 are registered no-ops, so nothing advances the generic lifecycle of GDD-9.1. Until that mechanism exists, no placement command (3.3) can create a building and no later row can rely on an entity moving from planned to active. This row delivers the lifecycle state machine, construction plans and progress, atomic cost reservation, the `start`/`continuous`/`completion` commit policies of GDD-18.1 and CONT-6.8, cancellation, and deconstruction policies. Depends on: `add-grid-spatial-policy` (3.1) — archived 2026-10-22; `add-inventory-transactions` (1.7) — archived 2026-10-21.

## What Changes

- Add the generic lifecycle states of GDD-9.1 (`planned`, `awaiting_resources`, `constructing`, `active`, `disabled`, `blocked`, `deconstructed`, `cancelled`) in the `lifecycle` component, with a documented total-order transition relation.
- Add the `constructionPlan` component (duration, resolved costs, commit policy, inventory) and the `constructionProgress` component (elapsed progress, start tick, outstanding reservations, per-line committed quantities, deconstruction deadline).
- Implement phase 03 (`resolveLifecycleAndConstruction`): reconcile operational states (`disabled`/`blocked`), reserve a plan's costs atomically with purpose `construction`, enter `constructing` on success or `awaiting_resources` on failure, advance construction progress, and commit reserved costs under the configured commit policy; activate on completion.
- Implement phase 30 (`finalizeLifecycle`): release expired reservations (TDS-12.3), complete cancellation and deconstruction (deposit returned resources atomically, release outstanding reservations), tombstone removed entities, compact every component store (INV-24), and mark the derived caches dirty.
- Add typed seams for the placement commands owned by 3.3 (`requestCancellation`, `requestDeconstruction`, `createConstructionPlan`) without implementing those commands.
- Extend the entity-definition content schema (CONT-6.8) with the optional `construction` component (`duration_ticks`, `costs`, `commit_policy`, optional `deconstruction`) and validate that cost and return references name resources.
- No **BREAKING** changes and no **HASH-CHANGING** artifacts: phases 03 and 30 only touch entities that already carry a `lifecycle` component, which no existing content or golden creates; the expired-reservation and compaction hooks are no-ops on current worlds.

## Capabilities

### New Capabilities

- `sim/construction`: the generic entity lifecycle state machine, construction plans and progress, atomic construction-cost reservation, the `start`/`continuous`/`completion` commit policies, cancellation, deconstruction policies, and the phase-03/phase-30 finalization of lifecycle and expired reservations.

### Modified Capabilities

- `content/schemas`: adds the optional `construction` component to the entity-definition schema and its reference checks.

## Impact

- **Packages:** `@aesfw/core` gains `src/sim/construction/**` and implements `src/systems/phase-03-resolve-lifecycle-and-construction.ts` and `src/systems/phase-30-finalize-lifecycle.ts`; `src/world/types.ts` types the `lifecycle`/`constructionPlan`/`constructionProgress` store values (no new store kind); `src/index.ts` exports the new surface. `@aesfw/content` extends `src/schemas/entity.ts` and `src/registry/references.ts`. No new runtime dependency is added to `@aesfw/core`.
- **Tick phases:** phase 03 `resolveLifecycleAndConstruction` becomes active (reads `lifecycle`, `constructionPlan`, `constructionProgress`, `enabled`, `producer`, `inventory`; writes `lifecycle`, `constructionProgress`, `inventory`, `ledger`). Phase 30 `finalizeLifecycle` becomes active (reads `ledger`, `lifecycle`, `constructionPlan`, `constructionProgress`, `inventory`; writes every component store and `ledger`). **Store kinds:** `lifecycle`, `constructionPlan`, `constructionProgress` (all already in the TDS-8.3 catalogue). **Derived cache:** phase 30 marks `world.caches.dirty` after removals.
- **Commands/events:** no new command types (the placement and construction commands are 3.3). **Events:** `ConstructionStarted`, `ConstructionCompleted`, `ConstructionCancelled`, `EntityDeconstructed` (02 §9 "Entity planned/constructed/activated/disabled/deconstructed"). **Error codes:** none new. **Diagnostic codes:** reuses `unresolved_reference` and `reference_type_mismatch` for construction cost/return references.
- **Verification impact:** new L1 unit tests for the state machine, reservation, commit policies, cancellation, deconstruction, and phases 03/30; `checkInvariants` already covers INV-24 and continues to pass. GDD-9.1, GDD-18.1, and GDD-18.3 become traced.
- **Out of scope (later roadmap rows):** placement predicates, `placement_query`, and the `PlaceEntityPlan`, `CancelEntityPlan`, `CommitConstruction`, and `DeconstructEntity` commands (3.3 `add-placement-predicates-and-commands`); connectivity (3.4); slot and area sources (3.5); transition costs (7.3); the reference builder stage (3.6); and the client grid and placement mode (3.7, 3.8).
