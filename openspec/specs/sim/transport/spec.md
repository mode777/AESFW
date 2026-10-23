# sim/transport Specification

## Purpose
Transport units are the only controllable units in the framework. They carry resources between location inventories through cargo compartments with explicit capacity and acceptance rules.

## Requirements

### Requirement: Transport-unit instantiation
A world definition's `initial_entities` SHALL instantiate the named entity definition at the declared location for the declared owner. When a transport-unit definition names that entity definition, the instantiated entity SHALL carry a `cargo` component, a `movement` component, a `handling` component, and the transport unit's `maintenance` component when configured.

Source: CONT-6.6, CONT-6.16, GDD-15.4

#### Scenario: An initial transport unit is instantiated at its location
- **WHEN** a world owner declares an initial entity `test.entity.transport` at `test.loc.a` and a transport unit names that entity definition
- **THEN** the entity has cargo, movement, and handling components and belongs to the owner

#### Scenario: Transport maintenance is copied at instantiation
- **WHEN** a transport unit declares maintenance of `100` credits every `10` ticks
- **THEN** the instantiated entity has a maintenance component with interval `10` and quantity `100`

### Requirement: Cargo compartment policies
Cargo SHALL support three compartment policies. `unrestricted` SHALL provide one shared capacity for any resource mix. `typed_slots` SHALL provide `slots` compartments, each holding exactly one resource type at a time and at most `slot_capacity`. `per_resource` SHALL limit each resource independently to `slot_capacity`.

Source: GDD-15.4

#### Scenario: Typed slots hold one resource type per slot
- **WHEN** a `typed_slots` cargo has two slots of capacity `100` and loads `100` of resource A and then `100` of resource B
- **THEN** slot 1 holds A and slot 2 holds B, and no further resource fits

#### Scenario: Unrestricted cargo shares one capacity
- **WHEN** an `unrestricted` cargo has capacity `100`, holds `80` of A, and loads `50` of B
- **THEN** it loads `20` of B and is full

#### Scenario: Per-resource cargo limits each resource independently
- **WHEN** a `per_resource` cargo has capacity `100` and loads `120` of A
- **THEN** it holds `100` of A and still has `100` of capacity for B

### Requirement: Cargo acceptance
Cargo with `acceptance: transportable_resources` SHALL accept only resource definitions whose `transportable` field is `true`. Cargo with `acceptance: all` SHALL accept every resource. Loading a rejected resource SHALL load zero.

Source: GDD-15.4, CONT-6.16

#### Scenario: A non-transportable resource is rejected
- **WHEN** cargo accepts only transportable resources and is asked to load a non-transportable resource
- **THEN** the loaded quantity is `0`

#### Scenario: A transportable resource is accepted
- **WHEN** cargo accepts only transportable resources and is asked to load a transportable resource
- **THEN** the resource is loaded up to the free capacity

### Requirement: Deterministic cargo load and unload
Loading SHALL fill existing typed slots of the same resource before empty slots, in ascending slot index. Unloading SHALL remove quantity from ascending slot index. Unrestricted and per-resource entries SHALL be kept in ascending resource-handle order. Loading and unloading SHALL never exceed capacity or the available quantity.

Source: GDD-15.4, TDS-9.4

#### Scenario: Typed loading fills the lowest matching slot first
- **WHEN** slot 1 holds `20` of A and slot 2 is empty, both of capacity `100`, and `50` of A is loaded
- **THEN** slot 1 holds `70` and slot 2 stays empty

#### Scenario: Unloading never removes more than is carried
- **WHEN** cargo holds `30` of A and `100` of A is unloaded
- **THEN** the unloaded quantity is `30` and the cargo no longer holds A

### Requirement: Typed-slot invariant
Every `typed_slots` cargo SHALL satisfy INV-16: each slot holds at most one resource type and no quantity above its slot capacity, and an empty slot has quantity zero.

Source: INV-16, GDD-15.4

#### Scenario: A valid typed cargo passes INV-16
- **WHEN** every slot is either empty or holds one resource within capacity
- **THEN** `checkInvariants` reports no INV-16 finding

#### Scenario: An over-capacity slot fails INV-16
- **WHEN** a typed slot holds `600` with slot capacity `500`
- **THEN** `checkInvariants` reports INV-16

### Requirement: Traversal time
The traversal time of a connection SHALL be `ceil(base_duration_ticks × 1000 ÷ speed_permille)`. A unit with speed `1000` therefore takes the connection's base duration.

Source: ARCH-14.1, CONT-6.5

#### Scenario: Reference speed uses the base duration
- **WHEN** a connection has `base_duration_ticks: 100` and the unit has `speed_permille: 1000`
- **THEN** the traversal time is `100` ticks

#### Scenario: Slower speed rounds up
- **WHEN** a connection has `base_duration_ticks: 101` and the unit has `speed_permille: 500`
- **THEN** the traversal time is `202` ticks

### Requirement: Shortest stable route planning
Route planning SHALL choose a path from origin to destination that minimizes total traversal ticks. Among equal-cost paths it SHALL choose the lexicographically lowest sequence of connection ids. It SHALL exclude disabled connections and connections whose `allowed_transport_tags` do not intersect the unit's allowed tags when both lists are non-empty.

Source: ARCH-14.3, GDD-15.2, CONT-6.5

#### Scenario: Equal-cost paths choose the lower connection sequence
- **WHEN** two paths of equal cost exist with connection sequences `test.conn.a_b, test.conn.b_d` and `test.conn.a_c, test.conn.c_d`
- **THEN** the planner returns the first sequence

#### Scenario: A disabled connection is excluded
- **WHEN** the lower sequence uses a disabled connection
- **THEN** the planner returns the other path

#### Scenario: An unreachable target has no path
- **WHEN** no enabled path connects origin and destination
- **THEN** the planner returns `null`

### Requirement: Movement advancement
Phase 16 SHALL advance every unit with a planned path by one tick in ascending entity ID. It SHALL keep the unit at its current location until the leg's traversal time is reached, then set the unit's location to the next path location and advance the leg index.

Source: ARCH-14.1, ARCH-14.2, TDS-11.1

#### Scenario: A unit advances one tick at a time
- **WHEN** a two-tick leg is started
- **THEN** after one tick the unit has progress `1` and has not arrived, and after the second tick it is at the destination

#### Scenario: A unit with no path does not move
- **WHEN** a unit has no planned path
- **THEN** phase 16 leaves its movement unchanged

### Requirement: Transport arrival event
On arrival, phase 16 SHALL emit one `TransportArrived` event carrying the unit and the arrival location, and SHALL record the arrival in tick scratch for later phases.

Source: ARCH-14.2, TDS-17

#### Scenario: Arrival emits one event
- **WHEN** a unit reaches a path location
- **THEN** phase 16 emits `TransportArrived` with that unit and location

### Requirement: Abstract transfer parity
A unit with `movement.mode: abstract` SHALL follow the same route planning, traversal-time, arrival, and event contract as a physical unit.

Source: ARCH-14.2

#### Scenario: Abstract and physical units arrive on the same tick
- **WHEN** two otherwise identical units differ only in `mode`
- **THEN** both arrive on the same tick and emit the same arrival event
