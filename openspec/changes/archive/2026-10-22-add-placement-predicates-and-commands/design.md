# Design — add-placement-predicates-and-commands

## Context

`add-grid-spatial-policy` (3.1) and `add-construction-lifecycle` (3.2) are archived. The `placement` store kind exists in the TDS-8.3 catalogue but is empty. `GridSpatialPolicy.canPlace` validates mask, bounds, occupancy, and capacity; `requestCancellation` and `requestDeconstruction` are the lifecycle seams; `commitReservations` commits outstanding reservations. Phase 01 rejects every unknown command with `not_supported`. The `placement` component of CONT-6.8 is not in the entity-definition schema. This document records the predicate shapes, the query contract, the command application, and the content mapping that 3.3 fixes.

## Goals / Non-Goals

**Goals:** generic placement predicates, the read-only `placement_query`, and the four commands of ARCH-7.3, wired onto the 3.1 grid policy and the 3.2 lifecycle.

**Non-Goals:** connectivity (3.4); slot and area sources and the `working_area`/`requires_slot` placement fields (3.5); reference builder content (3.6); the client grid and placement mode (3.7, 3.8).

## Decisions

### D1 — Module layout

- `packages/core/src/sim/placement/types.ts`: `PlacementSpec`, `PlacementQuery`, `PlacementReason`, `PlacementResult`, `PlacementConditionEvaluator`.
- `packages/core/src/sim/placement/predicates.ts`: `evaluatePlacementPredicates` (the built-in geometric and capacity predicates of GDD-18.2).
- `packages/core/src/sim/placement/definition.ts`: `placementSpecOf`, `constructionPlanOf`, `placeableDefinitionOf` — resolve a `DefinitionHandle` to the runtime placement spec, construction plan, and placement cost using `Registry.definitionDataOf`.
- `packages/core/src/sim/placement/query.ts`: `evaluatePlacement` (TDS-10.1).
- `packages/core/src/sim/placement/apply.ts`: `applyPlaceEntityPlan` and the cancel/commit/deconstruct helpers used by phase 01.
- `packages/core/src/systems/phase-01-apply-commands.ts`: the four new command cases.
- `packages/app/src/session/placement.ts`: `placementQuery` (content-to-DTO) and the content-backed condition evaluator.
- `packages/protocol/src/placement.ts`: the `placement_query`/`placement_result` DTOs.

### D2 — Placement spec and predicate result shapes

```ts
type PlacementSpec = {
  readonly capacityCost: Int;
  readonly footprint: Footprint | null;
  readonly conditions: readonly DefinitionHandle[];
};

type PlacementQuery = {
  readonly definition: DefinitionHandle;
  readonly location: EntityId;
  readonly transform: LogicalTransform;
};

type PlacementReasonCode =
  | 'unknown_definition' | 'unknown_location' | 'location_inactive'
  | 'out_of_bounds' | 'not_buildable' | 'occupied' | 'insufficient_capacity'
  | 'placement_condition_failed';

type PlacementReason = {
  readonly code: PlacementReasonCode;
  readonly arguments: Readonly<Record<string, string | number | boolean>>;
};

type PlacementResult = { readonly ok: true } | { readonly ok: false; readonly reasons: readonly PlacementReason[] };
```

Predicates are evaluated in the fixed order of the requirement, so the first failure is deterministic. The grid path uses `GridSpatialPolicy.canPlace` when the location carries a grid and the spec carries a footprint; the count path uses `SpatialPolicy.validatePlacement` with `capacityCost` otherwise. `conditions` are evaluated in the spec's (authoring) order.

### D3 — Reading definitions from core

TDS-10.1 places `evaluatePlacement(world, registry, q)` in the core API, so core must be able to read the definition behind a handle. The core `Registry` interface therefore gains an **optional** accessor:

```ts
readonly definitionDataOf?: (type: DefinitionType, handle: DefinitionHandle) => JsonValue | null;
```

`createEmptyRegistry` leaves it undefined; the compiled `ContentRegistry` implements it. Core functions that need definition data return a typed "not found" outcome when the accessor is absent, so core remains content-free (TDS-4.3 rule 2). This is a clarification of TDS-7, not a change to its handle/string contract.

### D4 — Condition evaluation

Content conditions are compiled trees owned by `@aesfw/content`; core may not import them. Phase 01 and `evaluatePlacement` therefore take an injected, world-pure evaluator:

