# Design

## Context

6.1 is the first M6 row. It adds the sector graph that 6.2–6.9 use. It does not add transport runtime behaviour; it only makes multiple locations, owners, and connections representable and selectable.

## Decisions

### D1 — World definitions are content, instantiation stays in core

`@aesfw/content` parses and validates `connections` and `worlds`, then derives a plain `WorldPlan`. `@aesfw/core` `instantiateWorld` remains content-free and consumes the plan. A new `worldPlan(registry, worldId)` chooses the explicit world, the first world by ascending definition ID, or the existing `defaultWorldPlan`.

The plan is ordered deterministically:

1. owners by ascending owner string ID, mapped to handles `0..n-1`;
2. locations by ascending world-location string ID;
3. connection instances by ascending connection instance string ID.

### D2 — Connections live in the optional location component

No new store kind is introduced. A `Location` component gains an optional `connections` array of runtime connection instances. This keeps the existing `encodeStores` output unchanged for every world without connections, so SCN-01, SCN-04, and SCN-10 goldens keep their hashes. A new connection-bearing scenario owns any new golden (6.7).

A runtime connection is:

```ts
type LocationConnection = {
  readonly id: StringId;
  readonly definition: DefinitionHandle;
  readonly origin: EntityId;
  readonly destination: EntityId;
  readonly direction: 'one_way' | 'bidirectional';
  readonly baseDurationTicks: Int;
  readonly enabled: boolean;
  readonly allowedTransportTags: readonly StringId[];
};
```

A bidirectional connection is appended to both endpoint locations. The two entries are identical, including origin and destination; traversal in the reverse direction reads `destination -> origin`. 6.3 owns the planner and interprets direction.

### D3 — World plan shape

`WorldPlan` gains optional `owners` and `connections`; `LocationPlan` gains optional `owner`. Existing callers that only set `owner` and `locations` continue to work. `instantiateWorld` ensures every referenced owner exists, creates accounts in ascending resource-handle order, seeds knowledge, instantiates locations with `locationPlan.owner ?? plan.owner`, then appends connections.

Owner knowledge is stored in the existing `OwnerState.knowledge` array, ordered by ascending location entity ID.

### D4 — Location activation is phase 01

`ActivateLocation` and `DeactivateLocation` are added to the internal command union and to the app command mapping. Phase 01 validates that the subject has a `location` component and that `location.owner === scheduled.actor` (a null owner cannot be commanded by an owner). It writes `location.active` and emits the existing `CommandApplied` event. Repeated requests are applied no-ops so the client can retry safely.

Existing production and throughput code already excludes entities at inactive locations (`isExcluded` reads `location.active`), so no phase 09–13 change is required.

### D5 — Host and scenario selection

The scenario runner passes `scenario.setup.world` to `worldPlan`. The web host passes `null`, which selects the first world definition when present; this keeps existing fixtures on the default plan and lets 6.8 add an R2 world without a protocol change.

### D6 — Diagnostics

New content diagnostics: `unknown_world`, `unknown_world_location`, `unknown_world_connection`, `duplicate_world_location`, `duplicate_world_connection`. Reference validation reuses `unresolved_reference` for cross-references so existing diagnostic handling and fixtures stay valid.

## Phases and stores

- Phase 01 `applyCommands`: reads `location`; writes `location`. No new store kinds.
- Instantiation (session creation): writes `owner`, `location`, `locationHub`, `inventory`, and existing stores.

## Ordering and rounding

No arithmetic or allocation is introduced. Ordering is the documented string-ID order in D1 and entity-ID order for knowledge.

## Amendments

No amendment to 01–04 is required. The interpretation that a bidirectional connection instance is stored at both endpoints is recorded here.

## Risks

- A world definition suppresses default template instantiation. Tests must assert the no-world path explicitly.
- Region membership is parsed but not interpreted until 8.1; a world may name a region and the plan stores it as an unresolved handle (`null`) for now.
- Initial entities are parsed by the schema but instantiated by 6.2, which owns transport units. 6.1 must not silently instantiate a transport unit as a static entity.
