# Spec Delta

## ADDED Requirements

### Requirement: Trade stations
A station action `buy` or `sell` of a docked transport unit SHALL stage against an exchange: the station endpoint may name the exchange entity itself, and staging requires an exchange of that location. The target quantity SHALL follow the action's quantity rule measured from the acting side against the cargo alone, limited by the unit's handling rate and throughput throttle like any other station action. A trade action staged where no exchange exists at the location SHALL fail with `origin_unavailable` for a buy and `destination_unavailable` for a sell.

Source: GDD-17.4, GDD-17.2, ARCH-14.4

#### Scenario: A buy action stages against cargo capacity
- **WHEN** a docked unit with cargo capacity `800` and loading rate `100` per tick starts a `buy` action with rule `up_to_capacity` at an exchange
- **THEN** the staged quantity is `100` on the first tick and the unit remains at the station until the target is handled

#### Scenario: A sell action stages the cargo quantity
- **WHEN** a docked unit holding `500` of the resource starts a `sell` action with rule `all` at an exchange
- **THEN** the staged quantity is bounded by the unloading rate per tick and drains the cargo to `0`

#### Scenario: No exchange at the location fails the action
- **WHEN** a `buy` or `sell` action starts at a location without an exchange
- **THEN** the action fails with `origin_unavailable` or `destination_unavailable` respectively, and the order's failure policy for that key applies

### Requirement: Price limits and side enablement
Before executing, a trade SHALL check the authoritative current price against the action's price limit — a sell requires the current sell price to be at least the limit, a buy requires the current buy price to be at most the limit — and the configured `enabled` flag of that price side. A violated limit or a disabled side SHALL apply the `exchange_limit_not_met` failure key with the order's failure policy and SHALL NOT execute.

Source: GDD-17.4, GDD-17.2

#### Scenario: A sale below the price limit is refused
- **WHEN** the current sell price is `720` and the action's `price_limit` is `800`
- **THEN** no trade executes and the `exchange_limit_not_met` failure policy applies

#### Scenario: A purchase above the price limit is refused
- **WHEN** the current buy price is `1200` and the action's `price_limit` is `1000`
- **THEN** no trade executes and the `exchange_limit_not_met` failure policy applies

#### Scenario: A disabled side is refused
- **WHEN** a good's `sell_to_exchange.enabled` is `false` and a unit offers a sell
- **THEN** no trade executes and the `exchange_limit_not_met` failure policy applies

### Requirement: Atomic trade execution (phase 17)
The `executeTrades` system SHALL execute staged trades in phase 17 at the exchange's current price, ordered within the tick by exchange entity id, then owner handle, then transport-unit id. One trade SHALL commit as one atomic transaction: the owner's currency account moves by `price × quantity` (a buy debits, a sell credits) and the unit's cargo gains or loses the resource — together or not at all. The executed quantity SHALL then be recorded into the exchange's elasticity windows, and a `Traded` event SHALL be emitted naming the unit, owner, location, exchange, resource, quantity, price, and direction.

Source: GDD-17.4, ARCH-14.4, ARCH-14.5

#### Scenario: A sale pays out at the current price
- **WHEN** a unit sells `300` of a resource at a current sell price of `800`
- **THEN** the owner's currency account gains `240000`, the cargo loses `300`, a `Traded` event is emitted, and the exchange's sold-volume window records `300` for the tick

#### Scenario: A purchase debits the owner
- **WHEN** a unit buys `200` of a resource at a current buy price of `1000`
- **THEN** the owner's currency account is debited by `200000` and the cargo gains `200`

#### Scenario: Trades execute in deterministic order
- **WHEN** two units of different owners trade at the same exchange in one tick
- **THEN** their trades apply in ascending exchange, owner, and unit order, and repeating the tick yields identical state and hash

#### Scenario: An unaffordable purchase fails without partial effects
- **WHEN** a buy's total exceeds the owner's currency balance and the currency does not allow negative
- **THEN** the transaction is rejected, no cargo moves, and the action fails with `origin_unavailable`

### Requirement: The atomic trade transaction
`AtomicBuilder.trade` SHALL apply the currency delta of the trade to the owner's account and journal a `trade` transaction carrying the exchange, owner, unit, traded resource, quantity, price, direction, and currency, so owner-balance conservation (INV-23) accounts for the currency movement.

Source: GDD-17.4, ARCH-6

#### Scenario: The trade journal entry balances the account
- **WHEN** a trade commits through `AtomicBuilder.trade`
- **THEN** the journal's trade entry and the owner account delta agree, and the harness reports no INV-23 finding

### Requirement: INV-13 no arbitrage across the spread
The invariant that no sequence of trades within one tick and one exchange yields a profit from buying and reselling the same resource SHALL be enforced structurally: every exchange price row SHALL satisfy `sell < buy` after every tick, and buying then reselling the same quantity at the executed prices SHALL never return more currency than it cost. The invariant harness SHALL check the row relation after every tick.

Source: VER (INV-13), GDD-17.3, GDD-17.4

#### Scenario: A buy-then-sell round trip loses currency
- **WHEN** a unit buys a quantity at the current buy price and sells the same quantity at the current sell price within one tick
- **THEN** the owner's currency balance is strictly lower than before the round trip

#### Scenario: A crossed spread is reported
- **WHEN** the harness runs over a world whose price row holds `sell ≥ buy`
- **THEN** the harness reports an INV-13 finding naming the exchange and resource
