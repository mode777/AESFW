# Design — add-inventory-transactions

## Context

`add-tick-pipeline-skeleton` (0.6) is archived: `TickContext.tx` is a `TransactionWriter` whose `atomic` returns a `not_implemented` diagnostic, `TickOutput.journal` is `[]`/`null`, and the `inventory` store and `ledger` exist as empty containers. TDS-12 fixes the transaction union, the ledger rules, and the atomic-composite contract; ARCH-6 fixes atomicity and fixed-point quantities; GDD-8 fixes the inventory shape and reservation lifecycle. This document records the choices those leave open: the runtime inventory shape, the reservation `capacity` discriminator, the builder's staging and validation, the writer API, and the pipeline wiring.

## Goals / Non-Goals

**Goals:** a single deterministic path for quantity mutation with all-or-nothing composites; quantity and capacity reservations; a durable ledger; purpose-lock and acceptance enforcement; a journal; invariant coverage INV-01–04 and the atomicity underpinning INV-15.

**Non-Goals:** inventory access policies (1.8), capability allocation (1.9), production reservation/completion (1.10), need delivery (1.12), balance `allow_negative` and income (4.1), purpose-lock commands (7.4), trade (9.2), establishment (8.3), phase-30 expiry wiring (3.2).

## Decisions

### D1 — Module layout

`packages/core/src/tx/` holds `types.ts` (the `Transaction` union, `Reason`, request shapes, `AtomicBuilder`, `TransactionWriter`, `TxError`), `inventory.ts` (the `Inventory` component and pure accessors), `ledger.ts` (ledger queries and the reservation helpers), `builder.ts` (`createTransactionWriter`, staging, validation, apply), `expire.ts` (`releaseExpiredReservations`), and `index.ts`. `pipeline/types.ts` imports `AtomicBuilder`, `Transaction`, `TransactionWriter`, and `TxError` from `../tx/index.js` and re-exports them; the placeholder `pipeline/tx.ts` is deleted. `tx` never imports `pipeline`, so there is no cycle.

### D2 — Reservation discriminator

`Reservation` gains `capacity: boolean` (false = quantity reservation, true = output-capacity reservation). It is encoded as `capacity` in the canonical state and decoded with it. Quantity reservations count against stored quantity (INV-02); capacity reservations count against capacity (INV-03). This is additive: `WORLD_FORMAT_VERSION` stays `1` because no saves or goldens exist before 1.15; the encode/decode round-trip invariant (INV-18) covers the new field.

### D3 — Transaction union and `Reason`

`Transaction` is the discriminated union of TDS-12.1 verbatim (all ten variants, including `trade` and `establish`). Only `reserve`, `release`, `commit`, `deposit`, `withdraw`, `transfer`, `reserveCapacity`, and `account` have builder methods in this row; `trade` and `establish` are type-only until 9.2 and 8.3. `Reason` is a free-form stable tag string carried in `deposit`, `withdraw`, and `account`; it appears only in the journal and never in authoritative state.

### D4 — Inventory runtime shape

```ts
interface InventoryEntry { resource: DefinitionHandle; quantity: Int }
interface InventoryCapacity { total: Int | null; perResource: Int | null }
interface InventoryAcceptance { accepts: readonly DefinitionHandle[] } // empty = all
interface Inventory {
  owner: OwnerHandle;
  policy: string;                 // access-policy id, e.g. framework.inventory.shared_location
  revision: number;
  entries: readonly InventoryEntry[];      // ascending resource handle
  capacity: InventoryCapacity;
  acceptance: InventoryAcceptance;
}
```

A `null` capacity is unlimited. `entries` is kept in ascending resource-handle order so encode order is deterministic. `revision` increments on every applied change to entries, so later projections can diff.

### D5 — Staging, validation, apply

`atomic(build)` runs `build(builder)` to collect a list of staged operations, then simulates them against a mutable `TxState` seeded from the world's inventories and ledger. Each staged operation validates against the simulated state and updates it. If any operation fails, `atomic` returns `err(code)` and writes nothing. If all succeed, `atomic` writes the simulated entries and ledger back into the world component store and `world.ledger`, appends one `Transaction` per operation to the journal when enabled, and returns `ok(undefined)`. This is the all-or-nothing guarantee of ARCH-6.2 and the mechanism behind INV-15.

### D6 — Validation rules and codes

- `invalid_quantity`: quantity ≤ 0 (reserve, reserveCapacity, commit, deposit, withdraw, transfer).
- `unknown_inventory`: no `inventory` component for the entity.
- `unknown_reservation`: reservation id absent from the ledger.
- `reservation_mismatch`: `commit` on a capacity reservation.
- `quantity_exceeds_reservation`: `commit` amount above the reserved quantity.
- `insufficient_quantity`: quantity reservation would make reservations exceed stored; withdrawal or transfer would consume reserved quantity.
- `insufficient_capacity`: stored plus capacity reservations plus the new amount exceeds a non-null cap.
- `insufficient_balance`: owner account would go negative and the environment forbids it.
- `not_acceptable`: deposit or transfer-in of a resource the inventory does not accept.
- `purpose_locked`: a purpose lock matches `(inventory, resource, purpose)`.
- `unknown_owner`: owner handle not in the owners table.
- `arithmetic_overflow`: a checked `fx` operation overflows.

