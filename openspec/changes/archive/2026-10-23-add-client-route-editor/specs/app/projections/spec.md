# Spec Delta

## ADDED Requirements

### Requirement: Transport-order list read model
`transportOrders(session)` SHALL list every order entity in ascending entity id with its `order_id`, `mode`, `repeat`, and stations/actions (resource id, action, rule mode, optional quantity).

Source: PIC-10.4, REF-12.4

#### Scenario: An order appears in the list
- **WHEN** one route order exists with two stations
- **THEN** the list has one entry with mode `route`, `repeat`, and two stations

#### Scenario: The list is ordered by entity id
- **WHEN** orders `9` and `6` exist
- **THEN** the list is `[6, 9]`
