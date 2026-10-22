# Spec Delta

## MODIFIED Requirements

### Requirement: Projection delta
`diffProjection(prev, next)` SHALL return a `SnapshotDeltaDto` with `from_revision` equal to `prev.revision`, `to_revision` equal to `next.revision`, `tick` equal to `next.tick`, and `session_id` equal to `next.session_id`. It SHALL include an `entity_update` for every entity whose projected form differs between `prev` and `next`, including a change to its `spatial` or `connectivity` object, and an `inventory_update` for every inventory entry whose `stored` or `reserved` differs. It SHALL NOT include entries that are unchanged.

Source: PIC-9.2, TDS-18.4

#### Scenario: An unchanged projection yields an empty delta
- **WHEN** `diffProjection(p, p)` is computed
- **THEN** `entity_updates` and `inventory_updates` are empty and `from_revision` equals `to_revision`

#### Scenario: A changed field appears in the delta
- **WHEN** an entity's production `progress` changes between two projections
- **THEN** the delta has an `entity_update` for that entity with component `production`

#### Scenario: A connectivity change appears in the delta
- **WHEN** an entity's connectivity `connected` changes from `false` to `true` between two projections
- **THEN** the delta has an `entity_update` for that entity with component `connectivity` and field `connectivity`

## ADDED Requirements

### Requirement: Location grid projection
`project(session, actor)` SHALL set `LocationDto.grid` to `{ width, height, blocked }` for every grid-policy location, where `blocked` lists the packed cell indices (`y * width + x`) in ascending order, and SHALL omit `grid` for an abstract-capacity location. The field is part of the per-actor projection and SHALL be subject to fog filtering when row 8.4 lands; this change applies no fog filtering.

Source: PIC-9.1, PIC-9.3, PIC-10.2, CONT-6.4, TDS-18.4

#### Scenario: A grid location exposes its geometry
- **WHEN** a grid location with `width` `4`, `height` `3`, and blocked cells `[1, 6]` is projected
- **THEN** its `grid` is `{ width: 4, height: 3, blocked: [1, 6] }`

#### Scenario: An abstract location omits the grid
- **WHEN** an abstract-capacity location with no grid is projected
- **THEN** its `grid` is `undefined`

#### Scenario: The grid is projected per actor
- **WHEN** the same world is projected for actor `test.owner.1` and for actor `test.owner.2`
- **THEN** both projections carry the location's `grid` (no fog filtering is applied in this change)

### Requirement: Entity spatial projection
`project(session, actor)` SHALL set `EntityDto.spatial` for an entity carrying a logical transform to `{ logical_position: [x, y], orientation, footprint }`, where `footprint` is `{ width, height }` when the entity has a footprint and is omitted otherwise, and SHALL omit `spatial` for an entity with no logical transform.

Source: PIC-9.1, TDS-18.4, GDD-6.1, ARCH-11

#### Scenario: A placed entity exposes its transform and footprint
- **WHEN** an entity at logical position `[10, 12]`, orientation `1`, and footprint `[2, 3]` is projected
- **THEN** its `spatial` is `{ logical_position: [10, 12], orientation: 1, footprint: { width: 2, height: 3 } }`

#### Scenario: A placed entity without a footprint still exposes its position
- **WHEN** an entity with a logical transform but no footprint component is projected
- **THEN** its `spatial.logical_position` is present and its `spatial.footprint` is `undefined`

#### Scenario: An unplaced entity omits spatial
- **WHEN** an entity with no logical transform is projected
- **THEN** its `spatial` is `undefined`

### Requirement: Entity connectivity projection
`project(session, actor)` SHALL set `EntityDto.connectivity` for an entity carrying a connectivity node to `{ role, network, connected }`, where `role` is `provider` or `requirement`, `network` is the node's network string ID, and `connected` is the core `isConnected` result for the entity, and SHALL omit `connectivity` for an entity with no connectivity node.

Source: PIC-9.1, PIC-10.2, GDD-9.2, GDD-9.9

#### Scenario: A connected requirement is exposed
- **WHEN** an entity carries a `requirement` node for network `test.connectivity.hub` in a location whose hub provides connectivity
- **THEN** its `connectivity` is `{ role: 'requirement', network: 'test.connectivity.hub', connected: true }`

#### Scenario: An unconnected requirement is exposed
- **WHEN** an entity carries a `requirement` node for network `test.connectivity.hub` in a location with no hub and no provider
- **THEN** its `connectivity` is `{ role: 'requirement', network: 'test.connectivity.hub', connected: false }`

#### Scenario: A provider is exposed
- **WHEN** an entity carries a `provider` node for network `test.connectivity.hub`
- **THEN** its `connectivity.role` is `'provider'`

#### Scenario: An entity without a node omits connectivity
- **WHEN** an entity carries no connectivity node is projected
- **THEN** its `connectivity` is `undefined`
