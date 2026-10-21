# Tasks

## 1. Types (design D2)

- [x] 1.1 Create `packages/core/src/sim/needs/types.ts` with the need spec, category spec, need state, and satisfaction types; extend `Residence` in `sim/population/types.ts` with `needs`, `categories`, and `satisfactionAggregation`.
- [x] 1.2 Create `packages/core/src/sim/needs/index.ts` and export from `packages/core/src/index.ts`.

## 2. Phases (design D3–D6)

- [x] 2.1 Create `demand.ts` and implement phase 08.
- [x] 2.2 Create `deliver.ts` and implement phase 20.
- [x] 2.3 Create `fulfillment.ts` and implement phase 21.

## 3. Tests

- [x] 3.1 Add `packages/core/src/sim/needs/needs.test.ts` with `runPhases([8, 20, 21])` covering demand scaling, consumption, limited availability, availability without consumption, category modes, satisfaction aggregation, and the `[0, 1000]` bound. [GDD-12.1–12.5, INV-08]

## 4. Invariants (design D7)

- [x] 4.1 Extend `packages/testkit/src/harness/invariants.ts` with INV-08 and add its tests. [VER-6, INV-08]

## 5. Documentation and verification

- [x] 5.1 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive).
- [x] 5.2 Confirm no amendment to 01–07 is required.
- [x] 5.3 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. [GDD-4.2, GDD-12.1, GDD-12.2, GDD-12.3, GDD-12.4, GDD-12.5, INV-08]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 1.12 with "✓ archived <date>" in `docs/08`.
