# Design

## Context

6.4 is the largest M6 row. It connects route planning (6.3) to inventories and cargo (6.2), and it participates in the M5 throughput pool. Quantity rules beyond the basic modes are 6.5.

## Decisions

### D1 — Orders are entities, assignments are components

`CreateTransportOrder` allocates an order entity with a `transportOrder` component. Assigned units carry `transportAssignment` (`order` or `null`), `stationCursor` (`station`, `action`, `handled`, `target`, `started`), and `route` state (`order`, `station`, path locations). This keeps every runtime object addressable and saveable through existing stores.

`stationCursor` is per unit, not per order, because two units may be at different stations of the same order.

### D2 — Phase order

- Phase 09 adds handling requests after the existing source/producer/need requests. A docked unit requests `min(remaining target, handling rate)` at its current location.
- Phase 10 allocates them with the existing `alloc-v1` pool.
- Phase 14 plans a path only when the unit is not already moving. If the unit is at the station, it records a one-location route; otherwise it calls `planRoute`.
- Phase 16 advances movement first, then stages handling for units that are docked after movement. This lets a unit arrive and begin handling in the same tick.
- Phase 19 commits staged transfers. Loading uses `withdraw` with purpose `transport_load`; unloading uses `deposit`. Cargo changes only after the transaction succeeds, so a failed deposit keeps the cargo (INV-15-like atomicity at the transfer level).

### D3 — Action targets are fixed at action start

`stationCursor.target` stores the target computed when the action starts, and `started` distinguishes a zero target from an unstarted action. Without this, `all` and `up_to_capacity` targets would shrink as cargo moves and the action would never complete.

### D4 — Failure policies

The default table is `retry` for availability and path failures, `retain` for unload failures, `skip` for exchange limits, and `return` for occupied establishment targets. `skip` advances one action; `return` resets the cursor to station 0 and clears movement; `fail` unassigns; `retain`, `wait`, and `retry` leave the cursor unchanged. `retry_interval_ticks` is stored but not yet used to delay retries; a later row can add a wait timer.

### D5 — Modes beyond route are accepted but not executed

`explore`, `establish`, and `trade` orders are accepted by the schema and commands so clients can persist them, but phase 14 skips them. Their execution belongs to 8.2, 8.3, and 9.x. `buy` and `sell` actions are parsed but handled like load/unload only when a trade phase exists; currently they are treated as load/unload without price checks.

### D6 — Quantity rules

6.4 implements `fixed`, `up_to_capacity`, and `all` because the handling loop needs a target. The remaining modes return zero until 6.5. This is recorded as an explicit deferral, not a silent narrowing.

## Phases and stores

- Phase 01: writes `transportOrder`, `transportAssignment`, `stationCursor`, `route`, `movement`, `cargo`, `inventory`, `handling`.
- Phase 09: reads `movement`, `transportAssignment`, `transportOrder`, `stationCursor`, `cargo`, `inventory`, `handling`.
- Phase 14: reads/writes `movement`, `route`, `stationCursor`, `transportAssignment`.
- Phase 16: reads/writes `movement`, `stationCursor`, `route`, `transportAssignment`; reads `throughputAllocation`.
- Phase 19: writes `cargo`, `inventory`, `ledger`.

## Ordering and rounding

Units are processed in ascending entity ID. Actions run in station order and action order. Handling uses `floor(rate × throttle_permille / 1000)`. Transfers are integer quantities.

## Amendments

No amendment to 01–04 is required. The `retain` policy is taken from CONT-9 even though GDD-15.7 lists only skip/wait/retry/return/fail.

## Risks

- A path is not replanned while a unit is moving; a connection disabled mid-leg is handled by the next phase 14 after arrival. 6.4's `path_unavailable` policy applies only when no leg is active.
- Handling throughput and production throughput share one pool, which is the M5 intent but means a busy producer can throttle a docked unit. SCN-02 in 6.7 exercises a quiet location.
- `retry_interval_ticks` is stored but not yet enforced. This is a documented gap for a later row.