```ts
type PlacementConditionEvaluator = (
  world: World,
  condition: DefinitionHandle,
  subject: EntityId,
) => boolean;
```

`TickInput` and `TickContext` gain an optional `conditionEvaluator` field (defaulting to a function that returns `true`). The application layer builds it from `CompiledContent`; core unit tests inject a stub. This is a clarification of TDS-16.1 step 6 (re-validation at application time): the re-validation uses the same pure predicate functions as the query, including content conditions.

### D5 — PlaceEntityPlan

Phase 01, for each due command in `(tick, actor, seq)` order:

1. Resolve `registry.definitionDataOf('entity', definition)`. Absent or `null` → reject `unknown_definition`.
2. Build the `PlacementSpec` from `components.placement` (`capacity_cost` default `0`, `footprint` optional, `conditions` normalised to a handle list).
3. Evaluate the placement with `evaluatePlacement`. Invalid → reject with every reason.
4. Allocate the entity and set `definition`, `placement`, `transform`, and `footprint`. The transform and footprint are written through `GridSpatialPolicy.place` for grid locations, or through `SpatialPolicy.add` plus `transform`/`footprint` for count locations.
5. If `components.construction` is present, build the `ConstructionPlan` (duration, costs, commit policy, the location's first inventory, optional deconstruction) and call `createConstructionPlan`, leaving the entity `planned`. Otherwise set `enabled` and lifecycle `active` directly.
6. Emit `CommandApplied`.

Binding the placed entity's `producer`/`residence`/`resource_source` components from its definition is content-layer work owned by the reference builder stage (3.6); 3.3 fixes the placement and construction mechanism, not the content binding.

### D6 — Cancel, commit, and deconstruct

- `CancelEntityPlan` calls `requestCancellation`; false → reject `invalid_construction_state`.
- `CommitConstruction` calls `commitReservations` with the progress's outstanding reservations when the entity is `planned`, `awaiting_resources`, or `constructing` and has a plan; otherwise reject `invalid_construction_state`. It commits quantities, not progress.
- `DeconstructEntity` calls `requestDeconstruction` at the computed tick; false → reject `invalid_construction_state`.

All three operate on the entity in place; the quantity effects of cancellation and deconstruction remain in phase 30 (3.2).

### D7 — Content mapping (CONT-6.8)

`packages/content/src/schemas/entity.ts` gains an optional `placement` component: `capacity_cost` (integer ≥ 0), `footprint` (a two-element tuple of integers ≥ 1), and `conditions` (one ID or an array of IDs). `packages/content/src/registry/references.ts` resolves each `conditions` entry against the `condition` collection. The runtime `PlacementSpec` is built from this definition by the placement command and query.

### D8 — Purity, ordering, and hashes

All new modules are pure: no clock, RNG, global, or floating point. Reasons and their arguments use safe integers. Iteration is ascending entity ID (commands, plans) and the spec's declared order (conditions); competing placements resolve by the existing `(tick, actor, seq)` command order. New component values are plain canonical data encoded by the generic store codec; no codec change is needed. No existing content or golden declares a `placement` component or issues a placement command, so no hash moves — no **HASH-CHANGING** artifact.

## Amendments and clarifications to 01–07

- No amendment to 01–04 is required. GDD-18.2 already lists the generic predicates; ARCH-7.3 already lists the four commands; PIC-12.1 already specifies the query and result. Two clarifications are recorded here and need no document change: (a) `Registry` gains an optional definition-data accessor used by the TDS-10.1 `evaluatePlacement` (D3); (b) `TickInput`/`TickContext` gain an optional placement-condition evaluator so phase-01 re-validation can evaluate content conditions without core importing content (D4).

## Risks / Trade-offs

- [A placed entity carries no `producer`/`residence` component] → 3.3 delivers the mechanism; the content binding for placed entities lands with the reference builder stage (3.6). Recorded in D5.
- [The condition evaluator is injected through `TickInput`] → a small core API addition, but it keeps core content-free and keeps the query and the command path on one implementation. Recorded in D4.
- [Count-based locations write `transform`/`footprint` outside the grid policy] → the grid policy owns grids; the abstract policy owns counts. The placement helper picks the policy by the location's shape. Recorded in D2/D5.

## Migration Plan

Additive modules, an optional content field, an optional core accessor, an optional `TickInput` field, and four new command cases. No save-format, protocol-version, or golden artifact changes. Rollback reverts the change; older code ignores the optional fields and rejects the commands with `not_supported`.

## Open Questions

None blocking.
