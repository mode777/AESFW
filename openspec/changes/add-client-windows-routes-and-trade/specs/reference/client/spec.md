# Spec Delta

## ADDED Requirements

### Requirement: Log window
The log window SHALL render domain events as localized text lines carrying the event type, tick, and subject, newest first, filterable by event type, location, and entity, and clicking a line SHALL select its subject in the world. The log SHALL be bounded to a client-local history of the most recent events (view-only state, never authoritative).

Source: REF-12.4, PIC-11

#### Scenario: Events render as lines newest first
- **WHEN** the client has received events at ticks `100` and `104`
- **THEN** the log lists the tick-104 line before the tick-100 line

#### Scenario: A filter narrows the log
- **WHEN** the log is filtered to `Traded` events
- **THEN** only `Traded` lines render

#### Scenario: Clicking a line selects the subject
- **WHEN** a `ProductionBlocked` line for entity `7` is clicked
- **THEN** entity `7` becomes the selection and its panel opens

### Requirement: Explore and establish from the world canvas
Selecting an unknown or unestablished island on the world canvas and choosing explore or establish SHALL open the routes window prefilled with a single-station, action-less draft of the matching mode, validated exactly as the draft rules require. The establishment cost SHALL be displayed from definition metadata next to the flow without any affordability judgment.

Source: REF-12.1, REF-13.3, GDD-16.2, GDD-16.3

#### Scenario: An unknown island prefills an explore draft
- **WHEN** explore is chosen on an island with knowledge `unknown`
- **THEN** the routes window opens with one action-less station at that island and `mode: explore`

#### Scenario: An unestablished known island prefills an establish draft
- **WHEN** establish is chosen on a discovered but unestablished island
- **THEN** the routes window opens with an establish draft and the EP cost shown

## MODIFIED Requirements

### Requirement: Economy drawer view
The statistics window SHALL list the owner's balance, the net rate per tick with the trend sparkline, revenue by source, expenses by source, the idle-but-paying entities, and the deficit-paused entities in pause order, with a control that submits `ResumeDeficitPausedEntities` with `entities: 'all'`. It SHALL additionally render the tier pyramid per location and per owner from location summaries, and the capability supply versus demand. Every value SHALL come from the projection's owner balance entry and summaries; the trend sparkline SHALL be client-side history of the net rate (last 60 published samples).

Source: REF-12.4, PIC-10.6, PIC-10.2

#### Scenario: The economy view lists sources and paused entities
- **WHEN** the owner balance carries revenue by source `{'tier.test.tier.s1': 10}` and expenses by source `{'entity.3': 50}` with one deficit-paused entity
- **THEN** the statistics window shows one revenue row, one expense row, and the paused entity, and offers the resume control

#### Scenario: The pyramid renders per location and owner
- **WHEN** two known locations hold S1 and S2 populations
- **THEN** the pyramid section shows one bar per tier per location and the owner total

#### Scenario: The resume control submits the resume command
- **WHEN** the statistics window's resume control is activated
- **THEN** the client submits a `ResumeDeficitPausedEntities` command with `entities: 'all'`

### Requirement: Planning drawer view
The planning window SHALL fetch the `planning` query when visible and list, per consumed resource, the net rate and per consuming tier the per-capita demand, supported population, current population, and coverage; and the chain table with stage definition, count, ratio, output, footprint, maintenance, and capability demand.

Source: REF-12.4, PIC-10.5

#### Scenario: The planning view renders supported population
- **WHEN** the planning query returns a resource whose owner scope reports a tier with supported `1` and coverage `1000`
- **THEN** the planning window shows that tier row with supported `1`

#### Scenario: The planning view refreshes while visible
- **WHEN** the planning window is open and a new snapshot is published
- **THEN** the client issues a new `planning` query

### Requirement: Logistics drawer
The routes window SHALL list transport units and orders. Selecting a unit SHALL query its transport detail and show state, current station, cargo, progress, and failure reasons.

Source: REF-12.4, PIC-10.4

#### Scenario: The drawer lists units and orders
- **WHEN** the snapshot has one transport unit and the read model has one order
- **THEN** the routes window shows one unit row and one order row

#### Scenario: Selecting a unit shows its detail
- **WHEN** the user selects a unit
- **THEN** the client queries `transport_detail` and renders its state, cargo, and progress

### Requirement: Route editor
The route editor in the routes window SHALL edit a station list with ordered actions. Each action SHALL expose a resource id, an action (`load`, `unload`, `buy`, `sell`), a quantity rule (all GDD-15.3 modes), a quantity when the rule needs one, and an optional price limit. The editor SHALL create a new order, modify the selected order, delete it, and assign or unassign the selected unit.

Source: REF-12.4, GDD-15.3, ARCH-7.3

#### Scenario: A new two-station route is created
- **WHEN** the user creates a route with a load action at the origin and an unload action at the destination
- **THEN** the client sends `CreateTransportOrder` with the converted payload

#### Scenario: An existing route is modified
- **WHEN** the user changes an action rule and saves a selected order
- **THEN** the client sends `ModifyTransportOrder` with the order id and payload

#### Scenario: A unit is assigned
- **WHEN** a unit and an order are selected and the user presses assign
- **THEN** the client sends `AssignTransport` with both ids

#### Scenario: An invalid draft is not saved
- **WHEN** a draft has no stations or an empty resource id
- **THEN** `draftValid` is false and the editor does not claim the draft is valid

### Requirement: Exchange drawer
The exchange window SHALL, for every exchange entity visible in the projection, request the exchange-quotes read model and render per good: the current buy and sell price versus their base prices, the recent volume, and the recovery estimate. Exchanges SHALL be identified from the projection by their definition id, resolved through the definition-metadata query for the exchange collection. When no exchange exists the window SHALL render an empty state.

Source: REF-12.4, PIC-10.7

#### Scenario: The drawer renders quotes
- **WHEN** the window opens with one exchange whose good quotes a sell price of `720` against a base of `800`, recent sold volume `300`, and a recovery estimate of `5` ticks
- **THEN** the exchange window shows the sell price against its base, the volume, and the recovery estimate for that good

#### Scenario: No exchange renders an empty state
- **WHEN** the projection contains no exchange entity
- **THEN** the window shows an empty state instead of rows

### Requirement: Trade-order shortcut
Per quoted good the exchange window SHALL offer buy and sell shortcuts that build a trade-mode route draft — one station at the exchange endpoint with a fixed-quantity action for the quoted resource — through a pure selector, and open the routes window prefilled with that draft; the player then assigns a unit and dispatches it as any other order.

Source: REF-12.4, REF-12.1

#### Scenario: The sell shortcut prefills a trade draft
- **WHEN** the sell shortcut of a good quoted at an exchange is pressed
- **THEN** the routes window opens with a trade-mode draft of one station at that exchange endpoint carrying a fixed-quantity sell action for the quoted resource

### Requirement: Drawer keyboard map
The window keys SHALL toggle the statistics (`E`), planning (`P`), routes (`L`), exchange (`X`), and log (`G`) windows; activating the visible window's key again closes it, and `Escape` closes the most recently opened window. `R` stays reserved for ghost rotation (REF-13.2). The mapping SHALL be a pure view-state helper.

Source: REF-13.2, REF-16

#### Scenario: The economy key toggles the drawer
- **WHEN** the statistics window is closed and the `E` key action is applied
- **THEN** the window state becomes `statistics`; applying it again returns it to closed

#### Scenario: Escape closes the top window
- **WHEN** two windows are open and `Escape` is handled
- **THEN** the most recently opened window closes
