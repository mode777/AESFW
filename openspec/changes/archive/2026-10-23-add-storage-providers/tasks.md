# Tasks

## 1. Schemas and types

- [x] 1.1 [CONT-6.8] Add `storage_provider` to the entity-definition schema and regenerate the published JSON Schema. Verify: schema unit tests.
- [x] 1.2 [GDD-9.7] Add the `StorageProvider` runtime type, `effectiveInventoryCapacity`, `storageThroughputBonus`, and `applyStorageProvider` in `sim/internal-logistics`; export them from `@aesfw/core`. Verify: type-check.

## 2. Core implementation

- [x] 2.1 [GDD-8.1, GDD-9.7] Use effective capacity in `tx/builder.ts` `capacityAllows`. Verify: transaction unit tests for a deposit within and above the bonus.
- [x] 2.2 [GDD-15.1] Add active storage-provider throughput to `throughputCapacity` and phase 10. Verify: `runPhases([9,10])` capacity test.
- [x] 2.3 [GDD-9.7] Apply the provider at initial content instantiation and at `PlaceEntityPlan` (phase 01). Verify: app instantiation test and phase-01 placement test.

## 3. Projections and invariants

- [x] 3.1 [PIC-9.1] Report effective capacity in the app inventory DTO. Verify: projection unit test.
- [x] 3.2 [INV-03] Use effective capacity in `checkCapacity`. Verify: invariant unit tests for within-bonus and above-bonus inventories.

## 4. Documentation and verification

- [x] 4.1 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
