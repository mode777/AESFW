# Design — add-slot-and-area-sources

## Context

`add-production-processes` (1.10), `add-grid-spatial-policy` (3.1), and `add-connectivity-requirement` (3.4) are archived. The `resourceSource`, `sourceSlotBinding`, and `workingArea` store kinds exist in the TDS-8.3 catalogue; the first is used with two policies (`infinite_rate`, `finite_deposit`), the other two are unused. Phase 07 rebuilds producer block reasons only; phase 12 advances sources unconditionally. GDD-9.5 defines six source policies; GDD-6.5 defines the location property vector and linear area scaling; CONT-6.4 puts a finite `source_slots` count on the location template; CONT-6.8 puts `placement.working_area`, `placement.requires_slot`, and `resource_source.scale_by_property` on the entity definition; ARCH-3.4 names `SourceSlotBinding` and `WorkingAreaClaim`; ARCH-5.2 makes phase 07 evaluate resource sources. This document records the source semantics, the component shapes, the competition order, and the hash contract that 3.5 fixes.

## Goals / Non-Goals

**Goals:** the four new source policies, location source slots, one-extractor-per-slot binding, exclusive working-area claims, linear property scaling, regenerating deposits, condition-dependent generation, and the phase-07 source preconditions and block reasons.

**Non-Goals:** throughput throttling and `throughput_throttled` (5.1), productivity modifiers (12.4), connectivity (3.4), the reference builder content and extractors (3.6), the client grid and placement (3.7/3.8), regions and distribution rules (8.1), and source capability gating (later capability rows).

## Decisions

### D1 — Module layout

- `packages/core/src/sim/production/types.ts`: the extended `SourcePolicy` union, `SourceState` is not introduced (a source is blocked iff it carries block reasons), the extended `SourceOutput`, the extended `ResourceSource`, `SourceSlotBinding`, `WorkingAreaClaim`, the new `BlockReason` values, and a `SourceConditionEvaluator` type.
- `packages/core/src/sim/location.ts`: `SourceSlot` and the optional `Location.sourceSlots`.
- `packages/core/src/sim/production/sources.ts`: `advanceSource(source, scalePermille)` extended for regenerating deposits and scaling.
- `packages/core/src/sim/production/preconditions.ts`: `evaluateSourcePreconditions(world, tx, evaluateCondition)` and the slot/area competition.
- `packages/core/src/sim/production/advance.ts`: skip blocked sources and resolve the property scale.
- `packages/core/src/systems/phase-07-evaluate-preconditions.ts`: pass `ctx.conditionEvaluator`, evaluate sources, extend reads/writes.
- `packages/core/src/index.ts`: export the new surface.
- `packages/content/src/schemas/location.ts`, `packages/content/src/schemas/entity.ts`, `packages/content/src/world/plan.ts`, `packages/content/src/registry/references.ts`, `packages/core/src/sim/instantiate.ts`, `packages/app/src/content/instantiate.ts`: content and instantiation wiring.

### D2 — Source policies and component shape

```ts
type SourcePolicy =
  | 'infinite_rate' | 'finite_deposit' | 'regenerating_deposit'
  | 'slot_dependent' | 'area_dependent' | 'condition_dependent';

type SourceOutput = {
  readonly resource: DefinitionHandle;
  readonly rate: Int;
  readonly remaining: Int | null;
  readonly regeneration?: Int;   // regenerating_deposit only
  readonly maximum?: Int;        // regenerating_deposit only
};

type ResourceSource = {
  readonly policy: SourcePolicy;
  readonly location: EntityId | null;
  readonly inventory: EntityId | null;
  readonly outputs: readonly SourceOutput[];
  readonly scaleByProperty?: StringId;      // area_dependent
  readonly slotType?: StringId;             // slot_dependent
  readonly workingAreaCells?: Int;          // area_dependent
  readonly workingAreaExclusive?: boolean;  // area_dependent
  readonly condition?: DefinitionHandle;    // condition_dependent
  readonly blockReasons?: readonly BlockReason[]; // present only when non-empty
};
```

Every new field is optional and is written only when the source needs it, so an `infinite_rate` or `finite_deposit` source keeps its exact encoded shape. In particular `blockReasons` is present only when non-empty: a source is blocked iff it carries at least one block reason, so there is no separate `state` field and a clean source is encoded exactly as before. This is the deliberate mechanism that keeps every existing content, fixture, and golden hash stable (D12). `slotType` and `workingAreaCells`/`workingAreaExclusive` are resolved at instantiation from `placement.requires_slot` and `placement.working_area` (CONT-6.8) and stored on the source so phase 07 stays self-contained; `scaleByProperty` is the property name.

