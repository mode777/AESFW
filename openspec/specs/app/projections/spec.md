# app/projections Specification

## Purpose

Per-actor projections, delta computation, and delta application for the presentation contract (TDS-18.4, PIC-9, PIC-18).

## Requirements

### Requirement: Full projection
`project(session, actor)` SHALL return a `SnapshotDto` carrying the session id, the world tick, the session revision, the content checksum, one owner entry per owner handle, one location entry per location entity, and one entity entry per non-location, non-inventory entity. Owner resource amounts SHALL be keyed by resource string ID. Locations SHALL list their inventories and inventory entries. Entity entries SHALL carry the entity's definition string ID, location, revision, lifecycle, and production state when the entity has those components. Owners SHALL be ordered by ascending owner handle and locations and entities by ascending entity ID. Fog filtering is not applied in this change.

Source: TDS-18.4, PIC-9.1, ARCH-8.2

#### Scenario: A projection contains the owner, location, and entity
- **WHEN** a world with one owner, one location with one inventory, and one producer entity is projected
- **THEN** the snapshot has one owner, one location with one inventory, and one entity with the producer's `definition_id`

#### Scenario: Projection order is ascending entity ID
- **WHEN** two entities with IDs `2` and `1` are projected
- **THEN** the `entities` array lists `1` before `2`

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

### Requirement: Delta application
`applyDelta(base, delta)` SHALL return a new `SnapshotDto` equal to the projection the delta was computed against, by applying every `entity_update` and `inventory_update` to a copy of `base` and setting `revision` to `delta.to_revision` and `tick` to `delta.tick`. It SHALL leave entries the delta does not mention unchanged. Property P-10 SHALL hold: applying `diffProjection(p_n, p_{n+1})` to `p_n` yields `p_{n+1}` exactly.

Source: PIC-18, 06 §9 P-10

#### Scenario: Applying a delta round-trips
- **WHEN** `applyDelta(p_n, diffProjection(p_n, p_{n+1}))` is computed
- **THEN** it deep-equals `p_{n+1}`

#### Scenario: A delta for another base is not applicable
- **WHEN** `canApplyDelta(base, delta)` is called with a `delta.from_revision` different from `base.revision`
- **THEN** it returns `false`

### Requirement: Resynchronization rule
`canApplyDelta(base, delta)` SHALL return `true` only when `delta.session_id` equals `base.session_id` and `delta.from_revision` equals `base.revision`. When it returns `false`, the client SHALL request a full snapshot and replace its projection (PIC-18).

Source: PIC-18, ARCH-8.2

#### Scenario: A matching base can apply
- **WHEN** a delta with `from_revision` `5` is checked against a projection with `revision` `5`
- **THEN** `canApplyDelta` returns `true`

#### Scenario: A mismatched session cannot apply
- **WHEN** a delta from `session.2` is checked against a projection from `session.1`
- **THEN** `canApplyDelta` returns `false`

### Requirement: Definition metadata read model
`definitionMetadata(content, type)` SHALL return one `DefinitionMetadataDto` per compiled definition of `type`, ordered by ascending definition ID, carrying the definition's string ID, its type, its tags, its data as `parameters`, and an empty `commands` list. It SHALL NOT expose behaviour a client could mistake for authority.

Source: PIC-4, TDS-18.4

#### Scenario: Entity metadata carries its tags
- **WHEN** the content has one entity definition `test.entity.residence` tagged `test.tag.a`
- **THEN** `definitionMetadata(content, 'entity')` returns one entry with `definition_id` `test.entity.residence` and `tags` `['test.tag.a']`

### Requirement: Entity detail read model
`entityDetail(session, entity)` SHALL return an `EntityDetailDto` for an entity that has a `definition` component, a producer, or a residence, and `null` otherwise. The DTO SHALL carry the entity ID, definition ID, lifecycle (`active` when unset), location, owner, `enabled` (`true` when unset), the four available commands, production state and block reasons when the entity is a producer, and the population, satisfaction, and band when the entity is a residence.

Source: PIC-10.1, TDS-18.4

#### Scenario: A residence detail reports its population
- **WHEN** a residence entity with population `50` and satisfaction `800` is inspected
- **THEN** the detail's `residence.population` is `50` and `residence.satisfaction` is `800`

#### Scenario: An unknown entity has no detail
- **WHEN** `entityDetail` is called for an entity with no components
- **THEN** it returns `null`

### Requirement: Location summary read model
`locationSummary(session, actor, location)` SHALL return a `LocationSummaryDto` for a location entity and `null` otherwise, carrying knowledge, active state, inventory totals per resource, population totals per tier, an entity count, and the connection list (empty in M2).

Source: PIC-10.2, TDS-18.4

#### Scenario: A location summary totals its population
- **WHEN** a location holds a residence with population `50` of tier `test.tier.a`
- **THEN** the summary's `population_by_tier['test.tier.a']` is `50` and its entity count is `1`

#### Scenario: A non-location has no summary
- **WHEN** `locationSummary` is called for an entity with no location component
- **THEN** it returns `null`

### Requirement: Need breakdown read model
`needBreakdown(session, entity)` SHALL return one `NeedBreakdownDto` per need of a residence, and an empty array otherwise. Each entry SHALL carry the need ID, demand, delivered (the latest window value), fulfillment in permille (`1000` when demand is `0`, otherwise `min(1000, floor(delivered × 1000 / demand))`), the category ID, and the category result.

Source: PIC-10.3, TDS-18.4

#### Scenario: Fulfillment is computed from the window
- **WHEN** a need has demand `1000` and a latest window value of `800`
- **THEN** the breakdown entry's `fulfillment` is `800`

#### Scenario: A non-residence has no needs
- **WHEN** `needBreakdown` is called for a location entity
- **THEN** it returns an empty array

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
