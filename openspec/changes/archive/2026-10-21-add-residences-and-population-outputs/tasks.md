# Tasks

## 1. Types and accumulators (design D2, D3)

- [x] 1.1 Create `packages/core/src/sim/population/types.ts` with the residence, population-group, and output types.
- [x] 1.2 Create `packages/core/src/sim/population/accumulators.ts` with `readCarry` and `writeCarry`.
- [x] 1.3 Create `packages/core/src/sim/population/index.ts` and export from `packages/core/src/index.ts`.

## 2. Phase 26 (design D4)

- [x] 2.1 Create `outputs.ts` with `applyPopulationOutputs` and implement phase 26.

## 3. Tests

- [x] 3.1 Add `packages/core/src/sim/population/accumulators.test.ts` covering the carry recurrence. [TDS-6.4]
- [x] 3.2 Add `packages/core/src/sim/population/population.test.ts` with `runPhases([26])` covering residence output, zero population, and the published provider. [GDD-11.1, GDD-11.3, ARCH-13]

## 4. Documentation and verification

- [x] 4.1 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive).
- [x] 4.2 Confirm no amendment to 01–07 is required.
- [x] 4.3 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. [GDD-11.1, GDD-11.2, GDD-11.3, TDS-6.4]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 1.11 with "✓ archived <date>" in `docs/08`.
