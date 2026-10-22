# Proposal

## Why

Roadmap 08, M3 item 3.5 (`add-slot-and-area-sources`, capability `sim/production`, size M). M3 is the space-and-construction milestone and retires R-09 (spatial and placement complexity). Row 1.10 can advance an infinite or finite resource source, row 3.1 gives a location grid geometry, and row 3.4 gives binary inventory access, but every source still produces unconditionally from an unbounded well. GDD-9.5 defines six source policies, of which only `infinite_rate` and `finite_deposit` exist: **slot-dependent extraction** binds exactly one extractor to one matching source slot of a location (scarcity is the slot count, not depletion), **area-dependent extraction** requires an exclusive working area and scales its output linearly and deterministically by a referenced location property value (GDD-6.5), and **regenerating** and **condition-dependent** deposits complete the set. GDD-9.5 makes a slot's operating life unlimited; CONT-6.4 puts a finite `source_slots` count per type on the location template; CONT-6.8 puts `placement.working_area`, `placement.requires_slot`, and `resource_source.scale_by_property` on the entity definition; ARCH-3.4 names the `SourceSlotBinding` and `WorkingAreaClaim` components; ARCH-5.2 makes phase 07 evaluate resource sources (slot binding, working area, property scaling, conditions). Without these the "space" currency of GDD-2 has no teeth for extraction and no later row (the reference builder stage 3.6, the client suitability overlay 3.7, regions 8.1) can use slots or suitability. Depends on: `add-grid-spatial-policy` (3.1) — archived 2026-10-22; `add-production-processes` (1.10) — archived 2026-10-21.

## What Changes

- Extend the resource-source policy union from `infinite_rate` / `finite_deposit` to six: add `regenerating_deposit`, `slot_dependent`, `area_dependent`, and `condition_dependent` (GDD-9.5).
- Add a finite count of source slots per type to a location (`Location.sourceSlots`, from the template's `source_slots`), ordered ascending by type (CONT-6.4).
- Add slot-dependent extraction: phase 07 binds exactly one extractor to one matching slot of a location, in ascending entity-ID order, persisting a `SourceSlotBinding` on the existing `sourceSlotBinding` store kind. A source that finds no free slot is blocked with `no_source_slot`; the slot's operating life is unlimited (GDD-9.5).
- Add area-dependent extraction: an area-dependent source carries a configured working area (cells and `exclusive`); phase 07 assigns a `WorkingAreaClaim` on the existing `workingArea` store kind when the location has enough free cells, in ascending entity-ID order. A source that finds no area is blocked with `no_working_area`. Its output per tick is `floor(rate × propertyValue / 1000)`, where `propertyValue` is the referenced location property in permille (`0` when absent) — linear and deterministic (GDD-6.5, GDD-9.5).
- Add regenerating deposits: a finite output that deposits `min(rate, remaining)` and then replenishes `remaining` by its regeneration rate, capped at its maximum.
- Add condition-dependent generation: a source that generates only while its referenced condition holds, otherwise blocked with `condition_false`.
- Make phase 07 evaluate resource sources in ascending entity ID and set a source's `state` (`extracting`/`blocked`) and `blockReasons`, including `entity_disabled`, `paused_by_deficit`, `location_inactive`, `missing_inventory_access`, `condition_false`, `no_source_slot`, and `no_working_area`; a blocked source SHALL NOT extract. Phase 12 advances only non-blocked sources and applies the area property scaling.
- Extend the content schemas: `source_slots` on the location template; `scale_by_property` and `condition` on `resource_source`; `working_area` and `requires_slot` on `placement`; `depletion`, `regeneration_per_tick`, and `maximum_quantity` on `resource_source`.
- No new store kind, no new runtime dependency in `@aesfw/core`. Existing `infinite_rate` / `finite_deposit` sources keep their exact encoded shape, so no existing content, fixture, or golden hash changes: **no HASH-CHANGING artifact**.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `sim/production`: adds the four new source policies, location source slots, slot binding, working-area claims, location-property scaling, regenerating deposits, condition-dependent generation, and the phase-07 source preconditions with their block reasons.

## Impact

- **Packages:** `@aesfw/core` extends `src/sim/production/types.ts`, `sources.ts`, `preconditions.ts`, `advance.ts`, and `index.ts`; `src/sim/location.ts` gains `SourceSlot` and `Location.sourceSlots`; `src/systems/phase-07-evaluate-preconditions.ts` evaluates sources and passes the condition evaluator; `src/index.ts` exports the new surface. `@aesfw/content` extends `src/schemas/location.ts` and `src/schemas/entity.ts`, `src/world/plan.ts`, and `src/registry/references.ts`. `@aesfw/app` extends `src/content/instantiate.ts`. No new runtime dependency is added to any pure package.
- **Tick phases:** phase 07 `evaluatePreconditions` reads `resourceSource`, `location`, `sourceSlotBinding`, `workingArea`, `connectivityNode`, `enabled`, `owners`, and the location component; it writes `resourceSource`, `sourceSlotBinding`, `workingArea`, and the ledger. Phase 12 `advanceProcesses` reads `resourceSource` and `location` and writes `resourceSource`. **Store kinds:** `sourceSlotBinding` and `workingArea` (already in the TDS-8.3 catalogue) become used. **Derived caches:** none new.
- **Commands/events:** none. **Error/diagnostic codes:** none new; the block reasons `no_source_slot` and `no_working_area` are added to the machine-readable `BlockReason` union (GDD-10.3).
- **Verification impact:** new L1 unit tests for each policy, the slot competition, the working-area competition, the property scaling, the source block reasons, and the paused/disabled/inactive exclusion; integration tests call `checkInvariants` after every tick.
- **Out of scope (later roadmap rows):** throughput throttling and `throughput_throttled` (5.1 `add-throughput-allocation`); productivity modifiers (12.4 `add-productivity-modifiers`); connectivity (3.4, already done); reference builder content and the reference extractors (3.6 `add-reference-content-builder-stage`); client grid and placement (3.7 `add-client-location-grid`, 3.8 `add-client-placement-mode`); regions, distribution rules, and seeded property/slot vectors (8.1 `add-regions-and-distribution-rules`); source capability gating (owned by `add-capability-allocation` and later).
