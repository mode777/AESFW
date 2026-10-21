# Tasks

## 1. Types and content (design D2)

- [x] 1.1 Create `packages/core/src/sim/production/types.ts` with the producer, recipe, source, and block-reason types.
- [x] 1.2 Extend `packages/content/src/schemas/entity.ts` with the `finite_deposit` source policy and `initial_quantity`, and update its schema test.
- [x] 1.3 Create `packages/core/src/sim/production/index.ts` and export from `packages/core/src/index.ts`.

## 2. Phases (design D3–D6)

- [x] 2.1 Create `preconditions.ts` and implement phase 07.
- [x] 2.2 Create `reserve.ts` and implement phase 11.
- [x] 2.3 Create `advance.ts` and implement phase 12.
- [x] 2.4 Create `commit.ts` and implement phase 13.

## 3. Tests — sources and preconditions

- [x] 3.1 Add `packages/core/src/sim/production/sources.test.ts` with the source scenarios. [GDD-9.5, GDD-10.4]
- [x] 3.2 Add `packages/core/src/sim/production/preconditions.test.ts` with the precondition scenarios. [GDD-10.3]

## 4. Tests — start, advancement, completion

- [x] 4.1 Add `packages/core/src/sim/production/production.test.ts` with `runPhases([7, 11, 12, 13])` covering start, missing input, missing capability, advancement, batch completion, continuous per-tick commit, and INV-15. [GDD-4.3, GDD-10.2, GDD-10.4, ARCH-6.2, INV-15]

## 5. Invariants (design D7)

- [x] 5.1 Extend `packages/testkit/src/harness/invariants.ts` with INV-22 and add its tests. [VER-6, INV-22]

## 6. Documentation and verification

- [x] 6.1 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive).
- [x] 6.2 Confirm no amendment to 01–07 is required.
- [x] 6.3 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. [GDD-4.3, GDD-9.4, GDD-9.5, GDD-10.1, GDD-10.2, GDD-10.3, GDD-10.4, ARCH-5.2, INV-15, INV-22]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 1.10 with "✓ archived <date>" in `docs/08`.
