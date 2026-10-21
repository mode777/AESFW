# Tasks

## 1. Spatial policy (design D1, D2)

- [x] 1.1 Create `packages/core/src/policies/spatial/types.ts` with `SpatialPolicy`, `CapacitySummary`, and `PlacementResult`.
- [x] 1.2 Create `packages/core/src/policies/spatial/abstract-capacity.ts` with the `abstract_capacity` policy and `resolveSpatialPolicy`.
- [x] 1.3 Create `packages/core/src/policies/spatial/index.ts` and export from `packages/core/src/index.ts`.

## 2. Location state (design D3)

- [x] 2.1 Create `packages/core/src/sim/location.ts` with the `Location` and `LocationHub` component types and helpers.

## 3. Inventory access policy (design D1, D4)

- [x] 3.1 Create `packages/core/src/policies/inventory-access/types.ts` with `InventoryAccessPolicy`.
- [x] 3.2 Create `packages/core/src/policies/inventory-access/shared-location.ts` with the `shared_location` policy and `resolveInventoryAccessPolicy`.
- [x] 3.3 Create `packages/core/src/policies/inventory-access/index.ts` and export.

## 4. Instantiation (design D5)

- [x] 4.1 Create `packages/core/src/sim/instantiate.ts` with `WorldPlan`, `LocationPlan`, `InventoryPlan`, and `instantiateWorld`.

## 5. Default world plan (design D6)

- [x] 5.1 Create `packages/content/src/world/plan.ts` with `defaultWorldPlan`; export it from `packages/content/src/index.ts`.

## 6. Tests

- [x] 6.1 Add `packages/core/src/policies/spatial/abstract-capacity.test.ts` covering the interface-registry and capacity/placement scenarios. [GDD-6.1, ARCH-11]
- [x] 6.2 Add `packages/core/src/sim/location.test.ts` covering the location-state scenario. [GDD-6.1]
- [x] 6.3 Add `packages/core/src/policies/inventory-access/shared-location.test.ts` covering the shared-location scenarios. [ARCH-12, GDD-8.2]
- [x] 6.4 Add `packages/core/src/sim/instantiate.test.ts` covering the instantiation scenarios. [CONT-6.4, CONT-6.6, ARCH-3.1]
- [x] 6.5 Add `packages/content/src/world/plan.test.ts` covering the default-world-plan scenarios. [CONT-6.4, CONT-6.6]

## 7. Documentation and verification

- [x] 7.1 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive).
- [x] 7.2 Confirm no amendment to 01–07 is required.
- [x] 7.3 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. [GDD-6.1, ARCH-11, ARCH-12, CONT-6.4, CONT-6.6]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 1.8 with "✓ archived <date>" in `docs/08`.
