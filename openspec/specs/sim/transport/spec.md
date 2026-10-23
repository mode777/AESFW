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

### Requirement: Transport order commands
The command layer SHALL accept `CreateTransportOrder`, `ModifyTransportOrder`, `DeleteTransportOrder`, `AssignTransport`, and `UnassignTransport`. Creation SHALL allocate an order entity owned by the acting owner. Modification SHALL replace the order specification and reset assigned units' cursors. Deletion SHALL unassign every assigned unit and remove the order. Assignment SHALL require a unit with cargo and movement and an existing order; unassignment SHALL clear the unit's assignment, route, and movement path.

Source: ARCH-7.3, GDD-15.2, TDS-16.2

#### Scenario: A created order can be assigned
- **WHEN** an owner creates a route order and assigns a transport unit to it
- **THEN** both commands are applied and the unit carries the order assignment

#### Scenario: Deleting an order unassigns its units
- **WHEN** an assigned order is deleted
- **THEN** the unit has no order assignment and the order entity is removed

#### Scenario: A malformed order is rejected
- **WHEN** a create command has no stations
- **THEN** the command is rejected without allocating an order entity

### Requirement: Route order execution
An assigned route order SHALL execute its stations in order. At each station the unit SHALL perform the station's actions in order. After the last action of the last station, a repeating order SHALL return to station `0`; a non-repeating order SHALL unassign the unit.

Source: GDD-15.2, GDD-15.5, GDD-15.6

#### Scenario: A two-station order loads, travels, and unloads
- **WHEN** a unit loads at station A, travels to station B, and unloads there
- **THEN** the cargo ends empty and the destination inventory holds the loaded quantity

#### Scenario: A repeating order returns to the first station
- **WHEN** the last action of the last station completes and `repeat` is true
- **THEN** the station cursor returns to station `0` and the unit remains assigned

### Requirement: Station planning and handling
Phase 14 SHALL plan a path from the unit's current location to the current station when no leg is active. Phase 16 SHALL stage load and unload transfers for units docked at the current station, limited by the action target, the handling rate, and the unit's throughput grant. Phase 19 SHALL commit staged transfers through the transaction writer and emit `TransportLoaded` or `TransportUnloaded`.

Source: ARCH-14.4, GDD-15.2, GDD-15.4, GDD-15.1, TDS-11.1

#### Scenario: Loading withdraws from the origin inventory
- **WHEN** a load action stages `10` units and phase 19 commits
- **THEN** the origin inventory decreases by `10` and cargo increases by `10`

#### Scenario: Unloading deposits into the destination inventory
- **WHEN** an unload action stages `10` units and phase 19 commits
- **THEN** cargo decreases by `10` and the destination inventory increases by `10`

#### Scenario: A destination with no capacity keeps the cargo
- **WHEN** a deposit fails because the destination inventory is full
- **THEN** the cargo is unchanged

### Requirement: Handling throughput participation
Phase 09 SHALL collect a handling request for each docked unit with a pending load or unload action, equal to the smaller of the remaining action quantity and the handling rate. Phase 10 SHALL allocate it through the location's throughput pool, and phase 16 SHALL scale the handling rate by the granted throttle.

Source: GDD-15.1, TDS-11.3, ARCH-5.2

#### Scenario: Throttled handling moves the granted quantity
- **WHEN** the handling rate is `10` and the location grants `500` permille
- **THEN** phase 16 stages `5` units

#### Scenario: An unbounded location handles at full rate
- **WHEN** the location has no throughput pool
- **THEN** phase 16 stages the full handling rate

### Requirement: Transport failure policies
A failed path or handling action SHALL apply the order's configured policy. `skip` SHALL advance the action, `retry` and `wait` SHALL leave the unit at the station, `return` SHALL reset the cursor to the first station, `fail` SHALL unassign the unit, and `retain` SHALL keep cargo that cannot be unloaded.

Source: GDD-15.7, CONT-9

#### Scenario: A path failure with skip advances the station
- **WHEN** no path to the current station exists and `path_unavailable` is `skip`
- **THEN** the cursor advances to the next action or station

#### Scenario: A path failure with retry waits
- **WHEN** no path exists and `path_unavailable` is `retry`
- **THEN** the unit stays assigned at its current location

#### Scenario: A failed unload with retain keeps the cargo
- **WHEN** cargo cannot be unloaded and `cargo_cannot_unload` is `retain`
- **THEN** the cargo remains in the unit

### Requirement: Quantity rule targets
A station action SHALL compute its target quantity from its rule. For a load, the rule SHALL measure the origin inventory and the cargo's free capacity; for an unload, it SHALL measure the cargo and the destination inventory. The target SHALL never exceed the available quantity on the acting side.

Source: GDD-15.3

#### Scenario: Fixed uses the configured quantity
- **WHEN** a load uses `fixed` with quantity `30` and the origin holds `100`
- **THEN** the target is `30`

#### Scenario: Up to capacity uses cargo space
- **WHEN** a load uses `up_to_capacity`, cargo has `150` of `200`, and the origin holds `100`
- **THEN** the target is `50`

#### Scenario: All carried unloads the cargo
- **WHEN** an unload uses `all` and cargo holds `40`
- **THEN** the target is `40`

### Requirement: Reserve and deficit rules
`excess_above` and `maintain_origin_minimum` SHALL leave the configured quantity on the acting side. For a load they leave that quantity in the origin inventory; for an unload they leave it in cargo. `deficit_below` and `maintain_destination_target` SHALL move only the quantity needed to reach the configured target: for an unload the destination inventory, and for a load the cargo.

Source: GDD-15.3

#### Scenario: Excess above origin reserve leaves the reserve
- **WHEN** a load uses `excess_above` with quantity `70` and the origin holds `100`
- **THEN** the target is `30`

#### Scenario: Deficit below destination target fills the deficit
- **WHEN** an unload uses `deficit_below` with quantity `70`, the destination holds `50`, and cargo holds `40`
- **THEN** the target is `20`

#### Scenario: Maintain destination target does nothing when already met
- **WHEN** an unload uses `maintain_destination_target` with quantity `70` and the destination holds `80`
- **THEN** the target is `0`

### Requirement: Priority list
`priority_list` SHALL choose the first configured quantity that can be fully moved on the acting side. If no quantity fits, the target SHALL be `0`.

Source: GDD-15.3

#### Scenario: The first fitting quantity wins
- **WHEN** a load lists `[80, 40, 10]`, the origin holds `50`, and cargo free space is `100`
- **THEN** the target is `40`

#### Scenario: No fitting quantity yields zero
- **WHEN** an unload lists `[80, 40]` and cargo holds `20`
- **THEN** the target is `0`
