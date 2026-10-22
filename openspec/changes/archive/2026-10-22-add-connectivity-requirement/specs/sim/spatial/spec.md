# Spec Delta

## ADDED Requirements

### Requirement: Connectivity provider and requirement components
A `connectivityNode` component SHALL be either a `provider` node or a `requirement` node, each naming a connectivity network. An entity SHALL carry at most one connectivity node. A requirement node SHALL be readable through the world, and a provider node SHALL mark an entity that extends connectivity.

Source: GDD-9.2, GDD-9.9

#### Scenario: A requirement node names its network
- **WHEN** `test.entity.refiner` carries a `connectivityNode` requirement naming `test.connectivity.hub`
- **THEN** its connectivity node reports role `requirement` and network `test.connectivity.hub`

#### Scenario: A provider node names its network
- **WHEN** `test.entity.connector` carries a `connectivityNode` provider naming `test.connectivity.hub`
- **THEN** its connectivity node reports role `provider` and network `test.connectivity.hub`

#### Scenario: An entity without a node has no requirement
- **WHEN** an entity carries no `connectivityNode`
- **THEN** it has no connectivity requirement

### Requirement: Location hub is the connectivity root
An active location that carries a `locationHub` component SHALL be the connectivity root of its own location. When a location has no hub, its lowest-ID connectivity provider SHALL act as the root. An inactive location SHALL have no connectivity root.

Source: GDD-9.9, ARCH-11

#### Scenario: The hub roots its location
- **WHEN** active location `1` carries a `locationHub`
- **THEN** the connectivity group for location `1` has root `1`

#### Scenario: A provider roots a hub-less location
- **WHEN** active location `1` has no `locationHub` and a provider is placed at entity `3`
- **THEN** the connectivity group for location `1` has root `3`

#### Scenario: An inactive location has no root
- **WHEN** location `1` is inactive
- **THEN** the connectivity cache has no group for location `1`

### Requirement: Binary hub access and connectivity groups
An entity that carries a connectivity requirement SHALL be connected iff its location has a connectivity root and at least one connectivity provider. The connectivity group of a rooted location SHALL list its root and, in ascending entity ID, the location's connectivity providers and — only when at least one provider is present — its requiring entities. An entity with no location SHALL not be connected. No graded or range-based connectivity SHALL be modeled.

Source: GDD-10.2, GDD-9.9

#### Scenario: A provider connects the location
- **WHEN** a requirer at entity `5` and a provider at entity `3` are at active location `1` with a hub
- **THEN** entity `5` is connected

#### Scenario: The hub alone does not connect a requirer
- **WHEN** a requirer at entity `5` is at active location `1` with a hub and no provider
- **THEN** entity `5` is not connected

#### Scenario: An unplaced requirer is not connected
- **WHEN** a requirer has no transform
- **THEN** it is not connected

#### Scenario: The group lists the root and members in ascending order
- **WHEN** active location `1` has a hub, providers at `3` and `4`, and requirers at `5` and `6`
- **THEN** the group's members are `[1, 3, 4, 5, 6]`

#### Scenario: Without a provider the group holds only the root
- **WHEN** active location `1` has a hub and a requirer at `5` but no provider
- **THEN** the group's members are `[1]`

### Requirement: Connectivity cache is a derived cache
The connectivity groups SHALL be maintained as a derived cache in `world.caches.connectivity`. The cache SHALL be excluded from saves and hashes, left dirty by `decodeWorld` and `cloneWorld`, and rebuilt in phase 04 from the authoritative `location`, `locationHub`, `transform`, and `connectivityNode` state. Rebuilding the cache from scratch SHALL yield the same cache as any prior build (INV-20). Groups SHALL be emitted in ascending location ID.

Source: TDS-8.4, ARCH-5.2, INV-20

#### Scenario: The cache is excluded from the hash
- **WHEN** two worlds differ only in their connectivity cache
- **THEN** their state hashes are identical

#### Scenario: Phase 04 rebuilds a dirty cache
- **WHEN** phase 04 runs on a world with a dirty cache, a hub, and a provider
- **THEN** the cache lists the location's group

#### Scenario: Groups are ordered by ascending location ID
- **WHEN** rooted locations at entities `1` and `2` each have a provider
- **THEN** the cache's groups are `[1, 2]` in that order

#### Scenario: A full rebuild equals the prior cache
- **WHEN** the connectivity cache is rebuilt from scratch twice
- **THEN** both caches are equal (INV-20)

#### Scenario: A clone leaves the cache dirty
- **WHEN** a world is cloned
- **THEN** the clone's connectivity cache is absent and `caches.dirty` is `true`

### Requirement: Connectivity query
The framework SHALL answer, for an entity, whether it is connected and the entities it is connected to. `connectedEntities(entity)` SHALL return the ascending members of the entity's connectivity group excluding the entity itself, or an empty list when the entity has no location or no group.

Source: ARCH-11, GDD-9.9

#### Scenario: The connected entities are reported
- **WHEN** active location `1` has a hub, a provider at `3`, and a requirer at `5`
- **THEN** `connectedEntities(5)` is `[1, 3]`

#### Scenario: An entity without a group has no connections
- **WHEN** an entity has no location
- **THEN** `connectedEntities` is empty

### Requirement: Connectivity gates inventory access
An entity that carries a connectivity requirement but is not connected SHALL have no inventory access. A producer in that state SHALL report `missing_inventory_access` as a static block reason in phase 07, in addition to a producer whose input or output inventory is absent.

Source: GDD-10.2, GDD-10.3

#### Scenario: A disconnected requiring producer reports missing_inventory_access
- **WHEN** a producer at entity `5` requires connectivity, has an input and output inventory, and its active location `1` has no provider
- **THEN** its static block reasons include `missing_inventory_access`

#### Scenario: A connected requiring producer has inventory access
- **WHEN** a producer at entity `5` requires connectivity, has inventories, and a provider is at its active location `1`
- **THEN** `missing_inventory_access` is not among its static block reasons

#### Scenario: A disabled disconnected requiring producer reports both reasons in order
- **WHEN** a disabled producer at entity `5` requires connectivity and is disconnected
- **THEN** its static block reasons are `['entity_disabled', 'missing_inventory_access']`
