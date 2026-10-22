# Spec Delta

## ADDED Requirements

### Requirement: Placement query through the web host

The worker session host SHALL answer a `query` request whose `kind` is `placement_query` by parsing `definition_id`, `location_id`, and `logical_transform` into a `PlacementQueryDto`, evaluating the application-layer `placementQuery` against the current session world and revision, and posting a `query_result` whose `result.placement_result` is the resulting `PlacementResultDto`. The query SHALL NOT mutate authoritative state.

Source: PIC-12.1, TDS-21.1

#### Scenario: A valid placement query returns a valid result
- **WHEN** the host receives `{ kind: 'query', protocol_version: 1, actor_id: 'test.owner.1', query: { kind: 'placement_query', definition_id: 'test.entity.builder', location_id: 1, logical_transform: { position: [1, 1], orientation: 0 } } }` and the world holds an active `4` by `4` grid location with a free cell at `(1, 1)`
- **THEN** it posts a `query_result` whose `result.placement_result.valid` is `true` and whose `reasons` are empty

#### Scenario: A rejected placement query returns its reasons
- **WHEN** the host receives the same `placement_query` with `logical_transform.position` `[0, 0]` at a location whose cell `(0, 0)` is blocked
- **THEN** it posts a `query_result` whose `result.placement_result.valid` is `false` and whose `reasons[0].code` is `not_buildable`

### Requirement: Malformed placement query

A `placement_query` payload missing any required field, or carrying a non-integer `location_id` or malformed `logical_transform`, SHALL post a `query_result` with an empty `result`, consistent with an unknown `kind`.

Source: PIC-12.1, TDS-21.1

#### Scenario: A malformed placement query returns an empty result
- **WHEN** the host receives `{ kind: 'query', protocol_version: 1, actor_id: 'test.owner.1', query: { kind: 'placement_query', location_id: 1 } }` with no `definition_id` or `logical_transform`
- **THEN** it posts a `query_result` whose `result` is `{}`