### D3 — Location source slots

```ts
type SourceSlot = { readonly type: StringId; readonly count: Int };
// Location gains: readonly sourceSlots?: readonly SourceSlot[]; // ascending by type
```

The field is optional and absent on a location whose template declares no `source_slots`, so existing locations encode unchanged. `instantiateWorld` copies the plan's slots onto the location; `defaultWorldPlan` maps the template's `source_slots` list, sorted ascending by type. A count of `0` is a valid, present slot type that yields no slot.

### D4 — Slot-dependent extraction binding

One store kind, `sourceSlotBinding` (TDS-8.3), carries one binding per bound source:

```ts
type SourceSlotBinding = { readonly slotType: StringId; readonly location: EntityId };
```

Phase 07 iterates sources in ascending entity ID and, for each location and slot type, tracks how many slots this tick's pass has already bound in a local map (never read back from the store, so a stale binding from a previous tick never inflates the count). A slot-dependent source with no other block reason binds the next free slot of its required type when one remains; otherwise it is blocked with `no_source_slot`. A source that is blocked for any reason has its binding removed. Because the same sources re-bind the same slots every tick, the encoded component is byte-identical across ticks. A slot has unlimited operating life; only the count is scarce.

Ordering: sources ascending entity ID; slots of one type are interchangeable, so "first by ascending ID" is the total order. No division or rounding is involved.

### D5 — Working-area claims

One store kind, `workingArea` (TDS-8.3), carries one claim per area-dependent source:

```ts
type WorkingAreaClaim = { readonly location: EntityId; readonly cells: Int; readonly exclusive: boolean };
```

ARCH-3.4 names `WorkingArea` (spatial) and `WorkingAreaClaim` (production); TDS-8.3 defines one `workingArea` store kind, so they are reconciled as one component that carries the claim (A-01).

Availability is count-based and uses the authoritative `Location.capacity` and `Location.used`: free working cells of a location are `capacity − used − sum(cells of claims assigned this tick)`. A working area is additional to the footprint, so it does not touch `Location.used`; the `WorkingAreaClaim` components are the authority. Phase 07 iterates sources ascending entity ID, tracks claimed cells per location in a local map, and assigns a claim when `cells ≤ free`; otherwise the source is blocked with `no_working_area`. A blocked source has its claim removed. An area-dependent source that names no working area is blocked with `no_working_area`. `exclusive` defaults to `true` and is recorded; the count model reserves each claimed cell exclusively, so two claims never overlap.

Ordering and rounding: sources ascending entity ID; `cells`, `capacity`, and `used` are integers and the comparison is exact, so no rounding occurs.

### D6 — Location-property scaling

An area-dependent source names a location property (`scaleByProperty`). Phase 12 resolves the property value in permille from the location's `properties` (ascending by name; `0` when absent) and computes each output amount as `mulDiv(rate, value, 1000, 'floor')`. `0` permille yields `0`; `1000` permille yields the full rate. The arithmetic is integer and deterministic (GDD-6.5, GDD-9.5).

### D7 — Regenerating deposits

A `regenerating_deposit` output deposits `min(rate, remaining)`, reduces `remaining` by the deposit, then sets `remaining = min(maximum, remaining + regeneration)`. Regeneration happens after the deposit so the replenished amount is available on the next tick. All values are safe integers; `remaining` never drops below `0` or rises above `maximum`.

### D8 — Condition-dependent generation

A `condition_dependent` source carries a `condition` definition handle. Phase 07 evaluates it with the tick's condition evaluator (`ctx.conditionEvaluator`, the same structural `(world, condition, subject) => boolean` contract as placement conditions; the subject is the source entity) and blocks the source with `condition_false` when it is false. Phase 12 therefore never advances it while blocked. No condition evaluation is duplicated in phase 12.

### D9 — Phase 07 source preconditions

