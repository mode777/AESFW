# Spec Delta

## Purpose

The worker session host serves the planning read model through the generic query path (PIC-10.5, TDS-21.1).

## ADDED Requirements

### Requirement: Planning query through the web host
The worker session host SHALL answer a `query` request whose `kind` is `planning` by evaluating the application-layer `planningMetrics` for the session's actor and posting a `query_result` whose `result.planning` is the `PlanningDto`. The query SHALL NOT mutate authoritative state. A malformed `planning` query SHALL post an empty `result`, consistent with an unknown `kind`.

Source: PIC-10.5, TDS-21.1

#### Scenario: A planning query returns the read model
- **WHEN** the host receives `{ kind: 'query', protocol_version: 1, actor_id: 'test.owner.1', query: { kind: 'planning' } }` for a session with an actor
- **THEN** it posts a `query_result` whose `result.planning.owner_id` is the actor's owner id

#### Scenario: A planning query in a session-less worker returns empty
- **WHEN** the host receives a `planning` query before `init`
- **THEN** it posts a `query_result` whose `result` is `{}`
