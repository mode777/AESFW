# Spec Delta

## ADDED Requirements

### Requirement: Establishment definitions
The content layer SHALL accept a `location_establishments` collection of `{ id, requires_knowledge, requires_unoccupied, cost_source, costs, creates_hub, activation, ownership }` where `requires_knowledge` is `discovered` or `established`, `cost_source` is `transport_cargo`, `activation` is `on_completion`, and `ownership` is `exclusive`. `creates_hub` SHALL resolve to an entity definition and each cost resource SHALL resolve; violations SHALL report `unresolved_reference` or `reference_type_mismatch`, and a definition violating the v1 literals SHALL report `schema_invalid`. A location template MAY declare `establishment` naming such a definition; an unresolvable reference SHALL report `unresolved_reference`, and the resolved handle SHALL reach the location component only when declared.

Source: GDD-16.3, CONT-6.20, CONT-6.4

#### Scenario: A well-formed establishment validates
- **WHEN** an establishment requires knowledge `discovered`, is unoccupied-only, costs `1000` of a resource from transport cargo, creates an entity definition hub, activates on completion, and claims exclusive ownership
- **THEN** it loads with no diagnostics

#### Scenario: A hub that is not an entity definition is reported
- **WHEN** an establishment's `creates_hub` names a resource
- **THEN** the load reports `reference_type_mismatch`

#### Scenario: A template declares its establishment
- **WHEN** a location template declares `establishment: test.establishment.default` and the definition exists
- **THEN** the location component carries the establishment handle

#### Scenario: A template without an establishment omits the field
- **WHEN** a location template declares no `establishment`
- **THEN** the location component carries no establishment field

### Requirement: The establishment transaction
Phase 18 SHALL execute the establishment transaction when a unit with an `establish` order arrives at its current target station, atomically: every guard passes (the owner's knowledge is at least `requires_knowledge`; the location has no owner when `requires_unoccupied`; the cargo covers every cost), the costs are deducted from the cargo, the hub entity is created at the location for the owner, the location's owner and active state are set, the owner's knowledge of the location becomes `established`, and the station cursor advances. A `LocationEstablished` event SHALL name the owner, the location, and the hub.

Source: GDD-16.3, ARCH-14.4, ARCH-5.2

#### Scenario: An arriving unit establishes an unoccupied location
- **WHEN** a unit with `1000` of the cost resource in cargo arrives at an unoccupied, discovered location whose template declares an establishment
- **THEN** the cargo holds `0`, the hub exists at the location for the owner, the location is owned and active, the owner's knowledge is `established`, and `LocationEstablished` is emitted

#### Scenario: A guard failure pays nothing
- **WHEN** the cargo holds less than the cost
- **THEN** the cargo is unchanged, no hub is created, the location stays unowned, and the failure policy applies

#### Scenario: An occupied target applies its failure policy
- **WHEN** a unit arrives to establish a location that already has an owner under `requires_unoccupied`
- **THEN** the `establishment_target_occupied` failure policy is applied and the location is unchanged

#### Scenario: A location without an establishment cannot be established
- **WHEN** an establish order targets a location whose template declares no establishment
- **THEN** the `origin_unavailable` failure policy is applied

### Requirement: Establish orders traverse to their target
An `establish` order SHALL be planned like a route order, and its station cursor SHALL advance only when the establishment transaction completes or its failure policy advances it; phase 16 SHALL NOT advance it. The order repeats or releases its unit by the same rules as route orders.

Source: GDD-15.5, ARCH-14.4

#### Scenario: An establish order releases its unit after completion
- **WHEN** a non-repeating establish order completes its single station
- **THEN** the unit is unassigned

### Requirement: Exclusive ownership
With `ownership: exclusive`, an established location SHALL be owned by the establishing owner and SHALL NOT be establishable by any owner while it has one; `requires_unoccupied` SHALL make the occupied guard reject the transaction.

Source: GDD-16.3

#### Scenario: A second establish attempt is rejected
- **WHEN** another owner's unit arrives to establish an owned location
- **THEN** the `establishment_target_occupied` failure policy is applied and the owner is unchanged
