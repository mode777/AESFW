# Spec Delta

## ADDED Requirements

### Requirement: Exchange quotes read model
The `exchangeQuotes(session, actor, exchange)` read model SHALL return, for an exchange entity, the exchange's entity id, location id, region (of its location), currency, the quote validity revision, and one quote per good carrying the current buy and sell price, both base prices, the in-window sold and bought volume, and an informative recovery estimate in ticks toward each base price. The read model SHALL be a pure projection of authoritative state and SHALL be null for an entity that is not an exchange. Quotes are informative; trades always execute at the authoritative price of the executing tick.

Source: PIC-10.7, ARCH-14.5

#### Scenario: Quotes report prices, bases, and volume
- **WHEN** quotes are requested for an exchange whose good trades `300` within the window at a sell price of `720` against a base of `800`
- **THEN** the good's quote carries the current sell and buy price, both base prices, the in-window volume, and the recovery estimate toward the base

#### Scenario: A non-exchange entity has no quotes
- **WHEN** quotes are requested for an entity without an `exchangeRef`
- **THEN** the read model returns no result

#### Scenario: The recovery estimate counts intervals to base
- **WHEN** a good's sell price is `720` against a base of `800` with recovery `200` permille per `5` ticks
- **THEN** the recovery estimate is `5` ticks

### Requirement: Fog-filtered quotes
When fog is enabled and the requesting actor does not know the exchange's location, the read model SHALL return no result, like other location-bound read models.

Source: PIC-10.7, PIC-9.3, ARCH-8.3

#### Scenario: Quotes of an unknown location are withheld
- **WHEN** an actor without knowledge of the exchange's location requests quotes with fog enabled
- **THEN** the read model returns no result

### Requirement: Host query routing
The web-worker host SHALL route an additive `exchange_quotes` query kind with an entity id to the read model for the session actor.

Source: PIC-10.7, TDS-21.1

#### Scenario: The host answers an exchange-quotes query
- **WHEN** the client sends an `exchange_quotes` query for an exchange entity
- **THEN** the host answers with the exchange-quotes DTO
