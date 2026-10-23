# Design

## Context

Needs are v1-flat: `NeedSpec { type: 'resource_consumption' | 'resource_availability', resource, quantityPerPopulationPerTick, … }` resolved by `@aesfw/app`'s instantiate layer into residence components; phase 08 computes `demanded`, phase 20 delivers and fills windows. The spatial policy already exposes `covers(world, provider, consumer, radius)` (3.1) and `withinRadius` euclidean semantics. The registry has a `service` definition type but no collection maps to it.

## Goals / Non-Goals

- Goals: the three remaining supplier types of GDD-12.2; content for services and providers; deterministic allocation; exclusions.
- Non-Goals: bands (7.2), transitions (7.3), client overlay (7.9), multi-location capacity pooling, congestion or routing for coverage.

## Decisions

### D1 — Service and provider content shapes

`services` collection (CONT-6.12): `{ id, mode: 'coverage' | 'capacity', default_relation?: { type: 'radius', cells: positive int } }`, mapped to the existing core `'service'` definition type, inserted in the collection catalogue after `need_categories` (handle-space position only affects new packages). Provider component (CONT-6.8): `service_provider: { mode, service, relation?, capability?, quantity_per_tick?, consumes? }` — `mode` and `service` required; a `coverage` provider may override the relation; a `capacity` provider requires `capability` (resource id) and `quantity_per_tick ≥ 1`. `consumes` is accepted as an empty list for v1 (coverage consumes no resources, GDD-3.6) and reserved.

### D2 — NeedSpec extension

`NeedType` gains `'service_capacity' | 'spatial_coverage' | 'state_query'`. `NeedSpec` gains optional `service`, `requiredDistinctProviders`, `radiusCells`, and `condition` handles. Phase 08: `service_capacity` demands like consumption (`qty × count`, consumption-factor scaled); `spatial_coverage` and `state_query` demand `1`. The windows and fulfillment math are unchanged — a boolean supplier delivers `0` or `1` against demand `1`.

### D3 — Capacity allocation (phase 20)

For each residence in ascending entity ID, per service need: pool = Σ `quantity_per_tick` of active capacity providers at the residence's location for that service (recomputed per tick, no new store); grant `min(poolRemaining, demanded)` in ascending residence order; deliver the granted amount into the window. This is `alloc-v1`'s full-grant path with sequential depletion; when total demand exceeds the pool the ascending-ID order is the documented total order (same rule as throughput phase 10).

### D4 — Coverage evaluation (phase 20)

For each `spatial_coverage` need: count active providers of the service whose `covers(world, provider, residence, radius)` holds, where radius is the provider's effective relation (component override, else service default). `required_distinct_providers` defaults to `1`. The count uses distinct provider entities. Providers at inactive locations or with `enabled: false` are skipped (06 §5.3).

### D5 — State query evaluation (phase 20)

`state_query` reuses the injected `conditionEvaluator` (design D4 of 1.6, extended by 7.1): phase 20 calls `ctx.conditionEvaluator(world, condition, residence)`; the default (`() => true`) would make every state query supplied, so the app session already injects the real evaluator — the system threads `ctx.conditionEvaluator` into `deliverNeeds`. Subject is the residence entity id; query support is the evaluator's v1 set (`location_property`). Recorded as the v1 domain; broader query support follows the evaluator, not this row.

### D6 — Instantiation and store

`serviceProvider` joins `COMPONENT_KINDS` (encoded, hashed; empty for all existing fixtures so goldens are unchanged). The app instantiate layer resolves `service_provider` components: service handle, mode, effective relation (component relation, else service `default_relation`), capability handle and quantity for capacity mode. `provider_selector: { by_tag }` is accepted and validated, and v1 matches providers by service handle only; the tag filter is recorded as accepted-but-advisory until a fixture needs it (CONT-6.11's selector refines which providers count when several services share a location).

## Clarifications recorded (no normative amendment)

- CONT-6.12 shows only the coverage example; this change fixes the capacity-provider shape as `{ mode: capacity, service, capability, quantity_per_tick }` and treats `relation` on the provider as an override of the service default (both recorded here per 05 §26 as clarifications, no normative text change).

## Risks / Open Questions

- Phase 20 gains per-residence spatial scans for coverage needs; bounded by providers-at-location and revisited in the M7 benchmark note.
