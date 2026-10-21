# sim/spatial Specification

## Purpose

The spatial-policy abstraction and its `abstract_capacity` implementation, the location runtime state and its shared inventory hub, the inventory-access-policy abstraction and its `shared_location` implementation, and the pure default-world instantiation that turns a plan into location and inventory entities (GDD-6.1, ARCH-11, ARCH-12, CONT-6.4, CONT-6.6).

## Requirements

### Requirement: Spatial policy interface and registry
A `SpatialPolicy` SHALL expose an `id`, `capacity(world, location)`, `validatePlacement(world, location, footprint)`, `add(world, location, footprint)`, and `remove(world, location, footprint)`. `capacity` SHALL return the total, used, and free capacity of a location. `validatePlacement` SHALL return `ok` or a typed rejection code. A registry SHALL resolve a policy by its string id.

Source: GDD-6.1, ARCH-11

#### Scenario: A known policy resolves
- **WHEN** `resolveSpatialPolicy('framework.spatial.abstract_capacity')` is evaluated
- **THEN** it returns the abstract-capacity policy

#### Scenario: An unknown policy does not resolve
- **WHEN** `resolveSpatialPolicy('framework.spatial.unknown')` is evaluated
- **THEN** it returns `null`

### Requirement: Abstract capacity policy
The `framework.spatial.abstract_capacity` policy SHALL report total, used, and free capacity from the location's declared and occupied amounts. `validatePlacement` SHALL reject with `unknown_location`, `location_inactive`, or `insufficient_capacity`. `add` and `remove` SHALL adjust the occupied amount, never below `0`.

Source: GDD-6.1, ARCH-11

#### Scenario: Capacity is reported
- **WHEN** a location with capacity `100` and used `30` is queried
- **THEN** total is `100`, used is `30`, and free is `70`

#### Scenario: A placement within capacity succeeds
- **WHEN** a location with capacity `100` and used `30` validates a footprint of `70`
- **THEN** the result is `ok`

#### Scenario: A placement beyond capacity is rejected
- **WHEN** a location with capacity `100` and used `30` validates a footprint of `71`
- **THEN** the result is `insufficient_capacity`

#### Scenario: A placement at an inactive location is rejected
- **WHEN** an inactive location validates any footprint
- **THEN** the result is `location_inactive`

#### Scenario: A placement at an unknown location is rejected
- **WHEN** an entity without a location component validates any footprint
- **THEN** the result is `unknown_location`

#### Scenario: Occupancy is added and removed
- **WHEN** a footprint of `40` is added to a location with used `0` and then removed
- **THEN** the used amount is `40` and then `0`

### Requirement: Location state
A location entity SHALL carry its template handle, its spatial-policy id, its total capacity, its used capacity, its property vector ordered by ascending property name, its region handle or `null`, its activation flag, and its owner handle or `null`. A `locationHub` component SHALL list the location's inventory entity IDs in ascending order.

Source: GDD-6.1, CONT-6.4

#### Scenario: A location carries its declared fields
- **WHEN** a location is created with capacity `100`, a property, and active state
- **THEN** its component reports those values, used `0`, region `null`, and owner `0`

### Requirement: Shared-location inventory access
The `framework.inventory.shared_location` policy SHALL expose every inventory listed by a location's hub that accepts the requested resource, in ascending entity-ID order. It SHALL return an empty list for an unknown location.

Source: ARCH-12, GDD-8.2

#### Scenario: Every accepting inventory of a location is accessible
- **WHEN** a location has two inventories, one accepting the resource and one not
- **THEN** the policy returns only the accepting inventory

#### Scenario: An unknown location has no accessible inventory
- **WHEN** the policy is queried for an entity that is not a location
- **THEN** it returns an empty list

### Requirement: Default world instantiation
`instantiateWorld(world, plan)` SHALL, per location plan in ascending order, allocate a location entity, set its location component, allocate its inventories with the plan owner and policy, and set the location hub to those IDs. It SHALL ensure the owner exists and allocate IDs through the world allocator.

Source: CONT-6.4, CONT-6.6, ARCH-3.1

#### Scenario: One location with one inventory is instantiated
- **WHEN** a plan with one location and one inventory is instantiated on an empty world
- **THEN** the location entity exists with its hub pointing at the inventory entity, and the inventory component carries the owner and policy

#### Scenario: Instantiation is deterministic
- **WHEN** the same plan is instantiated on two fresh worlds
- **THEN** both worlds have identical state hashes

#### Scenario: The owner is registered
- **WHEN** a plan names owner `0` and the owners table is empty
- **THEN** owner `0` is present in the owners table
