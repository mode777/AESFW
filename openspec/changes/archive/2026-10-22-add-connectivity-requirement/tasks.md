# Tasks

## 1. Connectivity types and components (design D1, D2)

- [x] 1.1 Create `packages/core/src/sim/connectivity.ts` with `ConnectivityRole`, `ConnectivityNode`, `ConnectivityGroup`, `ConnectivityCache`, and `connectivityNodeOf`.
- [x] 1.2 Add `hasConnectivityRequirement` (a requirement node on an entity).
- [x] 1.3 Type `world.caches.connectivity` as `ConnectivityCache | undefined` in `packages/core/src/world/types.ts`.
- [x] 1.4 Export the new types and helpers from `packages/core/src/index.ts`.

## 2. Cache and query (design D3, D4)

- [x] 2.1 Add `buildConnectivityCache` (root selection, ascending locations, ascending members).
- [x] 2.2 Add `ensureConnectivityCache` and `rebuildConnectivityCaches`.
- [x] 2.3 Add `isConnected` and `connectedEntities`.
- [x] 2.4 Extend `phase04RebuildSpatialCaches` to rebuild the connectivity cache alongside the spatial cache.

## 3. Block reason (design D5)

- [x] 3.1 Extend `staticBlockReasons` in `packages/core/src/sim/production/preconditions.ts` to add `missing_inventory_access` when the producer requires connectivity and is not connected.

## 4. Unit tests

- [x] 4.1 Add `packages/core/src/sim/connectivity.test.ts` covering the components, the root, binary access, the cache, the query, ordering, and the inactive/hub-less cases. [GDD-9.2, GDD-9.9, GDD-10.2, ARCH-11, ARCH-5.2, TDS-8.4, INV-20]
- [x] 4.2 Add a phase-04 rebuild, hash-exclusion, and clone-dirty test for the connectivity cache. [TDS-8.4, INV-20, ARCH-5.2]
- [x] 4.3 Extend `packages/core/src/sim/production/preconditions.test.ts` with the disconnected and connected connectivity cases. [GDD-10.2, GDD-10.3]
- [x] 4.4 Add an INV-20 property test comparing a full connectivity rebuild with a prior build. [INV-20, TDS-8.4]

## 5. Invariants

- [x] 5.1 Add a connectivity-cache INV-20 check to `packages/testkit/src/harness/invariants.ts` (a clean cache equals a full rebuild). [INV-20, TDS-8.4]

## 6. Documentation and verification

- [x] 6.1 Apply amendment A-01 to `docs/02_Simulation_Architecture.md` §3.4 (clarify `ConnectionNode`).
- [x] 6.2 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive).
- [x] 6.3 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. [GDD-9.2, GDD-9.9, GDD-10.2, ARCH-5.2, ARCH-11, TDS-8.4, INV-20]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 3.4 with "✓ archived <date>" in `docs/08`.
