# Spec Delta

## ADDED Requirements

### Requirement: Logistics drawer
The client SHALL provide a logistics drawer, opened with `L`, that lists transport units and orders. Selecting a unit SHALL query its transport detail and show state, current station, cargo, progress, and failure reasons.

Source: REF-12.4, PIC-10.4

#### Scenario: The drawer lists units and orders
- **WHEN** the snapshot has one transport unit and the read model has one order
- **THEN** the drawer shows one unit row and one order row

#### Scenario: Selecting a unit shows its detail
- **WHEN** the user selects a unit
- **THEN** the client queries `transport_detail` and renders its state, cargo, and progress

### Requirement: Route editor
The route editor SHALL edit a station list with ordered actions. Each action SHALL expose a resource id, an action (`load`, `unload`, `buy`, `sell`), a quantity rule (all GDD-15.3 modes), a quantity when the rule needs one, and an optional price limit. The editor SHALL create a new order, modify the selected order, delete it, and assign or unassign the selected unit.

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
