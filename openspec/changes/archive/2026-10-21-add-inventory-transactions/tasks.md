# Tasks

## 1. Types and world format (design D1, D2, D3)

- [x] 1.1 Create `packages/core/src/tx/types.ts` with `Transaction`, `Reason`, the request shapes, `AtomicBuilder`, `TransactionWriter`, and `TxError` per design D3/D7.
- [x] 1.2 Add `capacity: boolean` to `Reservation` in `world/types.ts` and encode/decode it in `world/codec.ts`; update `cloneWorld`.
- [x] 1.3 Point `pipeline/types.ts` at the `tx` types and delete the placeholder `pipeline/tx.ts`.

## 2. Inventory and ledger (design D4, D11)

- [x] 2.1 Create `packages/core/src/tx/inventory.ts` with the `Inventory` shape and pure accessors (`quantityOf`, `capacityOf`, `accepts`, `withEntries`).
- [x] 2.2 Create `packages/core/src/tx/ledger.ts` with reservation lookup, `quantityReserved`, and `capacityReserved` helpers.

## 3. Transaction writer (design D5–D8, D10, D13)

- [x] 3.1 Create `packages/core/src/tx/builder.ts` with `createTransactionWriter`, the staging builder, the simulated `TxState`, validation per design D6, apply, and journaling.
- [x] 3.2 Create `packages/core/src/tx/expire.ts` with `releaseExpiredReservations`.
- [x] 3.3 Create `packages/core/src/tx/index.ts` and export the module from `packages/core/src/index.ts` and `packages/core/src/testing.ts` as needed.

## 4. Pipeline wiring (design D9)

- [x] 4.1 Replace `createUnsupportedTransactionWriter` in `pipeline/step.ts` with `createTransactionWriter(world, journal)` and pass the journal through `TickOutput`.

## 5. Tests — inventory and ledger (design D4, D11)

- [x] 5.1 Add `packages/core/src/tx/inventory.test.ts` covering the inventory-state scenario. [GDD-8.1]
- [x] 5.2 Add `packages/core/src/tx/ledger.test.ts` covering reservation lookup and reserved sums.

## 6. Tests — transaction operations (design D5–D8)

- [x] 6.1 Add `packages/core/src/tx/builder.test.ts` with one test per spec scenario: quantity reservation and its validation, capacity reservation, release and expiry, commit and its validation, deposit, withdrawal, transfer, and account. [GDD-8.3, GDD-8.4, GDD-7.5, ARCH-12, TDS-12.1, TDS-12.3]
- [x] 6.2 Add tests for all-or-nothing composites. [ARCH-6.2, TDS-12.2, INV-15]
- [x] 6.3 Add `packages/core/src/tx/journal.test.ts` for the tick-journal scenarios. [TDS-12.4, TDS-10.1]

## 7. Pipeline tests (design D9)

- [x] 7.1 Add a test in `packages/core/src/pipeline/step.test.ts` that a system's transactions reach `TickOutput.journal` and that journaling off yields `null` with the same hash. [TDS-12.4, TDS-10.1]

## 8. Invariants (design D12)

- [x] 8.1 Extend `packages/testkit/src/harness/invariants.ts` with INV-01, INV-02, INV-03, and INV-04 per design D12.
- [x] 8.2 Add one test per new invariant scenario in `packages/testkit/src/harness/invariants.test.ts`. [VER-6, INV-01, INV-02, INV-03, INV-04]

## 9. Documentation and verification

- [x] 9.1 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive).
- [x] 9.2 Confirm no amendment to 01–07 is required.
- [x] 9.3 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. [GDD-8.1, GDD-8.2, GDD-8.3, GDD-8.4, GDD-7.5, ARCH-6, ARCH-12, TDS-12]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 1.7 with "✓ archived <date>" in `docs/08`.
