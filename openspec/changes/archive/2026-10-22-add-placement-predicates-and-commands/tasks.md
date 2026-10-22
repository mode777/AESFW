# Tasks

## 1. Types and core accessors (design D2, D3, D4)

- [x] 1.1 Create `packages/core/src/sim/placement/types.ts` with `PlacementSpec`, `PlacementQuery`, `PlacementReason`, `PlacementReasonCode`, `PlacementResult`, and `PlacementConditionEvaluator`.
- [x] 1.2 Add the optional `definitionDataOf` accessor to `packages/core/src/registry/types.ts` and leave it undefined in `createEmptyRegistry`.
- [x] 1.3 Add the optional `conditionEvaluator` to `TickInput` and `TickContext` in `packages/core/src/pipeline/types.ts` and thread it through `packages/core/src/pipeline/step.ts` (default returns `true`).
- [x] 1.4 Extend `packages/core/src/commands/types.ts` with `PlaceEntityPlan`, `CancelEntityPlan`, `CommitConstruction`, and `DeconstructEntity` (TDS-16.2 shapes).
- [x] 1.5 Add the nine placement error codes and their argument names to `packages/core/src/errors/codes.ts`.

## 2. Predicates and definition resolution (design D2, D3, D5)

- [x] 2.1 Create `packages/core/src/sim/placement/predicates.ts` with `evaluatePlacementPredicates` (location, activity, bounds, buildability, occupancy, capacity).
- [x] 2.2 Create `packages/core/src/sim/placement/definition.ts` with `placementSpecOf`, `constructionPlanOf`, and the entity-definition resolution helpers.
- [x] 2.3 Create `packages/core/src/sim/placement/query.ts` with `evaluatePlacement` returning the ordered reasons.
- [x] 2.4 Export the new surface from `packages/core/src/sim/placement/index.ts` and `packages/core/src/index.ts`.

## 3. Command application (design D5, D6)

- [x] 3.1 Create `packages/core/src/sim/placement/apply.ts` with `applyPlaceEntityPlan` and the cancel/commit/deconstruct helpers.
- [x] 3.2 Add the four command cases to `packages/core/src/systems/phase-01-apply-commands.ts` and extend its declared `reads`/`writes`.

## 4. Content schema (design D7)

- [x] 4.1 Add the optional `placement` component (`capacity_cost`, `footprint`, `conditions`) to `packages/content/src/schemas/entity.ts` and regenerate `packages/content/schemas/entity_definitions.json`.
- [x] 4.2 Resolve `placement` `conditions` references in `packages/content/src/registry/references.ts`.
- [x] 4.3 Implement `definitionDataOf` in the compiled registry (`packages/content/src/registry/build.ts` and `types.ts`).

## 5. Application and protocol surface (design D1, D4)

- [x] 5.1 Add the `placement_query`/`placement_result` DTOs to `packages/protocol/src/placement.ts` and export them from `packages/protocol/src/index.ts`.
- [x] 5.2 Add the content-to-placement resolver and `placementQuery` to `packages/app/src/session/placement.ts`, plus the content-backed condition evaluator.
- [x] 5.3 Extend `packages/app/src/session/session.ts` `mapCommand` with the four command types and pass the condition evaluator in `advance`.
- [x] 5.4 Export the new application surface from `packages/app/src/index.ts`.

## 6. Unit tests (06 §5.3)

- [x] 6.1 `packages/core/src/sim/placement/placement.test.ts`: a valid placement is accepted; an unknown location, inactive location, out-of-bounds footprint, blocked cell, occupied cell, grid capacity overflow, count capacity overflow, a satisfied condition, and a failed condition are rejected with the right code. `[GDD-18.2][CONT-6.8]`
- [x] 6.2 Same file: `evaluatePlacement` returns valid with no reasons and returns the reasons for an invalid query without mutating state. `[PIC-12.1]`
- [x] 6.3 Same file: `PlaceEntityPlan` creates a planned entity with the plan and transform; a definition without construction activates immediately; an illegal placement allocates no entity; an unknown definition is rejected; two competing placements apply in submission order. `[GDD-18.1][ARCH-7.3]`
- [x] 6.4 Same file: `CancelEntityPlan` applies from `planned` and is rejected from `active`; `CommitConstruction` consumes the reservation and is rejected from `active`; `DeconstructEntity` applies from `active` and is rejected from terminal. `[GDD-9.1][GDD-18.3][ARCH-7.3]`
- [x] 6.5 Same file: the error-code registry contains the nine placement codes and `insufficient_capacity` declares `required` and `available`. `[TDS-16.3]`
- [x] 6.6 `packages/content/src/schemas/schemas.test.ts` and `packages/content/src/registry/build.test.ts`: a valid placement component, a negative capacity cost, and the placement condition references. `[CONT-6.8][CONT-11.3]`

## 7. Application integration

- [x] 7.1 `packages/app/src/session/placement.test.ts`: `placementQuery` reports valid/invalid with revision and reasons; an unknown definition is reported; a `PlaceEntityPlan` submitted through the gateway is applied in phase 01. `[PIC-12.1][ARCH-7.3]`
- [x] 7.2 `packages/testkit/src/harness/placement-invariants.test.ts`: `expectInvariants` passes after a placement tick and after a cancel-and-remove tick (INV-18, INV-24). `[INV-18][INV-24]`

## 8. Documentation and verification

- [x] 8.1 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none until archive marks the row done.
- [x] 8.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. `[GDD-18.2][PIC-12.1][ARCH-7.3]`

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 3.3 with "✓ archived <date>" in `docs/08`.
