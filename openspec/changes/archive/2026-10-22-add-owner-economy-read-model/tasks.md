# Tasks

## 1. Protocol

- [x] 1.1 [PIC-10.6, PIC-9.2, PIC-3] Extend `OwnerBalanceDto` with optional `revenue_by_source`, `expenses_by_source`, `idle_paying_entities`; extend `SnapshotDeltaDto` with optional `owner_updates`; extend the delta codec (decode `owner_updates`, absent-tolerant, malformed rejected). Verify: protocol codec unit tests (three scenarios).

## 2. App projections

- [x] 2.1 [PIC-9.1, PIC-10.6] Populate `ownerDto.balance`: per-tick revenue/expenses/net, by-source maps, idle-paying entities, deficit-paused entities in pause order. Verify: projection unit tests (five scenarios).
- [x] 2.2 [PIC-9.2] Emit `owner_updates` in `diffProjection` for changed owners. Verify: diff unit tests (two scenarios).

## 3. Verification

- [x] 3.1 Run `pnpm trace` (PIC-10.6 lands) and `pnpm verify`; all green, no golden change.
