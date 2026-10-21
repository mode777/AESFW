# Tasks

## 1. Growth (design D2–D4)

- [x] 1.1 Create `packages/core/src/sim/population/growth.ts` with the growth types, the condition predicate, and `updatePopulation`; export from `sim/population/index.ts` and `packages/core/src/index.ts`.
- [x] 1.2 Implement phase 23 `updatePopulation`.

## 2. Tests

- [x] 2.1 Add `packages/core/src/sim/population/growth.test.ts` with `runPhases([23])` covering increase, decrease, capacity clamp, zero floor, and the interval. [GDD-11.4, INV-07]

## 3. Invariants (design D5)

- [x] 3.1 Extend `packages/testkit/src/harness/invariants.ts` with INV-07 and add its tests. [VER-6, INV-07]

## 4. Documentation and verification

- [x] 4.1 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive).
- [x] 4.2 Confirm no amendment to 01–07 is required.
- [x] 4.3 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. [GDD-11.4, CONT-6.14, INV-07]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 1.13 with "✓ archived <date>" in `docs/08`.
