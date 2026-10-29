## ADDED Requirements

### Requirement: Entity creation and removal in deltas
`diffProjection(prev, next)` SHALL report each entity present in `next` but absent from `prev` as a whole entity DTO in `entity_creates`, ascending by entity ID. It SHALL report each entity present in `prev` but absent from `next` by ID in `entity_removals`, ascending. Each list SHALL be omitted when empty. An entity that becomes visible or invisible under fog SHALL be reported the same way.

Source: PIC-9.2, PIC-9.3, TDS-18.4, amendment A17

#### Scenario: A placed entity is reported as created
- **WHEN** a `PlaceEntityPlan` for `test.entity.a` at location `1` is accepted, the session steps one tick, and the projection before the step is diffed against the projection after it
- **THEN** the delta's `entity_creates` contains exactly one entity, whose `definition_id` is `test.entity.a` and whose `location_id` is `1`

#### Scenario: A removed entity is reported by ID
- **WHEN** the previous projection contains entities `7` and `9` and the next projection contains only entity `7`
- **THEN** the delta's `entity_removals` is `[9]` and the delta has no `entity_creates` key

#### Scenario: Created entities are ordered by entity ID
- **WHEN** the next projection adds entities `12` and `10` that the previous projection lacks
- **THEN** the delta's `entity_creates` lists entity `10` before entity `12`

#### Scenario: A delta without creations or removals omits both lists
- **WHEN** two consecutive projections contain the same entity IDs
- **THEN** the delta has neither an `entity_creates` nor an `entity_removals` key

#### Scenario: Discovery reveals entities as creations
- **WHEN** fog is enabled and a location holding entity `20` changes from `unknown` to `discovered` for the actor between two projections
- **THEN** the delta's `entity_creates` contains entity `20`

### Requirement: Applying entity creation and removal
`applyDelta(base, delta)` SHALL remove every entity listed in `entity_removals` and insert every entity in `entity_creates` before applying `entity_updates`, keeping the result's entities ascending by entity ID. Property P-10 SHALL hold for projection pairs whose entity sets differ.

Source: PIC-18, 06 §9 P-10, amendment A17

#### Scenario: A created entity is inserted in ID order
- **WHEN** a base with entities `5` and `9` receives a delta whose `entity_creates` holds entity `7`
- **THEN** the result's entity IDs are `[5, 7, 9]`

#### Scenario: A removed entity is dropped
- **WHEN** a base with entities `5` and `9` receives a delta whose `entity_removals` is `[9]`
- **THEN** the result's entity IDs are `[5]`

#### Scenario: Round-trip holds across creation and removal
- **WHEN** the P-10 property test generates projection pairs in which entities are added, removed, and updated within one step, and computes `applyDelta(p_n, diffProjection(p_n, p_{n+1}))`
- **THEN** every result deep-equals `p_{n+1}`

### Requirement: Removed entity fields
When an entity field present in `prev` is absent in `next`, `diffProjection` SHALL report it as an entity update whose field value is `null`. `applyDelta` SHALL delete that key from the entity instead of storing `null`, so P-10 holds when an optional field disappears.

Source: PIC-9.2, PIC-18, 06 §9 P-10

#### Scenario: A disappearing field is deleted
- **WHEN** entity `4` has a `production` field in `p_n` and none in `p_{n+1}`, and `applyDelta(p_n, diffProjection(p_n, p_{n+1}))` is computed
- **THEN** entity `4` in the result has no `production` key and the result deep-equals `p_{n+1}`

### Requirement: Transport summary in deltas
`diffProjection(prev, next)` SHALL compare an entity's `transport` summary like its other projected fields, and SHALL report a changed summary as an entity update whose `component` is `transport`.

Source: PIC-9.2, PIC-10.4, TDS-18.4

#### Scenario: A transport state change is reported
- **WHEN** an entity's `transport.state` changes from `waiting` to `moving` between two projections
- **THEN** the delta's `entity_updates` contains an update with `component` `transport` whose fields carry `state: moving`

#### Scenario: An unchanged transport summary is not re-sent
- **WHEN** an entity's `transport` summary is identical in two consecutive projections
- **THEN** the delta contains no `transport` update for that entity

### Requirement: Entity location in snapshots
An entity's snapshot SHALL carry `location_id` whenever the entity is placed at a location, including entities without a producer, residence, or movement component, such as hubs, connectors, extractors, and storage modules. A moving transport SHALL keep reporting its current movement location. An entity with neither SHALL omit `location_id`.

Source: PIC-9.1, REF-12.2, TDS-18.4

#### Scenario: A placed entity without a producer carries its location
- **WHEN** a `test.entity.connector` definition with only placement and connectivity components is placed at location `1` at cell `[3, 4]`
- **THEN** its snapshot has `location_id: 1` and `spatial.logical_position: [3, 4]`

#### Scenario: An authored start entity carries its location
- **WHEN** a world authors an initial `test.entity.hub` at location `1`, position `{ x: 2, y: 2 }`
- **THEN** the hub's snapshot at tick `0` has `location_id: 1`

#### Scenario: An unplaced entity omits the location
- **WHEN** an entity has no logical transform and no movement
- **THEN** its snapshot has no `location_id` field

#### Scenario: Fog filters placed entities by their location
- **WHEN** fog is enabled and an entity of owner `test.owner.2` is placed at a location whose knowledge is `unknown` for actor `test.owner.1`
- **THEN** the projection for `test.owner.1` contains no entry for that entity
