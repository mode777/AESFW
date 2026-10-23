# Proposal

## Why

Roadmap 08, M6 item 6.1 (`add-world-definition-and-connections`). The framework can only instantiate the initially active location templates of one implicit owner, so GDD-6.2 activation and GDD-6.3 connections do not exist and M6 transport has no sector graph to run on. This change adds world definitions, multiple locations and owners, connection instances, and the `ActivateLocation`/`DeactivateLocation` commands, retiring the R-14 gap that multi-location behaviour was specified but unrepresentable.

## What Changes

- New content collections `connections` (CONT-6.5) and `worlds` (CONT-6.6). A world definition names locations, connection instances, owners, initial resources, knowledge, and initial entities.
- A world plan is derived from a world definition. When no world definition exists, the existing default plan (one owner, initially active templates) is unchanged. Scenario setup and the web host select an explicit world id or the first defined world.
- `WorldPlan` gains optional owners, per-location owners, and connection plans. `instantiateWorld` creates every owner, its accounts and knowledge, and connection instances on their origin (and destination when bidirectional).
- A location runtime component carries its outgoing connection instances: stable connection id, definition handle, origin, destination, direction, base traversal duration, enabled state, and allowed transport tags.
- `ActivateLocation` and `DeactivateLocation` commands set the location's active flag in phase 01. Only the location's owner may change it; repeated requests are idempotent.
- Theme-free schema, plan, instantiation, and command tests. Existing goldens are unchanged because no existing fixture declares a world definition or connections.

## Capabilities

### New Capabilities

- `sim/world`: world definitions, multiple locations and owners, connection instances, and location activation commands.

### Modified Capabilities

- `content/schemas`: connection and world definition schemas, and reference validation for their cross-references.
- `app/projections`: snapshots expose a location's outgoing connection ids.

## Impact

- **Packages:** `@aesfw/core` (`sim/world`, `sim/location`, `sim/instantiate`, command union, phase 01), `@aesfw/content` (schemas, collections, references, world plan), `@aesfw/app` (command mapping, projections), `@aesfw/host-web` (world selection), `@aesfw/testkit` (scenario runner world selection).
- **Tick phases:** phase 01 `applyCommands` (writes `location`); instantiation happens at session creation.
- **Store kinds:** none new; connection instances live in the optional `location.connections` field so empty-store encodings and existing hashes are unchanged.
- **Commands/events:** `ActivateLocation`, `DeactivateLocation`; events are the existing `CommandApplied`/`CommandRejected`.
- **Error codes:** `unknown_location`, `not_owner` (existing). **Diagnostic codes:** `unknown_world`, `unknown_world_location`, `unknown_world_connection` (new).
- **Protocol/save format:** no protocol version change. Location `connections` is an additive snapshot field. Existing goldens are unchanged.
- **Dependencies on archived changes:** 1.8 `add-grid-spatial-policy` (archived 2026-10-22).

## Out of Scope

- 6.2 `add-transport-units-and-cargo`: transport entities, cargo compartments, endpoints, and transport maintenance.
- 6.3 `add-route-planning-and-movement`: route planning and movement.
- 6.4 `add-transport-orders-and-stations` and later: orders, stations, handling, and transport commands.
- 8.1 `add-regions-and-distribution-rules`: region membership and disjoint distribution rules. A world location may name a region, but the region definition and rules are not interpreted yet.
- 8.2 `add-knowledge-and-exploration`: discovery and fog filtering. Knowledge is seeded from the world definition but not updated by arrivals.
