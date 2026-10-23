# Spec Delta

## ADDED Requirements

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
