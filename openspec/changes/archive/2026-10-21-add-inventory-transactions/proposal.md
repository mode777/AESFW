# Proposal

## Why

Roadmap 08, M1 item 1.7 (`add-inventory-transactions`, capability `kernel/transactions`, size L). Every authoritative quantity mutation of the simulation flows through transactions (ARCH-6, TDS-12): production completion, need delivery, logistics, and trade all reserve, commit, deposit, and transfer resources. Until this row exists, `TransactionWriter.atomic` is a `not_implemented` stub, so no economy can be built on a tested, deterministic foundation. This row retires R-04 (core economic semantics implemented wrongly) by fixing the reservation ledger, capacity rules, and atomic-composite semantics under INV-01–04 and INV-15. Depends on: `add-tick-pipeline-skeleton` (0.6) — archived 2026-10-21.

## What Changes

- Add the `inventory` component runtime shape: header (`owner`, `policy`, `revision`), entries (resource → quantity), capacity rules (`total`, `per_resource`), and acceptance rules (`accepts`).
- Add the transaction union of TDS-12.1 (`reserve`, `release`, `commit`, `deposit`, `withdraw`, `transfer`, `reserveCapacity`, `account`, `trade`, `establish`) and the `Reason` tag.
- Add the reservation ledger operations: reserve quantity, reserve output capacity, release, and partial commit, with expiry fields; a pure `releaseExpiredReservations` helper (wired into phase 30 by `add-construction-lifecycle`, 3.2).
- Replace `createUnsupportedTransactionWriter` with the real `TransactionWriter`: an `AtomicBuilder` that stages operations, validates all of them (non-negativity, capacity, reservations, purpose locks, acceptance, overflow), and applies all or none (ARCH-6.2).
- Wire the real writer into `step`/`runPhases` and populate `TickOutput.journal` from applied transactions when `options.journal` is true (TDS-12.4).
- Extend the `testkit/harness` `checkInvariants` catalogue with INV-01, INV-02, INV-03, and INV-04.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts (no goldens exist yet). The `Transaction` type narrows from `JsonValue` to the union of TDS-12.1, and `Reservation` gains a `capacity` discriminator; both are additive to the M0 world format.

## Capabilities

### New Capabilities

- `kernel/transactions`: the inventory runtime shape, the reservation ledger, the transaction union, the atomic builder, and the tick journal.

### Modified Capabilities

- `kernel/tick-pipeline`: the later-row seam requirement no longer lists `TransactionWriter.atomic` as `not_implemented`; `step`/`runPhases` construct the real writer and fill the journal.
- `testkit/harness`: `checkInvariants` additionally evaluates INV-01, INV-02, INV-03, and INV-04.

## Impact

- **Packages:** `@aesfw/core` gains `src/tx/**` (inventory, transaction, ledger, builder, journal, expired-release) and exports it from `index.ts`; `src/pipeline/types.ts` imports the transaction types; `src/pipeline/step.ts` constructs the real writer and journal; `src/world/types.ts`/`codec.ts` add the `Reservation.capacity` discriminator. `@aesfw/testkit` extends `harness/invariants.ts`. No new runtime dependency is added.
- **Tick phases:** the writer is available to every system through `TickContext.tx`; no phase is implemented in this row. Phase 30 gains the `releaseExpiredReservations` helper but stays a no-op until 3.2.
- **Store kinds:** `inventory`; `ledger` (reservations). **Commands/events:** none yet (phase 01 is 2.2). **Error codes:** `TxError` codes `unknown_inventory`, `unknown_reservation`, `reservation_mismatch`, `quantity_exceeds_reservation`, `insufficient_quantity`, `insufficient_capacity`, `insufficient_balance`, `purpose_locked`, `not_acceptable`, `negative_quantity`, `not_committable`, `unknown_owner`, `arithmetic_overflow`.
- **Out of scope:** `shared_location` and other inventory access policies (1.8); capability allocation (1.9); production reservation and completion phases 07, 11–13 (1.10); need delivery phase 20 (1.12); balance-resource `allow_negative` and owner income (4.1); purpose-lock commands (7.4); trade execution (9.2); establishment (8.3); phase-30 expiry wiring (3.2).
- **Verification impact:** `pnpm test` gains transaction unit tests and `checkInvariants` gains INV-01–04; INV-04 tests force `journal: true`.
