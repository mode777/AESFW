# Tasks

## 1. Command

- [x] 1.1 [GDD-8.5, TDS-16.2] Handle `SetResourcePurposeLock` in phase 01 (validation `unknown_inventory`/`unknown_resource`/`invalid_purpose`/`not_owner`, ordered set/clear on the owner's `purposeLocks`) and add `invalid_purpose` to the command error registry. Verify: `[GDD-8.5]` phase 01 unit tests for apply, idempotent set/clear, and every rejection code.

## 2. Transaction enforcement

- [x] 2.1 [GDD-8.5, TDS-12.3] Add the `purpose_locked` check to the `withdraw` and `transfer` ops. Verify: tx builder unit tests for locked reject, other-purpose success, unlock-restores-access, and `transfer` from-side rejection.

## 3. Access filtering

- [x] 3.1 [ARCH-12, TDS-16.2] Add `purpose` to `InventoryAccessPolicy.accessibleInventories`, filter locked inventories in `shared_location`, and pass `population_need` at the need-delivery call site. Verify: policy unit tests for the locked-inventory exclusion scenario and need delivery unaffected without locks.

## 4. Persistence

- [x] 4.1 [TDS-8.5, TDS-12.3] Save → load → continue test asserting lock ordering and hash equality with an uninterrupted run. Verify: `[TDS-12.3]` persistence test.

## 5. Documentation and verification

- [x] 5.1 Confirm no document amendment is required and `docs/08` needs no row change beyond archiving. Verify: no unintended document diff.
- [x] 5.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
