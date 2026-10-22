# Proposal

## Why

Roadmap 08, M3 item 3.3 (`add-placement-predicates-and-commands`, capability `sim/construction`, size M). M3 is the space-and-construction milestone and retires R-09 (spatial and placement complexity). Row 3.1 can validate and place a footprint on a grid, and row 3.2 provides the lifecycle state machine, construction plans, atomic cost reservation, and cancellation/deconstruction seams, but there is still no way for a client to *ask* whether a placement is legal and no command that turns a request into a planned entity. The `placement` component of CONT-6.8 is authored but never validated, `evaluatePlacement` (TDS-10.1) does not exist, the placement predicates of GDD-18.2 are not evaluated, and the four placement commands of ARCH-7.3 (`PlaceEntityPlan`, `CancelEntityPlan`, `CommitConstruction`, `DeconstructEntity`) are rejected with `not_supported` by phase 01. This row delivers the generic placement predicates, the read-only `placement_query` of PIC-12.1, and the four commands, wiring them onto the 3.1 grid policy and the 3.2 lifecycle mechanism. Depends on: `add-construction-lifecycle` (3.2) — archived 2026-10-22; `add-session-and-command-gateway` (2.2) — archived 2026-10-22.

## What Changes

- Add the generic placement predicate evaluation (GDD-18.2): location existence and activity, cells/capacity availability on a grid, footprint bounds, buildable cells, occupancy, count-based capacity, and the content `conditions` of the `placement` component, evaluated through an injected, world-pure condition evaluator.
- Add `evaluatePlacement(world, registry, query, conditionEvaluator)` returning `ok` or a typed, ordered list of rejection reasons (`unknown_location`, `location_inactive`, `out_of_bounds`, `not_buildable`, `occupied`, `insufficient_capacity`, `placement_condition_failed`).
- Add the read-only `placement_query` of PIC-12.1 and its `placement_result` (`valid`, `revision`, `reasons`) as protocol DTOs, resolved by the application layer from compiled content.
- Extend the internal command union (TDS-16.2) with `PlaceEntityPlan`, `CancelEntityPlan`, `CommitConstruction`, and `DeconstructEntity`; phase 01 re-validates and applies them in `(tick, actor, seq)` order.
- `PlaceEntityPlan` allocates the entity, sets `definition`, `placement`, `transform`/`footprint` through the grid policy, and creates the construction plan (or activates immediately when the definition declares no `construction`).
- `CancelEntityPlan` requests cancellation through the 3.2 seam; `CommitConstruction` commits the entity's outstanding construction reservations early; `DeconstructEntity` requests deconstruction through the 3.2 seam.
- Extend the entity-definition content schema (CONT-6.8) with the optional `placement` component (`capacity_cost`, `conditions`, `footprint`) and resolve its `conditions` references.
- Add command error codes and their argument schemas to the registry (`errors/codes.ts`).
- No **BREAKING** and no **HASH-CHANGING** artifacts: no existing content or golden declares a `placement` component or issues a placement command, so current worlds and goldens are unchanged.

## Capabilities

### Modified Capabilities

- `sim/construction`: adds the generic placement predicates, the `placement_query`, and the four placement/construction commands (phase 01 application, results, events, and error codes).
- `content/schemas`: adds the optional `placement` component to the entity-definition schema and its `conditions` reference checks.

## Impact

- **Packages:** `@aesfw/core` gains `src/sim/placement/**`, extends `src/commands/types.ts`, `src/errors/codes.ts`, `src/registry/types.ts` (an optional definition-data accessor), `src/pipeline/types.ts` and `src/pipeline/step.ts` (an optional placement-condition evaluator), and implements the new cases in `src/systems/phase-01-apply-commands.ts`; `src/index.ts` exports the new surface. `@aesfw/content` extends `src/schemas/entity.ts` and `src/registry/references.ts` and implements the definition-data accessor. `@aesfw/app` adds the content-to-placement resolver and the `placementQuery` entry point. `@aesfw/protocol` adds the placement query/result DTOs. No new runtime dependency is added to any pure package.
- **Tick phases:** phase 01 `applyCommands` gains the four command cases (reads `commandQueue`, `location`, `locationHub`; writes `definition`, `lifecycle`, `enabled`, `placement`, `constructionPlan`, `constructionProgress`, `transform`, `footprint`, `location`, `ledger`, `revision`). **Store kinds:** `placement` (already in the TDS-8.3 catalogue). **Derived cache:** a successful placement writes the occupancy cache through the grid policy and marks it dirty as required.
- **Commands/events:** the four command types of ARCH-7.3. **Events:** `CommandApplied`/`CommandRejected` (existing) and `ConstructionStarted`/`ConstructionCompleted`/`ConstructionCancelled`/`EntityDeconstructed` (from 3.2). **Error codes:** `unknown_definition`, `unknown_location`, `location_inactive`, `out_of_bounds`, `not_buildable`, `occupied`, `insufficient_capacity`, `placement_condition_failed`, `invalid_construction_state`.
- **Verification impact:** new L1 unit tests for the predicates, the query, and the four commands; an application integration test for the command gateway and `placement_query`; `checkInvariants` continues to pass. GDD-18.2, PIC-12.1, and ARCH-7.3 become traced.
- **Out of scope (later roadmap rows):** connectivity (3.4 `add-connectivity-requirement`); slot and area sources and `working_area`/`requires_slot` placement fields (3.5 `add-slot-and-area-sources`); the reference builder stage (3.6 `add-reference-content-builder-stage`); the client grid and placement mode (3.7 `add-client-location-grid`, 3.8 `add-client-placement-mode`).
