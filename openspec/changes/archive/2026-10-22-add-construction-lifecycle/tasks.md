# Tasks

## 1. Types and store shapes (design D2, D3)

- [x] 1.1 Create `packages/core/src/sim/construction/types.ts` with `LifecycleState`, `CommitPolicy`, `ConstructionCost`, `DeconstructPolicy`, `ConstructionPlan`, `ConstructionProgress`, and the `Lifecycle` value shape.
- [x] 1.2 Create `packages/core/src/sim/construction/lifecycle.ts` with `lifecycleOf`, `setLifecycle`, `canTransition`, the `LIFECYCLE_TRANSITIONS` table, and `reconcileOperationalStates`.
- [x] 1.3 Create `packages/core/src/sim/construction/plan.ts` with `constructionPlanOf`, `constructionProgressOf`, and `createConstructionPlan`.
- [x] 1.4 Export the new types and functions from `packages/core/src/sim/construction/index.ts` and `packages/core/src/index.ts`.

## 2. Reservation, phase 03, and seams (design D4, D5, D6)

- [x] 2.1 Create `packages/core/src/sim/construction/reserve.ts` with `reserveConstructionCosts`, `commitReservations`, and `releaseReservations` (atomic composites, purpose `construction`, created reservations read back in ascending ID order).
- [x] 2.2 Create `packages/core/src/sim/construction/start.ts` with `resolveConstruction` implementing D4/D5.
- [x] 2.3 Create `packages/core/src/sim/construction/seams.ts` with `requestCancellation` and `requestDeconstruction` for the 3.3 commands.
- [x] 2.4 Create `packages/core/src/sim/construction/finalize.ts` with `finalizeLifecycle`, `removeEntity`, and `compactStores` implementing D6/D7.

## 3. Phase modules (design D4, D7)

- [x] 3.1 Implement `phase03ResolveLifecycleAndConstruction` (reads `lifecycle`, `constructionPlan`, `constructionProgress`, `enabled`, `producer`, `inventory`; writes `lifecycle`, `constructionProgress`, `inventory`, `ledger`).
- [x] 3.2 Implement `phase30FinalizeLifecycle` (reads `ledger`, `lifecycle`, `constructionPlan`, `constructionProgress`, `inventory`; writes every component kind and `ledger`).

## 4. Content schema (design D8)

- [x] 4.1 Add the optional `construction` component (`duration_ticks`, `costs`, `commit_policy`, optional `deconstruction`) to `packages/content/src/schemas/entity.ts` and regenerate `packages/content/schemas/entity_definitions.json`.
- [x] 4.2 Resolve construction cost and return resources in `packages/content/src/registry/references.ts`.

## 5. Unit tests (06 §5.3)

- [x] 5.1 `packages/core/src/sim/construction/construction.test.ts`: lifecycle transitions — planned→constructing, planned→awaiting_resources, awaiting→constructing, constructing→active, active↔disabled, active↔blocked, terminal exclusion. `[GDD-9.1]`
- [x] 5.2 Same file: plans and progress — one tick per run, zero-duration immediate activation, empty cost list, ascending-entity ordering between two plans competing for one inventory. `[GDD-18.1]`
- [x] 5.3 Same file: atomic reservation — full reservation, partial reservation reserves nothing, exact-stock boundary. `[GDD-18.1][ARCH-6.2]`
- [x] 5.4 Same file: commit policies — `start`, `completion`, `continuous` per-tick amounts and exact rounding. `[GDD-18.1][CONT-6.8]`
- [x] 5.5 Same file: cancellation — release reservations, keep committed part, reject from `active`. `[GDD-9.1][TDS-12.3]`
- [x] 5.6 Same file: deconstruction — returns deposited, deadline boundary, reservation cancellation, reject from terminal. `[GDD-18.3]`
- [x] 5.7 Same file: phase 30 finalization — expired reservation release, tombstone compaction, cache dirty flag. `[TDS-11.1][TDS-12.3][INV-24]`
- [x] 5.8 `packages/content/src/schemas/schemas.test.ts` and `packages/content/src/registry/build.test.ts`: a valid construction component, an unknown commit policy, and an unknown cost resource. `[CONT-6.8]`

## 6. Invariants

- [x] 6.1 `packages/testkit/src/harness/construction-invariants.test.ts`: `expectInvariants` passes after a reserve-and-commit tick, after completion, and after a cancel-and-remove tick (INV-24, INV-18). `[INV-24][INV-18]`

## 7. Documentation and verification

- [x] 7.1 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive).
- [x] 7.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. `[GDD-9.1][GDD-18.1][GDD-18.3][CONT-6.8]`

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 3.2 with "✓ archived <date>" in `docs/08`.
