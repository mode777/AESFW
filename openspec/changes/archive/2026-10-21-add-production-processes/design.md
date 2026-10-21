# Design — add-production-processes

## Context

`add-capability-allocation` (1.9) is archived: phases 05–06 publish `capabilityAllocation`, and 1.7's transaction writer is available through `TickContext.tx`. TDS-11.1 assigns preconditions to phase 07, reservation to 11, advancement to 12, and completion to 13; GDD-10.2 fixes the all-or-nothing state machine; GDD-9.5 fixes the source policies. This document records the component shapes, the state machine, and the phase wiring.

## Goals / Non-Goals

**Goals:** the `resourceSource` and `producer` components, the four phases, infinite and finite sources, batch and continuous producers, machine-readable block reasons, INV-15 and INV-22.

**Non-Goals:** throughput throttling and phases 09–10 (5.1), slot/area sources (3.5), productivity modifiers (12.4), regenerating and condition-dependent sources (3.5), recipe-condition evaluation, construction (3.2–3.3).

## Decisions

### D1 — Module layout

`packages/core/src/sim/production/` holds `types.ts`, `sources.ts`, `preconditions.ts`, `reserve.ts`, `advance.ts`, `commit.ts`, and `index.ts`. The phase modules `phase-07`, `phase-11`, `phase-12`, and `phase-13` call into it.

### D2 — Components

```ts
type ItemAmount = { resource: DefinitionHandle; quantity: Int };
type RecipeSpec = {
  recipe: DefinitionHandle;
  mode: 'batch' | 'continuous';
  duration: Int;
  inputs: readonly ItemAmount[];
  outputs: readonly ItemAmount[];
  capabilities: readonly ItemAmount[];
  condition: DefinitionHandle | null;
};
type BlockReason = 'entity_disabled' | 'paused_by_deficit' | 'invalid_recipe' | 'condition_false'
  | 'missing_input' | 'missing_capability' | 'missing_inventory_access'
  | 'missing_output_capacity' | 'throughput_throttled' | 'location_inactive';
type Producer = {
  recipes: readonly RecipeSpec[];
  recipe: DefinitionHandle | null;
  processSlots: number;
  inputInventory: EntityId | null;
  outputInventory: EntityId | null;
  state: 'idle' | 'processing' | 'blocked';
  blockReasons: readonly BlockReason[];
  progress: Int;
  inputReservations: readonly ReservationId[];
  capacityReservations: readonly ReservationId[];
};
type ResourceSource = {
  policy: 'infinite_rate' | 'finite_deposit';
  outputs: readonly { resource: DefinitionHandle; rate: Int; remaining: Int | null }[];
  inventory: EntityId | null;
};
```

The recipe specification is **resolved content data** stored on the component, so the core systems stay content-free (TDS-4.3). The content-to-component resolution happens in the scenario/testkit layer.

### D3 — Phase 07 preconditions

Phase 07 iterates producers in ascending entity ID and rebuilds the static reasons: `entity_disabled` (an `enabled` component present and false), `paused_by_deficit` (an owner deficit-pause listing the entity), `invalid_recipe` (selected recipe absent from `recipes`), `condition_false` (the recipe has a non-null condition — a registered not-supported stub until the domain-query rows), `missing_inventory_access` (input or output inventory missing), and `location_inactive`. If any static reason exists, the state becomes `blocked`; otherwise a `blocked` producer becomes `idle`. A `processing` producer keeps processing unless a static reason appears, in which case its reservations are released and it becomes `blocked`.

### D4 — Phase 11 start

Phase 11 iterates idle producers in ascending entity ID. It computes the process inputs and outputs: for a batch recipe the full amounts; for a continuous recipe `floor(amount / duration)` per tick with the remainder discarded (content should use integer-divisible rates). It reads the producer's `capabilityAllocation` and blocks `missing_capability` when the grant is below the recipe requirement. It then calls `ctx.tx.atomic` to reserve every input (purpose `production_input`) and reserve output capacity for every output; on failure it blocks `missing_input` (input reservation) or `missing_output_capacity` (capacity reservation). On success it sets `processing`, clears the reasons, resets progress, and stores the reservation IDs. The reservation is all-or-nothing, so a partial start cannot occur.

### D5 — Phase 12 advancement

Phase 12 increments the progress of every `processing` producer by one. For each source it computes the pending output — `rate` for infinite, `min(rate, remaining)` for finite — stores it in scratch under `productionPendingOutput`, and reduces a finite source's `remaining`.

### D6 — Phase 13 completion

Phase 13 deposits each source's pending output, then, for every `processing` producer whose progress is at least its effective duration (the recipe duration for batch, `1` for continuous), calls `ctx.tx.atomic` to commit every input reservation, deposit every output, and release every capacity reservation. On success it sets the producer to `idle` with progress `0` and no reservations. The commit is one atomic composite, so INV-15 holds by construction.

### D7 — Determinism, INV-22, and purity

All iteration is ascending entity ID; arithmetic uses `fx`. No RNG. `checkInvariants` gains INV-22: a producer whose `blockReasons` is non-empty must not be `processing`, and a `processing` producer's reasons must be empty or `['throughput_throttled']`.

## Amendments and clarifications to 01–07

- None. Recipe-condition evaluation is a registered not-supported stub (`condition_false`) documented in the proposal's out-of-scope list; the domain-query rows own it.

## Risks / Trade-offs

- [Continuous floor division loses remainders] → content should use integer-divisible rates (GDD-10.4); accumulators are 1.11's population outputs.
- [Resolved recipe data duplicated on components] → keeps core content-free; the scenario layer resolves it.
- [Condition evaluation stubbed] → M1 content uses no recipe conditions; a later row implements the domain queries.

## Migration Plan

Additive modules and four implemented phase systems plus a schema extension. No goldens or saves exist. Rollback is reverting the change.

## Open Questions

None blocking.
