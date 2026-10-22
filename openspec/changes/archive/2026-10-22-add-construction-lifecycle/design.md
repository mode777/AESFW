# Design — add-construction-lifecycle

## Context

`add-grid-spatial-policy` (3.1) and `add-inventory-transactions` (1.7) are archived. The `lifecycle`, `constructionPlan`, `constructionProgress`, and `placement` store kinds exist in the TDS-8.3 catalogue but are empty. Phase 03 (`resolveLifecycleAndConstruction`) and phase 30 (`finalizeLifecycle`) are registered no-ops. `releaseExpiredReservations` (TDS-12.3) exists and is not yet wired. The reservation ledger, the atomic builder, and the grid placement primitives exist. This document records the lifecycle semantics, the runtime shapes, and the phase-03/phase-30 contract that 3.2 fixes.

## Goals / Non-Goals

**Goals:** the generic GDD-9.1 lifecycle state machine, construction plans and progress, atomic cost reservation, the `start`/`continuous`/`completion` commit policies, cancellation, deconstruction policies, and the phase-03/phase-30 finalization of lifecycle and expired reservations.

**Non-Goals:** placement predicates, `placement_query`, and the `PlaceEntityPlan`, `CancelEntityPlan`, `CommitConstruction`, and `DeconstructEntity` commands (3.3); connectivity (3.4); slot and area sources (3.5); transition costs (7.3); reference builder content (3.6); the client grid and placement mode (3.7, 3.8).

## Decisions

### D1 — Module layout

- `packages/core/src/sim/construction/types.ts`: `LifecycleState`, `CommitPolicy`, `ConstructionCost`, `ConstructionPlan`, `ConstructionProgress`, `DeconstructPolicy`, and the store value shapes.
- `packages/core/src/sim/construction/lifecycle.ts`: state accessors, the transition relation, and the operational-state reconciliation.
- `packages/core/src/sim/construction/plan.ts`: plan/progress accessors and the `createConstructionPlan` seam.
- `packages/core/src/sim/construction/reserve.ts`: `reserveConstructionCosts` (atomic, all-or-nothing).
- `packages/core/src/sim/construction/start.ts`: `resolveConstruction` (phase 03).
- `packages/core/src/sim/construction/finalize.ts`: `finalizeLifecycle` (phase 30), `removeEntity`, `compactStores`.
- `packages/core/src/sim/construction/seams.ts`: `requestCancellation` and `requestDeconstruction` for the 3.3 commands.
- `packages/core/src/systems/phase-03-resolve-lifecycle-and-construction.ts` and `phase-30-finalize-lifecycle.ts`: call the two entry points.

### D2 — Lifecycle states and the transition relation

```ts
type LifecycleState =
  | 'planned' | 'awaiting_resources' | 'constructing'
  | 'active' | 'disabled' | 'blocked'
  | 'deconstructed' | 'cancelled';

type Lifecycle = { readonly lifecycle: LifecycleState };
```

The value is stored in the existing `lifecycle` component and read through `WorldReader.lifecycle` (whose shape `{ lifecycle?: string }` already matches). The transition relation of the spec is a total, static table (`LIFECYCLE_TRANSITIONS`) used by `canTransition`; it is the single source for the "only these transitions occur" requirement.

`disabled` and `blocked` are operational states reconciled in phase 03 from the authoritative `enabled` component and the producer's block state, not separate flags. Reconciliation runs first in phase 03, in ascending entity ID, and only for entities that already carry a `lifecycle` component, so it never adds a lifecycle to an entity that had none and never disturbs existing worlds. It reads the producer state as of the previous tick (phase 07 runs later), a one-tick lag recorded here.

### D3 — Construction plan and progress shapes

```ts
type CommitPolicy = 'start' | 'continuous' | 'completion';
type ConstructionCost = { readonly resource: DefinitionHandle; readonly quantity: Int };
type DeconstructPolicy = {
  readonly duration: Int;
  readonly returns: readonly ConstructionCost[];
  readonly cancelReservations: boolean;
};
type ConstructionPlan = {
  readonly duration: Int;
  readonly costs: readonly ConstructionCost[];
  readonly commitPolicy: CommitPolicy;
  readonly inventory: EntityId | null;
  readonly deconstruct: DeconstructPolicy | null;
};
type ConstructionProgress = {
  readonly progress: Int;
  readonly startedTick: Tick | null;
  readonly reservations: readonly ReservationId[];
  readonly committed: readonly Int[];   // parallel to plan.costs
  readonly deconstructAt: Tick | null;
};
```

`constructionPlan` is the resolved, static definition data; `constructionProgress` is the mutable state. `reservations` is parallel to `costs` in ascending reservation-ID order (the atomic builder allocates in cost order). `committed[i]` is the quantity already consumed from `costs[i]`.

### D4 — Phase 03: start, advance, commit, activate

Phase 03 processes the `constructionPlan` store in ascending entity ID:

1. Reconcile `active`/`disabled`/`blocked` for entities that already have a lifecycle.
2. For `planned` and `awaiting_resources`: call `reserveConstructionCosts`. On failure set `awaiting_resources` and continue. On success:
   - For `start`, commit every reservation immediately.
   - Set lifecycle `constructing`, `progress` 0, `startedTick` = the computed tick, record `reservations` and `committed`.
   - Emit `ConstructionStarted`.
   - Fall through to step 3, so the run that starts construction also counts as its first construction tick.
