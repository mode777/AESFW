# Spec Delta

## Purpose

Owner knowledge state (GDD-16.1) makes expansion a decision under incomplete information (GDD-16.2): a location's attributes exist authoritatively but belong to an owner only once a transport unit of that owner arrives there. Explore orders are the minimal instrument of that arrival.

## ADDED Requirements

### Requirement: Knowledge state
Every owner SHALL have a knowledge state of `unknown`, `discovered`, or `established` per location, stored in ascending location-ID order. The state SHALL be authoritative, deterministic, and saved, and unknown locations SHALL keep their attributes in the simulation while reads remain full (fog filtering is row 8.4).

Source: GDD-16.1, TDS-8.1

#### Scenario: A seeded owner starts established and discovered
- **WHEN** a world definition lists one location in `established_locations` and another in `known_locations`
- **THEN** the owners' knowledge is `established` and `discovered` for those locations and every other location is unknown

#### Scenario: Knowledge is preserved across save and reload
- **WHEN** a world with a discovered location is encoded and decoded
- **THEN** the decoded owners carry the same knowledge entries in the same order

### Requirement: Discovery on arrival
Phase 18 SHALL raise the knowledge of the owner of every arriving transport unit to at least `discovered` for the arrival location, processing arrivals in ascending unit order. A state of `established` SHALL never decrease, and an arrival that does not raise the state SHALL emit nothing. A transition from `unknown` SHALL emit a `LocationDiscovered` event naming the owner and location.

Source: GDD-16.1, ARCH-14.4, ARCH-5.2

#### Scenario: An arrival discovers an unknown location
- **WHEN** a transport unit of owner `0` arrives at a location unknown to owner `0` and phase 18 runs
- **THEN** owner `0`'s knowledge of the location is `discovered` and a `LocationDiscovered` event names owner `0` and the location

#### Scenario: An established location stays established
- **WHEN** a unit of the owning owner arrives at a location it has established
- **THEN** the knowledge stays `established` and no event is emitted

#### Scenario: A repeat arrival emits nothing
- **WHEN** a unit of owner `0` arrives twice at a location owner `0` already discovered
- **THEN** only the first arrival emits `LocationDiscovered`

#### Scenario: A non-arriving tick leaves knowledge unchanged
- **WHEN** phase 18 runs on a tick with no transport arrivals
- **THEN** no owner's knowledge changes

### Requirement: Explore orders traverse without handling
The `explore` order mode SHALL be planned and advanced like a route order, with arrival advancing the station cursor; explore stations SHALL request no handling and perform no load, unload, or transfer. An explore order SHALL be repeatable and SHALL use the same path policy as route orders.

Source: ARCH-14.4, GDD-15.2

#### Scenario: An explore order discovers both stations
- **WHEN** an explore order lists two stations unknown to the owner and the assigned unit runs the route to completion
- **THEN** the unit visits both stations in order and both locations are `discovered`

#### Scenario: An explore order requests no handling
- **WHEN** phase 09 collects throughput requests while an explore unit is docked at a station
- **THEN** no request is collected for that unit

### Requirement: INV-14 knowledge monotonicity
The invariant harness SHALL check after every tick that, per owner and location, the knowledge level never decreases (`unknown < discovered < established`) unless the configuration explicitly allows it, and that each owner's knowledge entries stay sorted by ascending location ID without duplicates.

Source: INV-14, GDD-16.1

#### Scenario: A downgrade is reported
- **WHEN** a system lowers an owner's knowledge from `established` to `discovered` across a tick
- **THEN** `checkInvariants` reports an INV-14 finding naming the owner and location
