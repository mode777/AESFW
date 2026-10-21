# Design — add-abstract-capacity-locations

## Context

`add-inventory-transactions` (1.7) is archived: the `inventory` component, the transaction engine, and the `location`/`locationHub` store kinds exist as empty containers. TDS §4.4 places spatial and inventory-access policies under `packages/core/src/policies/`. CONT-6.4 fixes the location-template schema and CONT-6.6 fixes default instantiation ("each location template with `activation.initial: true` is instantiated once for a single default owner"). This document records the runtime shapes and the pure instantiation contract those leave open.

## Goals / Non-Goals

**Goals:** the `SpatialPolicy` and `InventoryAccessPolicy` abstractions, the `abstract_capacity` and `shared_location` implementations, the `Location` runtime component, and pure default-world instantiation.

**Non-Goals:** grid geometry, footprints, placement validation commands (3.1–3.3), connectivity (3.4), slot/area sources (3.5), world definitions with multiple locations and connections (6.1), regions (8.1).

## Decisions

### D1 — Module layout

`packages/core/src/policies/spatial/` holds `types.ts` (`SpatialPolicy`, `CapacitySummary`, `PlacementResult`), `abstract-capacity.ts`, and `index.ts`. `packages/core/src/policies/inventory-access/` holds `types.ts` (`InventoryAccessPolicy`), `shared-location.ts`, and `index.ts`. `packages/core/src/sim/location.ts` holds the `Location` and `LocationHub` component types and helpers. `packages/core/src/sim/instantiate.ts` holds the `WorldPlan` types and `instantiateWorld`. `packages/content/src/world/plan.ts` holds `defaultWorldPlan`.

### D2 — Spatial policy semantics

```ts
interface CapacitySummary { total: Int; used: Int; free: Int }
type PlacementResult = { ok: true } | { ok: false; code: 'unknown_location' | 'location_inactive' | 'insufficient_capacity' };
interface SpatialPolicy {
  readonly id: string;
  capacity(world: World, location: EntityId): CapacitySummary;
  validatePlacement(world: World, location: EntityId, footprint: Int): PlacementResult;
  add(world: World, location: EntityId, footprint: Int): void;
  remove(world: World, location: EntityId, footprint: Int): void;
}
```

For `abstract_capacity`, `used` is authoritative and stored on the `Location` component; `add`/`remove` update it through the store. ARCH-11 describes `add`/`remove` as writing a spatial cache; storing occupancy on the location is the v1 interpretation for the abstract policy (the grid policy of 3.1 uses a derived occupancy cache instead). `resolveSpatialPolicy(id)` returns the policy or `null`.

### D3 — Location and hub components

```ts
type LocationProperty = { property: StringId; value: Int };
type Location = {
  template: DefinitionHandle;
  spatialPolicy: string;
  capacity: Int;
  used: Int;
  properties: readonly LocationProperty[]; // ascending property name
  region: DefinitionHandle | null;
  active: boolean;
  owner: OwnerHandle | null;
};
type LocationHub = { inventories: readonly EntityId[] }; // ascending
```

Both are plain canonical data encoded by the generic store codec.

### D4 — Shared-location access

```ts
interface InventoryAccessPolicy {
  readonly id: string;
  accessibleInventories(world: World, location: EntityId, resource: DefinitionHandle): readonly EntityId[];
}
```

`shared_location` reads the location's hub and returns the inventories whose acceptance list is empty or contains the resource, in ascending ID order. An entity without a location or hub yields an empty list. Reservations are requested through the 1.7 transaction writer; the access policy only selects inventories.

### D5 — Instantiation plan and determinism

```ts
type InventoryPlan = { capacity: InventoryCapacity; acceptance: InventoryAcceptance; policy: string };
type LocationPlan = {
  template: DefinitionHandle;
  spatialPolicy: string;
  capacity: Int;
  properties: readonly LocationProperty[];
  region: DefinitionHandle | null;
  active: boolean;
  inventories: readonly InventoryPlan[];
};
type WorldPlan = { owner: OwnerHandle; locations: readonly LocationPlan[] };
```

`instantiateWorld(world, plan)` iterates `plan.locations` in array order. For each it calls `allocateEntity`, sets the `location` component with `used: 0`, then allocates each inventory in declaration order, sets the `inventory` component (`owner: plan.owner`, `policy`, `revision: 0`), and sets the `locationHub` to the allocated inventory IDs. It ensures `plan.owner` exists in `world.owners`, appending an empty owner state when absent. IDs come only from the monotonic allocator, so instantiation is deterministic and hash-stable.

### D6 — Default world plan

`defaultWorldPlan(registry)` reads `registry.definitionsOf('location')` (already sorted by ascending ID), keeps templates whose `data.activation.initial` is `true`, and maps each to a `LocationPlan`: `spatialPolicy` from `data.spatial_policy`, `capacity` from `data.spatial_parameters.total_capacity`, `properties` from `data.properties` sorted by name, and `inventories` from `data.inventories` in declaration order. `capacity.mode: total` maps to `{ total: quantity, perResource: null }`; `per_resource` maps to `{ total: null, perResource: quantity }`. `acceptance` is `{ accepts: [] }` (accept all) because CONT-6.4 has no acceptance list yet. A missing or non-integer `total_capacity` yields `unsupported_spatial_parameter`; an unresolved template handle yields `unknown_location_template`. The result is `{ plan, diagnostics }`.

### D7 — Purity, encoding, and hashes

Policies and instantiation are pure and use no clocks, RNG, or globals. The new components are encoded by the generic store codec, so no codec change is needed. No goldens or saves exist, so nothing is **HASH-CHANGING**.

## Amendments and clarifications to 01–07

- None.

## Risks / Trade-offs

- [Occupancy stored on the location, not a cache] → recorded as the v1 interpretation in D2; the grid policy (3.1) may replace it.
- [Acceptance is always "accept all"] → CONT-6.4 has no acceptance list; a later content row adds it.
- [`defaultWorldPlan` lives in content] → content owns the template shape; core stays content-free (TDS-4.3).

## Migration Plan

Additive modules and one new content function. No state, save, protocol, or golden artifacts change. Rollback is reverting the change.

## Open Questions

None blocking.
