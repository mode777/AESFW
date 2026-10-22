# Spec Delta

## Purpose

The worker host answers read-model queries with the 2.4 read models (TDS-21.1).

## MODIFIED Requirements

### Requirement: Subscription and snapshots
On a `subscribe` request the host SHALL post a full `snapshot` response for the requested actor, and SHALL thereafter publish coalesced `delta` responses as ticks advance. A `command` request SHALL post a `command_result`. A `query` request SHALL post a `query_result` whose `result` is the read model named by the query's `kind`: `entity_detail` (an `EntityDetailDto`), `need_breakdown` (a `NeedBreakdownDto[]`), `location_summary` (a `LocationSummaryDto`), or `definition_metadata` (a `DefinitionMetadataDto[]`); an unknown `kind` SHALL post an empty object.

Source: TDS-21.1, PIC-10

#### Scenario: Subscribe yields a snapshot
- **WHEN** the host receives `{ kind: 'subscribe', protocol_version: 1, actor_id: 'test.owner.1' }`
- **THEN** it posts a `snapshot` response

#### Scenario: A command yields a result
- **WHEN** the host receives a `command` request
- **THEN** it posts a `command_result` response

#### Scenario: An entity-detail query yields a read model
- **WHEN** the host receives `{ kind: 'query', protocol_version: 1, actor_id: 'test.owner.1', query: { kind: 'entity_detail', entity_id: 3 } }`
- **THEN** it posts a `query_result` whose `result.entity_detail` carries entity `3`
