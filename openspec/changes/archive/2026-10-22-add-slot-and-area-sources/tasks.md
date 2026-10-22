# Tasks

## 1. Types and components (design D1, D2, D3, D5)

- [x] 1.1 Extend `packages/core/src/sim/production/types.ts`: the `SourcePolicy` union, the optional `SourceOutput.regeneration`/`maximum`, the optional `ResourceSource` fields (`scaleByProperty`, `slotType`, `workingAreaCells`, `workingAreaExclusive`, `condition`, `blockReasons`), `SourceSlotBinding`, `WorkingAreaClaim`, `SourceConditionEvaluator`, and the `no_source_slot`/`no_working_area` block reasons.
- [x] 1.2 Add `SourceSlot` and the optional `Location.sourceSlots` to `packages/core/src/sim/location.ts`.
- [x] 1.3 Export the new types and helpers from `packages/core/src/sim/production/index.ts` and `packages/core/src/index.ts`.

## 2. Source policies (design D6, D7, D10)

- [x] 2.1 Extend `advanceSource(source, scalePermille)` in `packages/core/src/sim/production/sources.ts` for regenerating deposits and property scaling.
- [x] 2.2 Update `advanceProcesses` in `packages/core/src/sim/production/advance.ts` to skip blocked sources and resolve the area property scale; extend the phase-12 descriptor reads.
- [x] 2.3 Add the `sourceSlotBinding`/`workingArea` handling and `evaluateSourcePreconditions` in `packages/core/src/sim/production/preconditions.ts` (ascending entity ID; slot and area competition; block reasons).
- [x] 2.4 Update `packages/core/src/systems/phase-07-evaluate-preconditions.ts` to pass `ctx.conditionEvaluator` and evaluate sources; extend its reads and writes.

## 3. Content schema and instantiation (design D11)

- [x] 3.1 Add `source_slots` to `LocationTemplateSchema` in `packages/content/src/schemas/location.ts`.
- [x] 3.2 Extend `ResourceSourceSchema` (new policies, `depletion`, `regeneration_per_tick`, `maximum_quantity`, `scale_by_property`, `condition`) and `PlacementSchema` (`working_area`, `requires_slot`) in `packages/content/src/schemas/entity.ts`.
- [x] 3.3 Map `source_slots` to `LocationPlan.sourceSlots` in `packages/content/src/world/plan.ts` and copy them onto the location in `packages/core/src/sim/instantiate.ts`.
- [x] 3.4 Resolve the new source fields in `packages/app/src/content/instantiate.ts` (`sourceFrom` plus the definition's `placement`).
- [x] 3.5 Validate the `resource_source.condition` reference in `packages/content/src/registry/references.ts`.

## 4. Unit tests

- [x] 4.1 Extend `packages/core/src/sim/production/sources.test.ts`: regenerating deposit and maximum cap, area scaling, and blocked-source exclusion. [GDD-9.5, GDD-6.5, GDD-10.4]
- [x] 4.2 Add `packages/core/src/sim/production/slot-and-area.test.ts` covering the location source slots, the ascending-ID slot competition, the `no_source_slot` cases, the working-area claim and competition, the `no_working_area` case, and the linear property scaling. [GDD-6.5, GDD-9.5, CONT-6.4, CONT-6.8, ARCH-3.4, ARCH-5.2]
- [x] 4.3 Extend `packages/core/src/sim/production/preconditions.test.ts` with the source block reasons (`entity_disabled`, `paused_by_deficit`, `location_inactive`, `missing_inventory_access`, `condition_false`) and their order. [GDD-10.3, GDD-9.5, ARCH-5.2]
- [x] 4.4 Add a phase-07/12 integration test with `runPhases` and `checkInvariants` for a slot source, an area source, and a regenerating source over several ticks. [GDD-9.5, GDD-6.5, ARCH-5.2, INV-15]
- [x] 4.5 Add content tests for the new schemas and instantiation (a valid location with `source_slots`, a slot source, an area source, a regenerating source, a condition source; an invalid source). [CONT-6.4, CONT-6.8]
- [x] 4.6 Add an L1 test asserting an `infinite_rate`/`finite_deposit` source keeps its exact encoded shape (no golden hash change). [GDD-9.5, INV-18]

## 5. Invariants

- [x] 5.1 Add a source-consistency check to `packages/testkit/src/harness/invariants.ts`: a source with block reasons must not be advanced (no pending output) and every `SourceSlotBinding` names an existing slot type. [GDD-9.5, INV-22]

## 6. Documentation and verification

- [x] 6.1 Apply amendment A-01 to `docs/02_Simulation_Architecture.md` §3.4 (clarify `SourceSlotBinding` and `WorkingAreaClaim`).
- [x] 6.2 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive).
- [x] 6.3 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. [GDD-6.5][GDD-9.5][CONT-6.4][CONT-6.8][ARCH-3.4][ARCH-5.2]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 3.5 with "✓ archived <date>" in `docs/08`.
