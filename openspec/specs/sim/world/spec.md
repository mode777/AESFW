# sim/world Specification

## Purpose
World definitions make the sector graph explicit: multiple locations, multiple owners, and the connection instances that later transport systems traverse. Location activation is a command so a session can suspend and resume a location without destroying its state.

## Requirements

### Requirement: World plan selection
The content layer SHALL derive a world plan from a named world definition when one is requested, and from the first world definition in ascending definition-ID order when no id is requested. When the content defines no world, it SHALL derive the existing default plan from initially active location templates and one owner.

Source: CONT-6.6, GDD-6.1

#### Scenario: A named world definition supplies the plan
- **WHEN** content defines world `test.world.alpha` with two locations and world `test.world.beta` with one
- **THEN** selecting `test.world.alpha` yields a plan with two locations

#### Scenario: No world definition keeps the default plan
- **WHEN** content defines one initially active location template and no world definition
- **THEN** the derived plan has one location owned by owner handle `0`

#### Scenario: An unknown world id is a diagnostic
- **WHEN** a caller selects world `test.world.missing`
- **THEN** the content layer reports `unknown_world` and returns no plan

### Requirement: World locations and owners
A world definition SHALL instantiate every listed location from its template in ascending world-location ID order, and SHALL instantiate every listed owner in ascending owner-ID order as handles `0..n-1`. Each location SHALL belong to the owner that lists it in `established_locations`, or to handle `0` when no owner establishes it. Owner `initial_resources` SHALL become account entries ordered by ascending resource handle, and `established_locations` and `known_locations` SHALL seed knowledge at `established` and `discovered` respectively.

Source: CONT-6.6, GDD-6.1, GDD-16.1

#### Scenario: Two owners receive their declared locations and resources
- **WHEN** a world declares owners `owner.a` and `owner.b`, owner `owner.a` has `1000` of `test.resource.credits`, and each owner has one location
- **THEN** handle `0` owns the first location with a `1000` account and handle `1` owns the second

#### Scenario: Knowledge is seeded from the world definition
- **WHEN** an owner lists one location in `established_locations` and another in `known_locations`
- **THEN** the owner's knowledge is `established` and `discovered` for those locations

### Requirement: Connection instances
A world definition SHALL create one connection instance per declared connection. The instance SHALL carry the connection definition handle, origin and destination locations, direction, base traversal duration, enabled state, and allowed transport tags. A bidirectional connection SHALL be present on both endpoint locations; a one-way connection SHALL be present only on its origin.

Source: CONT-6.5, CONT-6.6, GDD-6.3

#### Scenario: A bidirectional connection appears at both endpoints
- **WHEN** a world declares one bidirectional connection from location `A` to location `B`
- **THEN** location `A` and location `B` each list the connection, with the same definition and duration

#### Scenario: A one-way connection appears only at its origin
- **WHEN** a world declares a one-way connection from location `A` to location `B`
- **THEN** location `A` lists the connection and location `B` does not

#### Scenario: An instance overrides the definition duration
- **WHEN** a connection definition declares `base_duration_ticks: 100` and the world instance declares `base_duration_ticks: 300`
- **THEN** the runtime connection's base traversal duration is `300`

### Requirement: Location activation command
Phase 01 SHALL apply `ActivateLocation` and `DeactivateLocation` to the target location's `active` flag. The command SHALL be rejected with `unknown_location` when the target is not a location and with `not_owner` when the acting owner is not the location's owner. Repeating the current state SHALL be an applied no-op.

Source: GDD-6.2, ARCH-7.3, TDS-16.1

#### Scenario: The owner deactivates and reactivates a location
- **WHEN** the owner of an active location submits `DeactivateLocation` and later `ActivateLocation`
- **THEN** phase 01 sets `active` to `false` and then `true`

#### Scenario: A non-owner cannot deactivate a location
- **WHEN** owner handle `1` submits `DeactivateLocation` for a location owned by handle `0`
- **THEN** phase 01 rejects the command with `not_owner` and leaves the location active

#### Scenario: An unknown location is rejected
- **WHEN** a command names an entity with no location component
- **THEN** phase 01 rejects it with `unknown_location`

### Requirement: Inactive locations stop configurable processes
An inactive location SHALL retain its state but its producers and sources SHALL be excluded from throughput requests and production advancement. Reactivation SHALL allow them to resume on the next tick.

Source: GDD-6.2, ARCH-5.2

#### Scenario: Deactivation suspends production
- **WHEN** a producer is active at a location and the location is deactivated
- **THEN** phase 09 collects no throughput request for that producer and its progress does not advance

#### Scenario: Reactivation resumes production
- **WHEN** the same location is reactivated
- **THEN** the producer is eligible for requests and progress on the following tick
