# Tasks

## 1. Pipeline types (design D1, D2, D5, D6, D7)

- [x] 1.1 Create `packages/core/src/events/event-writer.ts` with `DomainEvent`, `EventWriter`, and `createEventWriter` per design D5. Verify: `pnpm type-check` green.
- [x] 1.2 Create `packages/core/src/pipeline/types.ts` with `PhaseId`, `StoreKey`, `SystemDescriptor`, `TickContext`, `TickInput`, `TickOutput`, `TickMetrics`, `CommandOutcome`, `Transaction`, and the policy/scratch/tx interfaces per design D2/D6/D7. Verify: `pnpm type-check` green.
- [x] 1.3 Create `packages/core/src/pipeline/scratch.ts`, `policies.ts`, and `tx.ts` with `createTickScratch`, an empty `PolicySet` default, and the not-supported `TransactionWriter` per design D6/D7. Verify: `pnpm type-check` green.

## 2. Phase modules (design D2)

- [x] 2.1 Create the 31 no-op system modules `packages/core/src/systems/phase-01-apply-commands.ts` … `phase-31-metrics-hash.ts`, each exporting a `SystemDescriptor` with the TDS-11.1 name and empty reads/writes. Verify: `pnpm type-check` green.
- [x] 2.2 Create `packages/core/src/pipeline/phase-table.ts` with `PHASE_TABLE` and the frozen `phaseTable` per design D2. Verify: `pnpm type-check` green.

## 3. Runner and write-set checks (design D3, D4, D8)

- [x] 3.1 Create `packages/core/src/pipeline/write-set.ts` with the guarded `ComponentStores` view per design D3. Verify: `pnpm type-check` green.
- [x] 3.2 Create `packages/core/src/pipeline/step.ts` with `step`, `runPhases`, and the `runSystem` harness per design D4/D8. Verify: `pnpm type-check` green.
- [x] 3.3 Create `packages/core/src/pipeline/index.ts`, extend `packages/core/src/testing.ts` with `runPhases`, `stores`, `phaseTable`, and `runSystem`, and re-export `step` from `packages/core/src/index.ts`. Verify: `pnpm type-check` green; core zero-dependency test still passes.

## 4. Tests

- [x] 4.1 Add `packages/core/src/pipeline/phase-table.test.ts` with one test per spec scenario: `[TDS-11.1] the phase table lists phases 1 to 31 in order`, `[TDS-11.1] phases 32 and 33 are not system modules`. Verify: green under `pnpm --filter @aesfw/core test`.
- [x] 4.2 Add `packages/core/src/pipeline/step.test.ts` with one test per spec scenario: `[TDS-11.2] a system sees the computed tick`, `[TDS-10.1] an empty world advances one tick`, `[TDS-10.1] hashing produces a state hash without changing state`, `[TDS-10.1] journaling is opt-in`, `[TDS-17] emitted events are sequenced in order`, `[TDS-10.3] only the requested phases run`. Verify: green under `pnpm --filter @aesfw/core test`.
- [x] 4.3 Add `packages/core/src/pipeline/write-set.test.ts` with one test per spec scenario: `[TDS-11.2] an undeclared write throws`, `[TDS-11.2] a declared write is allowed`, `[TDS-12.2] transactions are not implemented yet`. Verify: green under `pnpm --filter @aesfw/core test`.
- [x] 4.4 Add `packages/core/src/pipeline/determinism.test.ts`: `[TDS-10.1] an empty world steps 10,000 ticks with stable hashes` (double-run hash equality) and `[INV-17] stepping a clone matches the original`. Verify: green under `pnpm --filter @aesfw/core test`.
- [x] 4.5 Raise the `@aesfw/testkit` project `testTimeout` to 30s in `vitest.config.ts`: the 31 new core source files make the type-checked ESLint spawns of the purity-lint tests slower than the 5s default. Verify: `pnpm test` green.

## 5. Documentation

- [x] 5.1 Apply amendment A-05 from design.md to the TDS-10.3 test API block in `docs/05_Technical_Design_Specification.md`. Verify: `runSystem` is present with roadmap-0.6 provenance.
- [x] 5.2 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive). Verify: rows 0.7–0.9 dependency columns still accurate.

## 6. Final verification

- [x] 6.1 Run `pnpm verify` on a clean checkout; all green, including the pipeline tests and the `@aesfw/core` coverage thresholds. `pnpm trace` is introduced by `add-traceability-tool` (0.8) and is not runnable yet — note its absence. [TDS-10, TDS-11, ARCH-5]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 0.6 with "✓ archived <date>" in `docs/08` and confirm row 0.7 becomes unblocked.
