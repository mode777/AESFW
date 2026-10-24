# Proposal

## Why

Roadmap 08, M9 item 9.2 (`add-trade-execution`). GDD-17.4 defines how trades execute: a trade action names resource, direction, quantity rule, and a price limit; execution is atomic per action (cargo transfer and balance transaction commit together); trades order deterministically by tick, exchange, owner, and transport-unit id; and ARCH-14.4 fixes the phase — trade actions execute against the exchange's price state in phase 17. Today `trade`-mode orders and `buy`/`sell` actions are accepted by the command gateway but execute as plain load/unload (the 6.4 interim), no money moves, no price limits apply, and nothing records elasticity volume — so the exchange state of 9.1 has no writer and R-12 (exchanges as a money exploit) cannot be retired by INV-13.

## What Changes

- Phase 16 stages `buy`/`sell` actions of docked units for `trade`-mode orders (and for any order mode that names them): a station endpoint may be an exchange entity at the unit's location; the quantity rule is measured from the acting side against the cargo alone (an exchange's stock is unbounded), throttled by the unit's handling rate as usual.
- Phase 17 (`executeTrades`) replaces its no-op: staged `buy`/`sell` entries execute against the authoritative price state, sorted deterministically by exchange, owner, and unit within the tick. A trade checks the price limit (`sell` at least the limit, `buy` at most the limit) and the side's `enabled` flag; a violation applies the `exchange_limit_not_met` failure with the order's failure policy. An accepted trade commits one atomic transaction — the owner's currency account moves by `price × quantity` and the unit's cargo moves the resource — then records the volume into the elasticity windows and emits a `Traded` event.
- The transaction union's pre-wired `trade` variant becomes executable: `AtomicBuilder.trade` applies the currency delta (rejecting `insufficient_balance` for a buy that the owner cannot pay unless the currency allows negative) and journals the trade with its currency so INV-23's owner-balance conservation accounts for it.
- A buy that the owner cannot afford fails the action with `origin_unavailable` (the GDD-15.7 resource-unavailable bucket); a sell never fails on funds.
- INV-13 joins the invariant harness: for every exchange price row the sell price stays strictly below the buy price, which holds by construction because selling only lowers and buying only raises a spread whose bases are validated `sell < buy` (9.1).
- Phase 19 no longer treats `buy`/`sell` as load/unload; phase 17 consumes every staged trade entry, so phase 19 commits only plain handling.

## Capabilities

### Modified Capabilities

- `sim/exchanges`: trade execution over the price state — trade stations, price limits and side enablement, atomic execution and ordering, INV-13.

## Impact

- **Packages:** `@aesfw/core` (phase 17, trade staging in orders, `AtomicBuilder.trade`, INV-13), `@aesfw/testkit` (INV-13), `@aesfw/app` (no change — the command surface of 6.4 already parses trade orders; its behavior is now executed).
- **Tick phases:** phase 17 filled in; phase 16 stages trades; phase 19 narrows to plain handling.
- **Store kinds:** none new (`exchangeRef` gains its location field).
- **Commands/events/error/diagnostic codes:** new domain event `Traded`; failure key `exchange_limit_not_met` becomes reachable (already declared in 6.4 with default policy `skip`).
- **Protocol/save format:** additive optional `currency` on the journaled trade transaction (journal is output-only, not saved); no version bump. HASH-CHANGING: no shipped scenario stages a trade, so all goldens are unchanged.
- **Dependencies on archived changes:** 9.1 `add-exchange-price-state` (archived 2026-10-24), 6.5 `add-transport-quantity-rules` (archived 2026-10-23).

## Out of Scope

- 9.3 `add-exchange-quotes-read-model`: the client-visible quotes DTO (PIC-10.7).
- 9.4 `add-golden-exchange`: the SCN-06 scenario and golden.
- 13.4 `add-multiple-owners`: shared elasticity across competing owners is already the 9.1 behavior; per-owner price states and other-owner trading wait for that row.
- M10 `add-graph-validation`: the recipe-vs-exchange arbitrage diagnostics (GDD-17.3's warning).
