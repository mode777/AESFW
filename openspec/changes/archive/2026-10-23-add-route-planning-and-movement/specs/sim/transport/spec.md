# Spec Delta

## ADDED Requirements

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
