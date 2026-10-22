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

### Requirement: Grid spatial policy and registry
The `framework.spatial.grid` policy SHALL be resolvable through the spatial-policy registry. Its `capacity` SHALL report the location's buildable cell count as total, its occupied cell count as used, and the non-negative difference as free. Its count-based `validatePlacement` SHALL reject `unknown_location`, `location_inactive`, and `insufficient_capacity`.

Source: GDD-6.1, ARCH-11, CONT-6.4, TDS-13

#### Scenario: The grid policy resolves
- **WHEN** `resolveSpatialPolicy('framework.spatial.grid')` is evaluated
- **THEN** it returns the grid policy, whose id is `framework.spatial.grid`

#### Scenario: Grid capacity is reported
- **WHEN** a `test.location.grid` of `4` by `4` cells has `4` blocked cells and `3` occupied cells
- **THEN** total is `12`, used is `3`, and free is `9`

#### Scenario: A count beyond capacity is rejected
- **WHEN** a grid location with total `12` and used `3` validates a footprint count of `10`
- **THEN** the result is `insufficient_capacity`

#### Scenario: An unknown grid location is rejected
- **WHEN** an entity without a location component validates any footprint count
- **THEN** the result is `unknown_location`

### Requirement: Location grid geometry and buildable mask
A grid location SHALL carry its grid width, height, and buildable mask: the set of non-buildable cells, either fixed (an explicit set) or seeded (generated deterministically from the world seed and the location entity ID). A cell SHALL be buildable when it is inside the grid and not blocked. A placement whose cells are outside the grid SHALL be rejected with `out_of_bounds`; a placement overlapping a blocked cell SHALL be rejected with `not_buildable`.

Source: GDD-6.1, CONT-6.4, ARCH-11

#### Scenario: A fixed mask blocks its declared cells
- **WHEN** a `4` by `4` grid location declares blocked cells `[0, 1, 4, 5]`
- **THEN** cell `(0, 0)` is not buildable and cell `(2, 2)` is buildable

#### Scenario: A seeded mask is deterministic
- **WHEN** two fresh worlds with the same seed instantiate the same seeded grid plan
- **THEN** both locations carry the same blocked-cell set and the two worlds have identical state hashes

#### Scenario: A cell outside the grid is not buildable
- **WHEN** a `4` by `4` grid location validates a placement covering cell `(4, 0)`
- **THEN** the result is `out_of_bounds`

#### Scenario: A blocked cell rejects placement
- **WHEN** a `4` by `4` grid location with blocked cell `(0, 0)` validates a `1` by `1` placement at `(0, 0)`
- **THEN** the result is `not_buildable`

### Requirement: Footprint and orientation
A placed entity SHALL carry a footprint of width by height cells and an orientation of `0`, `1`, `2`, or `3` quarter turns. Its occupied cells SHALL be the footprint rectangle rotated by the orientation about its top-left anchor: orientations `0` and `2` occupy width by height, orientations `1` and `3` occupy height by width. A placement overlapping another entity's occupied cell SHALL be rejected with `occupied`.

Source: GDD-6.1, ARCH-11, CONT-6.8

#### Scenario: Orientation rotates the footprint
- **WHEN** a `2` by `3` footprint is placed at `(1, 1)` with orientation `1`
- **THEN** its occupied cells are the `3` by `2` rectangle anchored at `(1, 1)`

#### Scenario: An overlapping placement is rejected
- **WHEN** an entity occupies the cells anchored at `(1, 1)` and a second `1` by `1` placement targets `(1, 1)`
- **THEN** the result is `occupied`

#### Scenario: A non-overlapping placement succeeds
- **WHEN** an entity occupies the cells anchored at `(1, 1)` and a second `1` by `1` placement targets `(3, 3)`
- **THEN** the result is `ok`

### Requirement: Occupancy cache is a derived cache
The occupied cells of each grid location SHALL be maintained as a derived cache in `world.caches.spatial`. The cache SHALL be excluded from saves and hashes, left dirty by `decodeWorld` and `cloneWorld`, and rebuilt in phase 04 from the authoritative transforms and footprints. Rebuilding the cache from scratch SHALL yield the same cache as incremental maintenance (INV-20).

Source: TDS-8.4, INV-20, ARCH-11

#### Scenario: The cache is excluded from the hash
- **WHEN** two worlds differ only in their derived spatial cache
- **THEN** their state hashes are identical

#### Scenario: Phase 04 rebuilds a dirty cache
- **WHEN** phase 04 runs on a world with a dirty cache and one placed entity
- **THEN** the cache lists the entity's occupied cells

#### Scenario: A full rebuild equals incremental maintenance
- **WHEN** a sequence of placements and removals is applied incrementally and the cache is then rebuilt from scratch
- **THEN** the rebuilt cache equals the incrementally maintained cache (INV-20)

#### Scenario: A clone leaves the cache dirty
- **WHEN** a world is cloned
- **THEN** the clone's cache is absent and `caches.dirty` is true

### Requirement: Distance and radius queries
The grid policy SHALL answer the distance between two placed entities under the `manhattan` and `chebyshev` metrics as a safe integer, or `null` when either entity has no transform. It SHALL answer whether a provider covers a consumer within a radius when the euclidean distance between their anchors is less than or equal to the radius.

Source: GDD-3.6, GDD-6.1, ARCH-11, CONT-6.12

#### Scenario: Manhattan distance
- **WHEN** entities are anchored at `(0, 0)` and `(3, 4)` and the metric is `manhattan`
- **THEN** the distance is `7`

#### Scenario: Chebyshev distance
- **WHEN** entities are anchored at `(0, 0)` and `(3, 4)` and the metric is `chebyshev`
- **THEN** the distance is `4`

#### Scenario: Euclidean coverage within radius
- **WHEN** a provider at `(0, 0)` and a consumer at `(3, 4)` are queried with radius `5`
- **THEN** the provider covers the consumer

#### Scenario: Euclidean coverage beyond radius
- **WHEN** a provider at `(0, 0)` and a consumer at `(3, 4)` are queried with radius `4`
- **THEN** the provider does not cover the consumer

#### Scenario: Distance to an unplaced entity
- **WHEN** the distance from an entity with a transform to an entity without one is queried
- **THEN** the result is `null`

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
