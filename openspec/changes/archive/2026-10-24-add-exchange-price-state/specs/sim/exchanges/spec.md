# Spec Delta

## Purpose

Exchanges are fixed trading counterparties that buy and sell resources against an owner-scoped balance resource without an opponent. This capability holds their content surface, authoritative price state, and the mandatory elasticity and recovery that keep trade a buffer instead of a money exploit.

## ADDED Requirements

### Requirement: Exchange definitions
The framework SHALL accept an `exchanges` definition collection. An exchange definition SHALL declare an id, a location (a location template), a currency resource, a list of goods (each naming a resource with `buy_from_exchange` and `sell_to_exchange` entries carrying a base price and an `enabled` flag), a mandatory `elasticity` block (`window_ticks`, `step_quantity`, `step_change_permille`, `recovery_permille_per_interval`, `recovery_interval_ticks`, `min_price_permille`, `max_price_permille`), and a `shared_between_owners` flag. Validation SHALL reject an exchange without an `elasticity` block, a good whose `sell_to_exchange.base_price` is not lower than its `buy_from_exchange.base_price`, `min_price_permille` greater than `max_price_permille`, `min_price_permille` less than or equal to zero, or non-positive `step_quantity`, `window_ticks`, or `recovery_interval_ticks`, each as a diagnostic naming the exchange and good.

Source: GDD-17.2, CONT-6.21, GDD-17.3

#### Scenario: A valid exchange package validates
- **WHEN** a content package declares a valid exchange with elasticity, currency, location, and goods
- **THEN** validation reports no findings and the registry exposes the exchange definition

#### Scenario: Missing elasticity is rejected
- **WHEN** an exchange definition omits the `elasticity` block
- **THEN** validation fails with a diagnostic naming the exchange

#### Scenario: Inverted spread is rejected
- **WHEN** a good's `sell_to_exchange.base_price` is greater than or equal to its `buy_from_exchange.base_price`
- **THEN** validation fails with a diagnostic naming the exchange and the good

#### Scenario: Unresolved references are rejected
- **WHEN** an exchange references an unknown location, currency, or goods resource
- **THEN** validation fails with a diagnostic naming the unresolved reference

### Requirement: Exchange instantiation
Instantiating a world SHALL create one exchange entity per exchange definition at the location instance of its referenced location template, carrying an `exchangeRef` component naming the exchange definition, and SHALL seed the authoritative exchange price table with one row per good at the good's base buy and sell prices. Price rows SHALL be ordered by exchange entity id and then resource handle.

Source: GDD-17.2, ARCH-14.5

#### Scenario: An exchange is instantiated at its location
- **WHEN** a world whose definition declares an exchange at a location template is instantiated
- **THEN** an exchange entity exists at that location with an `exchangeRef` to the exchange definition

#### Scenario: Price state starts at base prices
- **WHEN** an exchange is instantiated
- **THEN** the price table contains one row per good with buy and sell equal to the configured base prices and empty volume windows

#### Scenario: A good's price row carries both base prices regardless of side flags
- **WHEN** a good declares `enabled: false` on one or both price sides
- **THEN** the price row still exists with both base prices, and the side flags gate trading in the row that owns execution (9.2)

### Requirement: Authoritative price state
Each price row SHALL hold the current buy price, the current sell price, and rolling per-tick sold and bought volume windows for its (exchange, resource) pair. The price state SHALL be part of the world encoding, hash, clone, and save round-trip.

Source: ARCH-14.5, GDD-17.3

#### Scenario: Price state survives save and load
- **WHEN** a world with adjusted prices is encoded and decoded
- **THEN** the decoded price rows equal the original rows and both encodings hash identically

### Requirement: Elasticity
Recording traded volume for a good SHALL shift a per-tick window of length `window_ticks` for the traded direction and SHALL adjust that direction's price by `step_change_permille` of the base price for each additional whole `step_quantity` accumulated in the window. Sold volume SHALL lower the sell price; bought volume SHALL raise the buy price. Every price SHALL be clamped to `[min_price_permille, max_price_permille] × base_price`, and the two bounds multiplied by the base price SHALL be safe integers.

Source: GDD-17.3, GDD-3.11

#### Scenario: Repeated sales lower the sale price
- **WHEN** the windowed sold volume crosses successive `step_quantity` thresholds
- **THEN** the sell price drops by `step_change_permille` of the base price per threshold, in fixed-point arithmetic

#### Scenario: Buys raise the purchase price
- **WHEN** the windowed bought volume crosses a `step_quantity` threshold
- **THEN** the buy price rises by `step_change_permille` of the base price per threshold

#### Scenario: Prices are clamped to bounds
- **WHEN** recorded volume would push a price beyond `max_price_permille` or below `min_price_permille` of the base
- **THEN** the price equals the bound exactly

#### Scenario: Aged-out volume stops further stepping
- **WHEN** all volume has left the window and no new volume is recorded
- **THEN** recording no new volume adjusts no price; only recovery moves prices

### Requirement: Price recovery (phase 28)
The `recoverExchangePrices` system SHALL run in phase 28 each tick: it SHALL drop window entries older than `window_ticks`, and every `recovery_interval_ticks` (aligned to the tick modulo) it SHALL move each price toward its base price by `recovery_permille_per_interval` of the base price, moving a falling price up and a rising price down by at most that amount and never past the base price, still clamped to the configured bounds. Volume recording and recovery SHALL use only fixed-point integer arithmetic.

Source: GDD-17.3, ARCH-14.5

#### Scenario: Prices recover toward base
- **WHEN** a lowered sell price ticks through successive recovery intervals
- **THEN** each interval raises the price by `recovery_permille_per_interval` of the base price until it reaches the base price exactly, and never above it

#### Scenario: Raised prices recover downward
- **WHEN** a raised buy price passes a recovery interval
- **THEN** the price moves toward the base price by the recovery step without passing it

#### Scenario: Windows prune their age
- **WHEN** more than `window_ticks` ticks pass after a trade
- **THEN** that trade's volume no longer counts toward any step threshold

### Requirement: INV-12 exchange price bounds
The invariant that every exchange price stays within `[min_price_permille, max_price_permille] × base_price` of its good SHALL be checked by the invariant harness after every tick, and the scenario runner's invariants flag SHALL cover it.

Source: VER (INV-12), GDD-17.3

#### Scenario: A violating price is reported
- **WHEN** the harness runs over a world whose price table holds a price outside its configured bounds
- **THEN** the harness reports an INV-12 finding naming the exchange, resource, price, and bounds
