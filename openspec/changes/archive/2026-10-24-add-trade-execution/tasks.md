# Tasks

## 1. Transaction

- [x] 1.1 [GDD-17.4, ARCH-6] Add `TradeRequest` and `AtomicBuilder.trade`; implement the account op plus `trade` journal entry (additive `currency` field); update INV-23's trade branch to the currency movement. Verify: `[GDD-17.4]` tx unit tests (buy debit, sell credit, insufficient funds, INV-23 clean).

## 2. Trade staging (phase 16)

- [x] 2.1 [GDD-17.4] Carry `location` in `exchangeRef`; seed it at instantiation. Verify: instantiation test update.
- [x] 2.2 [GDD-17.4, GDD-15.3] Stage `buy`/`sell` actions for `trade`-mode orders: exchange-endpoint match, cargo-side quantity rules with unbounded exchange stock, handling-rate throttle, no-exchange failures. Verify: `[GDD-17.4]` staging tests (rates, rules, failures, load/unload unaffected).

## 3. Trade execution (phase 17)

- [x] 3.1 [GDD-17.4, ARCH-14.4] Implement `executeTrades`: deterministic `(exchange, owner, unit)` order, price-limit and side-enablement checks with `exchange_limit_not_met`, atomic commit, cargo move, `origin_unavailable` on unaffordable buys. Verify: `[GDD-17.4]` execution tests (limits, enablement, funds, atomicity).
- [x] 3.2 [GDD-17.4, ARCH-14.5] Record elasticity volume per executed trade and emit `Traded`. Verify: price-state and event assertions in the execution tests.
- [x] 3.3 [GDD-17.4] Narrow phase 19 to plain handling and remove the buy-as-load/sell-as-unload interim; update the 6.4-era tests. Verify: phase 19 tests; full suite green.

## 4. Invariants

- [x] 4.1 [INV-13] Add the `sell < buy` row check to the harness with a crafted violating world. Verify: `[INV-13]` harness tests.
- [x] 4.2 [INV-13, GDD-17.4] Prove the round-trip property: a same-tick buy-then-sell of equal quantity loses currency. Verify: `[INV-13]` integration assertion.

## 5. Integration

- [x] 5.1 [GDD-17.4] Extend the `demo-exchanges` fixture with a transport unit and route, and run a trade order through the session gateway (create → trade → price moved → balance moved). Verify: app session integration test.

## 6. Documentation and verification

- [x] 6.1 Record the D1–D7 decisions; confirm docs 01–04 need no amendment (behavior matches GDD-17.4/ARCH-14.4 as written). Verify: no unintended document diff.
- [x] 6.2 Run `pnpm verify` and `pnpm trace`; all green, GDD-17.4 traced, no new untraced requirement IDs in the claimed sections. Verify: command output.
