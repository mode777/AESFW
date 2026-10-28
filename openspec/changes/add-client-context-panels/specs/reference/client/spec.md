# Spec Delta

## ADDED Requirements

### Requirement: Context panel state
The context panel SHALL show exactly one panel: the build menu when nothing is selected, otherwise the info panel matching the selection's kind (residence, producer or service, hub, transport unit, or location). Selecting a different subject SHALL switch the panel; clearing the selection SHALL restore the build menu.

Source: REF-12.3, REF-11

#### Scenario: Selection switches the panel kind
- **WHEN** a residence entity is selected and then a transport unit is selected
- **THEN** the context panel changes from the residence panel to the transport panel

#### Scenario: No selection shows the build menu
- **WHEN** the selection is cleared
- **THEN** the context panel shows the build menu

### Requirement: Residence panel
The residence panel SHALL show the tier with population and capacity, one bar per need carrying demand, delivery, and fulfillment, the category contributions, the satisfaction value Z with its band, and the advancement checklist with per-condition state including sustained-timer progress. It SHALL issue `RequestPopulationTransition` from an eligible entry and offer the purpose-lock switches for the transition-cost resources of the selected location.

Source: REF-12.3, PIC-10.3, PIC-10.1

#### Scenario: Need bars show demand, delivery, and fulfillment
- **WHEN** a residence's need breakdown reports demand `10`, delivered `8`, and fulfillment `800` permille for a need
- **THEN** the panel's bar for that need carries all three values

#### Scenario: The checklist shows sustained progress
- **WHEN** a residence's transition entry reports a sustained condition with `progress: 2` of `ticks: 3`
- **THEN** the panel shows the condition with its progress and a disabled Advance control while ineligible

#### Scenario: The purpose lock is toggled from the panel
- **WHEN** the player activates the lock switch for BM1
- **THEN** the client sends `SetResourcePurposeLock` with `locked: true` for that location, resource, and the `population_transition` purpose

### Requirement: Producer and service panel
The producer or service panel SHALL show the definition code, lifecycle and enabled state (including deficit-paused), the selected recipe and progress, inputs and outputs per minute at the resource scales, the block reasons, the capability request and allocation, and the maintenance quantity with its charge policy. It SHALL issue `SetEntityEnabled`, `SelectRecipe`, `SetProcessPriority`, and `SetCapabilityPriority`.

Source: REF-12.3, PIC-10.1, REF-10.3

#### Scenario: Rates are shown per minute
- **WHEN** a refiner's recipe consumes `12000` P1 per `30` ticks at scale `6000` and `tick_duration_ms: 1000`
- **THEN** the panel shows an input rate of `4` per minute

#### Scenario: A deficit-paused producer is marked
- **WHEN** the selected producer is paused by deficit
- **THEN** the panel shows the paused-by-deficit state with the accent encoding

### Requirement: Hub and location panels
The hub panel SHALL show the location's inventory — one row per resource carrying stored, reserved, capacity, the purpose-lock state, and the net rate — plus the location's throughput, and SHALL issue `SetInventoryPolicy` and `SetResourcePurposeLock`. The location panel (an island selected at world level) SHALL show knowledge state, region, ownership, and, when known, slot types and suitability, and SHALL issue `ActivateLocation`/`DeactivateLocation` and open the explore/establish flow.

Source: REF-12.3, PIC-10.2, PIC-9.1, REF-12.1

#### Scenario: Inventory rows carry lock state and net rate
- **WHEN** the viewed hub stores `100` of a resource with `20` reserved, a transition lock, and a net rate of `+5`
- **THEN** its row shows stored `100`, reserved `20`, the lock mark, and the rate

#### Scenario: The location panel gates knowledge
- **WHEN** an unknown location is selected at world level
- **THEN** the panel shows only the knowledge state and its known connections, no region or ownership attributes

### Requirement: Transport unit panel
The transport unit panel SHALL show the unit's order, the station list with the cursor, cargo by slot, its state, and failure reasons from the transport detail read model, and SHALL issue `AssignTransport` and `UnassignTransport`.

Source: REF-12.3, PIC-10.4

#### Scenario: The panel lists stations and cargo
- **WHEN** a unit assigned to a two-station order carries `30` units in slot 1
- **THEN** the panel shows both stations, the cursor at the first, and the slot load

### Requirement: Floating status markers
At location level and deeper, every entity whose block reasons are non-empty SHALL carry a floating status marker above its shape with the block-reason glyph (I, C, A, O, T per REF-10.3). Markers SHALL be part of the status-marker layer and SHALL not be mounted at world level.

Source: REF-10.3, REF-12.2, PIC-9.1

#### Scenario: A blocked entity shows a marker
- **WHEN** an entity has block reason `missing_input` at location level
- **THEN** a marker with glyph `I` floats above its shape

#### Scenario: Markers are culled at world level
- **WHEN** the camera is at world level
- **THEN** no status marker is mounted

## MODIFIED Requirements

### Requirement: Need breakdown rows
`needRows(breakdown, i18n)` SHALL turn need-breakdown DTOs into rows carrying the need ID, demand, delivered, fulfillment, and category contribution, sorted by ascending need ID, rendered as bars in the residence panel.

Source: REF-12.3, PIC-10.3

#### Scenario: Need rows are sorted by need ID
- **WHEN** breakdowns for `test.need.b` and `test.need.a` are selected
- **THEN** the rows list `test.need.a` before `test.need.b`

#### Scenario: Category contributions are included
- **WHEN** a need contributes `500` permille to its category score
- **THEN** its row carries the contribution

### Requirement: Inventory table
`inventoryRows(location, i18n)` SHALL turn a location DTO into one row per inventory entry carrying the resource ID, stored, reserved, capacity, purpose-lock state, and net rate, sorted by ascending resource ID, rendered in the hub panel. Table mode SHALL render the same rows as tables.

Source: REF-12.4, REF-12.3, PIC-10.2

#### Scenario: Inventory rows carry stored and reserved
- **WHEN** a location with an entry `{ resource_id: 'test.resource.a', stored: 100, reserved: 20 }` is selected
- **THEN** the row has stored `100` and reserved `20`

### Requirement: Entity inspector selector
`producerPanel(detail, presentation, i18n)` SHALL turn an `EntityDetailDto` of a producer or service into the panel view model with the definition code, lifecycle, enabled and paused state, recipe and progress, per-minute rates, block reasons, capability request and allocation, maintenance, and the available commands. It SHALL be a pure function. The former inspector view is removed; the panel is its only rendering.

Source: REF-12.3, PIC-10.1

#### Scenario: The inspector shows the recipe and progress
- **WHEN** an entity detail with a production recipe `test.recipe.a` and progress `500` is selected
- **THEN** the panel view model lists the recipe and a `50 %` progress value

#### Scenario: The inspector lists the block reasons
- **WHEN** an entity detail has block reasons `['missing_input']`
- **THEN** the panel view model lists `missing_input`

## REMOVED Requirements

### Requirement: Population table
**Reason:** The standalone population table is replaced by the population strip under the minimap (11.4b) and the residence panel's tier rows; table mode still renders population rows from the same summaries.
**Migration:** Population-by-tier display is owned by the minimap strip (11.4b) and the residence panel; the table-mode projection keeps population rows.

### Requirement: Inspector commands
**Reason:** The inspector view is gone; each panel issues its own commands and never mutates the mirror.
**Migration:** Command issuance per panel kind is owned by the panel requirements of this delta with the same envelopes.
