# Spec Delta

## ADDED Requirements

### Requirement: Exchange drawer
The client SHALL provide an exchange drawer (keyboard `X`) that, for every exchange entity visible in the projection, requests the exchange-quotes read model and renders per good: the current buy and sell price versus their base prices, the recent volume, and the recovery estimate. Exchanges SHALL be identified from the projection by their definition id, resolved through the definition-metadata query for the exchange collection. When no exchange exists the drawer SHALL render an empty state.

Source: REF-12.4, PIC-10.7

#### Scenario: The drawer renders quotes
- **WHEN** the drawer opens with one exchange whose good quotes a sell price of `720` against a base of `800`, recent sold volume `300`, and a recovery estimate of `5` ticks
- **THEN** the drawer shows the sell price against its base, the volume, and the recovery estimate for that good

#### Scenario: No exchange renders an empty state
- **WHEN** the projection contains no exchange entity
- **THEN** the drawer shows an empty state instead of rows

### Requirement: Trade-order shortcut
Per quoted good the drawer SHALL offer buy and sell shortcuts that build a trade-mode route draft — one station at the exchange endpoint with a fixed-quantity action for the quoted resource — through a pure selector, and open the logistics route editor prefilled with that draft; the player then assigns a unit and dispatches it as any other order.

Source: REF-12.4, REF-12.1

#### Scenario: The sell shortcut prefills a trade draft
- **WHEN** the sell shortcut of a good quoted at an exchange is pressed
- **THEN** the logistics drawer opens with a trade-mode draft of one station at that exchange endpoint carrying a fixed-quantity sell action for the quoted resource

### Requirement: The client stays on the protocol
The drawer and selector SHALL use only `@aesfw/protocol` DTOs and `@aesfw/host-web/client` messaging; they SHALL compute no mechanics and never write derived values back.

Source: REF-14, GDD-2, PIC-2.2

#### Scenario: The drawer is a pure client of the quotes read model
- **WHEN** the drawer renders
- **THEN** it displays only fields of the `ExchangeQuotesDto` and issues only protocol commands and queries