3. For a `constructing` entity (including one started in step 2): `elapsed = progress + 1`. For `continuous` and `duration > 0`, commit the per-line delta `floor(cost × elapsed / duration) − committed[i]` from `reservations[i]`. If `elapsed >= duration`, complete (D5); otherwise store `progress = elapsed`.

A plan of duration `D` therefore activates on the `D`-th phase-03 run after it is created. Reservation uses one `tx.atomic` composite of `builder.reserve` calls with purpose `construction` and the entity as holder, so a partial reservation is impossible (ARCH-6.2, INV-15 analogue for construction). The created reservations are read back from the ledger by ID `>= firstNew` and sorted ascending, mirroring `reserveProductionIO`.

### D5 — Completion and the commit policies

Completion commits the remaining reservations under `completion`, commits the final continuous delta under `continuous`, leaves `start` as already committed, sets lifecycle `active`, clears `reservations`, sets `committed` to the full costs, and emits `ConstructionCompleted`. The `continuous` share uses `mulDiv(cost, elapsed, duration, 'floor')`; the sum of the per-tick deltas telescopes to exactly `cost` at `elapsed = duration`, so no rounding residue remains and no reservation is left outstanding. A zero-duration plan commits its whole cost at start (under `completion` and `continuous`) and activates in the same run.

### D6 — Cancellation and deconstruction

`requestCancellation` sets `cancelled` only from `planned`, `awaiting_resources`, or `constructing` and returns whether it applied; it changes no quantities. `requestDeconstruction` sets `deconstructAt = atTick + deconstruct.duration` only from `active`, `disabled`, or `blocked` when the plan declares a deconstruction policy.

Phase 30, after releasing expired reservations, scans the `lifecycle` store in ascending entity ID:

- `cancelled`: release every outstanding reservation, emit `ConstructionCancelled`, remove the entity. Committed quantities are not returned.
- `active`/`disabled`/`blocked` with `deconstructAt != null` and `tick >= deconstructAt`: deposit the policy's returns into `plan.inventory` as one `tx.atomic` composite, release outstanding reservations when `cancelReservations`, emit `EntityDeconstructed`, remove the entity.

### D7 — Phase 30: expiry, removal, compaction

Phase 30 releases reservations with a non-null expiry `<= tick` via `releaseExpiredReservations`, then removes the finalized entities by `markRemoved` on every component kind and compacts every store, so no tombstone survives the phase (INV-24). When at least one entity was removed it sets `world.caches.dirty = true`, so phase 04 rebuilds the derived spatial cache on the next tick. Because phase 30 may remove any component, its `writes` declaration is `[...COMPONENT_KINDS, 'ledger']`; its `reads` are `ledger`, `lifecycle`, `constructionPlan`, `constructionProgress`, and `inventory`.

### D8 — Content mapping (CONT-6.8)

`packages/content/src/schemas/entity.ts` gains an optional `construction` component: `duration_ticks` (integer `>= 0`), `costs` (`{ resource, quantity }` list), `commit_policy`, and an optional `deconstruction` block. `packages/content/src/registry/references.ts` resolves each cost and return `resource` against the `resource` collection. The runtime `constructionPlan` is built from this definition by the 3.3 placement command; 3.2 does not wire it into `instantiateContentEntities`.

### D9 — Purity, ordering, and hashes

All new modules are pure: no clock, RNG, global, or floating point. Quantities use `fx.mulDiv(..., 'floor')`. Every iteration is ascending entity ID (plans, lifecycles) or ascending reservation ID (cost lines). New component values are plain canonical data encoded by the generic store codec; no codec change is needed. No existing content or golden creates a `lifecycle` component, so phases 03 and 30 are no-ops on the current worlds and no hash moves — no **HASH-CHANGING** artifact.

## Amendments and clarifications to 01–07

- No amendment to 01–04 is required. 02 §3.4 already lists `ConstructionPlan`, `ConstructionProgress`, and `PlacementState`; 02 §5.2 already places construction starts in phase 03 and expired reservations in phase 30; TDS-8.3 already maps the three store kinds with primary writers 01 and 03. The one interpretation recorded here is that `disabled` and `blocked` are reconciled operational states rather than separately stored flags, consistent with the existing `enabled` component and producer block state; this is a clarification of GDD-9.1's generic diagram, not a change to it.

## Risks / Trade-offs

- [Operational states reconciled in phase 03 from the previous tick's producer block state] → a one-tick lag in `blocked`; acceptable because `blocked` is an operational label and production itself blocks in phase 07. Recorded in D2.
- [`committed` tracked per cost line] → more state in `constructionProgress`, but it makes `continuous` exact and integer-only. Recorded in D3/D5.
- [Phase 30 declares every component kind as a write] → a broad write set, but removal and compaction genuinely touch every store (TDS-11.1). Recorded in D7.
- [Content `construction` is authored but not instantiated] → 3.3 owns building the runtime plan at placement; until then the seam `createConstructionPlan` is the entry point. Recorded in D8.

## Migration Plan

Additive modules, an optional content field, and two phases becoming active. No save-format, protocol, or golden artifact changes. Rollback reverts the change; the components and content field are ignored by older code.

## Open Questions

None blocking.