`evaluateSourcePreconditions` iterates the `resourceSource` store in ascending entity ID and rebuilds each source's block reasons in a fixed order: `entity_disabled`, `paused_by_deficit`, `location_inactive`, `missing_inventory_access`, `condition_false`, then the policy-specific `no_source_slot` or `no_working_area`. The disabled, deficit, inactive, and inventory-access cases reuse the producer helpers (`isDisabled`, `isDeficitPaused`, `isInactive`, `hasConnectivityRequirement`/`isConnected`). When the reasons are non-empty the source is written with `blockReasons`; when they are empty the `blockReasons` field is omitted and any `sourceSlotBinding`/`workingArea` claim for an ineligible source is removed. The phase reads `resourceSource`, `location`, `sourceSlotBinding`, `workingArea`, `connectivityNode`, `enabled`, and `owners`, and writes `resourceSource`, `sourceSlotBinding`, `workingArea`, and the ledger (the ledger write is retained for the producer path).

### D10 — Phase 12 gating and scaling

`advanceProcesses` skips a source that carries block reasons. For every other source it resolves `scalePermille` (the referenced property value for an `area_dependent` source, else `1000`) and calls `advanceSource(source, scalePermille)`, which applies the policy's deposit, depletion, and regeneration rules. The phase reads `resourceSource` and `location` and writes `resourceSource`.

### D11 — Content schema and instantiation

- `LocationTemplateSchema` gains `source_slots?: { type, count }[]`.
- `ResourceSourceSchema` gains the four new policy literals, `depletion`, `regeneration_per_tick`, `maximum_quantity`, `scale_by_property`, and `condition`.
- `PlacementSchema` gains `working_area?: { cells, exclusive }` and `requires_slot?: Id`.
- `defaultWorldPlan` maps `source_slots` to `LocationPlan.sourceSlots` (ascending by type).
- `instantiateWorld` copies `sourceSlots` onto the location.
- `instantiateContentEntities` (`@aesfw/app`) resolves the new source fields: policy, `remaining` (null for the non-depleting policies), `regeneration`/`maximum` for regenerating outputs, `scaleByProperty`, `condition`, and `slotType`/`workingAreaCells`/`workingAreaExclusive` from the definition's `placement`.
- `resolveReferences` validates the `resource_source.condition` reference and the new `resource_source` output resources; `scale_by_property`, slot types, and working areas are names, not definition references, and are not resolved.

### D12 — Purity, encoding, and hashes

All new modules are pure: no clock, RNG, global, floating point, async code, or module-level mutable state. Slot and area competition use local maps over ascending entity IDs. New components are plain canonical data encoded by the generic store codec; no codec change is needed. Every new `ResourceSource` and `Location` field is optional and absent for existing content, and the two new store kinds (`sourceSlotBinding`, `workingArea`) already exist in the TDS-8.3 catalogue, so `encodeStores` gains no key. The demo and reference sources are all `infinite_rate` with no gating, so they carry no `blockReasons` and no binding: **no golden hash changes**. No versioned algorithm tag is bumped.

## Amendments and clarifications to 01–07

- **A-01 (clarification, 02 §3.4 Production):** append to the Production component list note: "`SourceSlotBinding` is carried by the `sourceSlotBinding` store kind (TDS-8.3) and names the bound slot type and location; `WorkingAreaClaim` is carried by the `workingArea` store kind (TDS-8.3) and names the claimed location, cell count, and exclusivity. A slot-dependent source binds exactly one slot; an area-dependent source claims one exclusive working area." This reconciles the two components named in GDD-9.5 and ARCH-3.4 with the single store kinds of TDS-8.3.
- No other clarification or conflict was found.

## Risks / Trade-offs

- [Source block reasons are stored only when non-empty] → this is what preserves every existing source hash; a consumer must read "no `blockReasons` field" as "not blocked", the same way a missing optional field is read elsewhere. Recorded in D2 and D12.
- [Working area is count-based, not a shape grammar] → `cells` competes for the location's free cells and claims never overlap, which matches "exclusive working area available" (GDD-18.2) and the reference "3×3 + 12 working cells" (GDD-B.3) without inventing geometry. A later row that needs a real outline can refine it.
- [Area scaling uses the property value directly as permille] → GDD-6.5 gives suitability as 0/50/100%, so permille is the natural unit; a missing property is `0` output.
- [Source capability gating is deferred] → ARCH-5.2 names capability allocation for sources, but source capability consumers are not modelled in this row; producers already gate on capabilities, and a later capability row owns source gating.

## Migration Plan

Additive optional fields, two unused store kinds become used, phase 07 and 12 gain source handling, and the content schemas gain optional fields. No save-format, protocol, or golden artifact changes. Rollback reverts the change; older code ignores the optional fields and the new store data.

## Open Questions

None blocking.