Codes are plain `Diagnostic`s with `severity: 'error'`; they are the `TxError` type. They are distinct from command-rejection codes (TDS-16.3), which the application layer owns in 2.2.

### D7 — Writer API

```ts
interface TransactionWriter {
  atomic(build: (builder: AtomicBuilder) => void): Result<void, TxError>;
  reserve(request: ReserveRequest): Result<Reservation, TxError>;
  reserveCapacity(request: ReserveCapacityRequest): Result<Reservation, TxError>;
  release(reservation: ReservationId): Result<void, TxError>;
}
```

`reserve` and `reserveCapacity` are single-operation atomics that return the created reservation (its ID is allocated at apply time). Composite operations that reference existing reservations use `atomic`. `AtomicBuilder` exposes `reserve`, `release`, `commit`, `deposit`, `withdraw`, `transfer`, `reserveCapacity`, and `account`; a reservation staged inside `atomic` is not referenceable within the same composite, which matches the phase 11/13 split where reservation and commit happen in different phases (and ticks).

### D8 — Journal sequence

`seq` is the zero-based index of the transaction in the tick journal. Applied transactions append in application order, so `seq` increases monotonically within the tick. When journaling is off, no transactions are recorded and `seq` is not observed; state is identical.

### D9 — Pipeline wiring and write-sets

`execute` creates `const journal = input.options.journal ? [] : null` and `const tx = createTransactionWriter(world, journal)`. Because the writer resolves `world.stores` at call time, it sees the write-set-guarded stores installed for the running system, so a system that mutates an undeclared store through a transaction still trips the write-set check. `world.ledger` and `world.owners` are not guarded by the current write-set mechanism; that limitation predates this row and is unchanged.

### D10 — Negative balances and the environment

`createTransactionWriter(world, journal, environment?)` takes an optional `TxEnvironment { allowNegative?: (resource: DefinitionHandle) => boolean }`, defaulting to "never negative". `step` constructs the writer without an environment, so in M1 accounts cannot go negative. `add-balance-resources-and-income` (4.1) supplies a content-derived environment for balance resources; the default keeps INV-01 exact until then.

### D11 — Purpose locks and acceptance

A reservation is blocked when `world.owners.owners[inventory.owner].purposeLocks` contains an entry with the same inventory, resource, and purpose (TDS-12.3, GDD-8.5). A deposit or transfer-in is blocked when `acceptance.accepts` is non-empty and does not contain the resource. Transfers also check the source's purpose lock for the transfer purpose.

### D12 — Invariant checks

`checkInvariants` gains INV-01 (every inventory entry ≥ 0), INV-02 (per inventory and resource, Σ quantity reservations ≤ stored), INV-03 (stored + Σ capacity reservations ≤ each non-null cap), and INV-04 (when `output.journal` is present, the change in total stored quantity per resource equals deposits − withdrawals − commits; transfers net to zero). INV-04 is skipped when the journal is `null`, per 06 §6. INV-15 is exercised by the all-or-nothing composite test in `kernel/transactions`; the production system that owns the concrete INV-15 scenario arrives with 1.10.

### D13 — Expiry

`releaseExpiredReservations(world, tick)` is a pure helper that removes reservations with a non-null expiry at or below `tick` and returns the number removed. It is not wired into phase 30 in this row; `add-construction-lifecycle` (3.2) wires it. Keeping it as a helper makes the ledger complete and testable now without claiming phase-30 behavior.

### D14 — Determinism

All quantities are safe integers; no rounding is introduced (validation is comparison only). Iteration over staged operations is stage order; ledger output is ascending reservation ID; inventory entries are ascending resource handle; journal order is application order. No RNG is used.

## Amendments and clarifications to 01–07

- None. The `Reservation.capacity` field and the `Reason` tag are implementation detail within TDS-12.1's union; no document text changes.

## Risks / Trade-offs

- [Staged reservations cannot be referenced in the same composite] → matches the phase 11/13 split; `reserve`/`reserveCapacity` return the reservation for later commits.
- [The write-set guard does not cover `ledger`/`owners`] → pre-existing limitation; transactions that mutate them are still deterministic and journaled. A future row can extend the guard.
- [`account` rejects negatives in M1] → intentional; 4.1 supplies the balance environment.
- [Adding `capacity` changes the canonical encoding] → no goldens or saves exist; INV-18 covers the round-trip.

## Migration Plan

Additive `tx/` module plus the `Reservation.capacity` field, encode/decode updates, pipeline wiring, and testkit invariant checks. No save or golden artifacts exist. Rollback is reverting the change; the world format version is unchanged.

## Open Questions

None blocking.
