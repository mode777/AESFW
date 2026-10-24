# Design

## Context

The trade seams are pre-wired: `TransportOrderMode 'trade'`, `TransportAction 'buy'|'sell'`, the `exchange_limit_not_met` failure key (default policy `skip`), the tx `trade` journal variant, and `Purpose 'exchange_sale'`. The command gateway already parses trade orders with `price_limit` (6.4), staging them as plain load/unload. Phase 17 is a no-op. 9.1 delivered the price state it executes against.

## Goals / Non-Goals

- Goals: staging of trade actions in phase 16, execution with price limits and side enablement in phase 17, the atomic `AtomicBuilder.trade`, deterministic ordering, elasticity volume recording, `Traded`, INV-13.
- Non-Goals: quotes read model (9.3), SCN-06 golden (9.4), client (9.5), per-owner price states (13.4), arbitrage diagnostics (M10).

## Decisions

### D1 — Station endpoints may name the exchange entity

GDD-17.2: exchanges "are reached by transport units through connections, like any other endpoint". `exchangeRef` gains a `location` field (the exchange entity's location), so phase 16 accepts a station endpoint that either equals the unit's location or is an exchange entity at it. Load/unload endpoints stay plain locations; the check is additive. Location-inventory rules (`all`, `excess_above`, `maintain_origin_minimum`, `priority_list` inventory clauses) are measured with the exchange stock treated as unbounded for buys and ignored for sells — a trade's target comes from the cargo side and the rule's own constants.

### D2 — Phase 17 consumes trades out of the staged scratch list

Phase 16 stages `buy`/`sell` entries into the same scratch key as plain handling. Phase 17 partitions that list: entries whose action is `buy`/`sell` execute (or fail) there; the remainder is written back for phase 19, which therefore handles only `load`/`unload`. The 6.4 interim (buy as load, sell as unload in phase 19) is removed; any staged trade that reaches phase 19 would be a defect.

### D3 — Execution order

Per GDD-17.4, phase 17 sorts the staged trades by `(exchange entity id, owner handle, unit entity id)` ascending before executing; the tick is the sort's outermost key by construction. This is a total-order sort, and repeating a tick reproduces state and hash bit-for-bit.

### D4 — Price limit, enablement, and funds as failure keys

The limit check uses the price row's current value before any of the tick's trades: `sell ≥ price_limit`, `buy ≤ price_limit`; an unset limit imposes no constraint. A disabled side behaves like a violated limit (`exchange_limit_not_met`) — the exchange does not offer that trade. A buy the owner cannot afford rejects in the transaction (`insufficient_balance` unless the currency allows negative) and maps to `origin_unavailable`, the GDD-15.7 resource-unavailable bucket that 8.3 established for unpayable costs. A sell never fails on funds.

### D5 — `AtomicBuilder.trade` is one account op plus the journal entry

The op debits/credits the owner's currency account (same working-map path and `allow_negative` check as `account`) and journals the pre-wired `trade` variant, extended with the `currency` handle. The cargo move is not tx-managed (cargo is a component store, like every existing handling path): it applies immediately after the atomic commit succeeds, so the observable guarantee — no balance movement without cargo movement and vice versa — holds at the same boundary as load/unload atomicity. INV-23's trade branch now adds `±price×quantity` on the journal entry's currency, replacing the placeholder sign convention.

### D6 — Elasticity records after the commit

`recordExchangeVolume` runs after the transaction and cargo move, once per executed trade, with the tick of execution. Because prices are read before any of the tick's trades and adjust only after commits, a same-tick buy-then-sell pays the pre-tick buy price and receives a sell price at or below the pre-tick sell price — strictly below the buy price by the validated base spread — so INV-13's round-trip property holds without extra state.

### D7 — INV-13 as a row relation

The harness checks, for every price row after the tick, `sell < buy` (strict). Given 9.1's validation (`sell_base < buy_base`), the per-side clamp windows, and the monotone directions (buys only raise the buy price, sells only lower the sell price, recovery never crosses either base), a crossed row is a defect. The round-trip loss itself is covered by a unit test executing a buy and a sell of the same quantity in one tick.

## Clarifications recorded (no normative amendment)

- Disabled side ≡ violated price limit (`exchange_limit_not_met`) (D4).
- Unaffordable buy ≡ `origin_unavailable` (D4), following 8.3's failure-key mapping.
- A trade's quantity rules interpret the exchange stock as unbounded (D1); `maintain_destination_target`/`deficit_below` measure the cargo, not a location inventory.
- The journal's `trade` variant gains an additive `currency` field; the journal is tick output, never saved, so no save-format change (D5).

## Risks / Open Questions

- Phase 16's endpoint relaxation must not let load/unload stations match exchanges: only `buy`/`sell` actions consult the exchange-endpoint rule; load/unload keep the strict location equality.
- Existing tests that used `buy`/`sell` as load/unload aliases (6.4-era) are updated in this change; the interim behavior is removed, not deprecated.
