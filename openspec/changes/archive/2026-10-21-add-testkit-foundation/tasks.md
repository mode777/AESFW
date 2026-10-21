# Tasks

## 1. World builder (design D1, D2)

- [x] 1.1 Create `packages/testkit/src/harness/world-builder.ts` with `world(registry?)` and the fluent builder per design D2. Verify: `pnpm type-check` green.
- [x] 1.2 Add `packages/testkit/src/harness/world-builder.test.ts` with the spec scenario `[VER-5.2] the builder produces the requested state`. Verify: green under `pnpm --filter @aesfw/testkit test`.

## 2. Invariant checker (design D3)

- [x] 2.1 Create `packages/testkit/src/harness/invariants.ts` with `InvariantFinding`, `checkInvariants`, and `expectInvariants` per design D3, covering INV-10, INV-18, INV-21, and INV-24. Verify: `pnpm type-check` green.
- [x] 2.2 Add `packages/testkit/src/harness/invariants.test.ts` with one test per spec scenario: `[VER-6] a valid empty world has no findings`, `[INV-10] an entity ID at or beyond nextEntityId is reported`, `[INV-21] a tick that did not advance is reported`, `[INV-24] non-ascending store iteration is reported`, plus an INV-18 round-trip test. Verify: green under `pnpm --filter @aesfw/testkit test`.

## 3. Determinism harnesses (design D4, D5)

- [x] 3.1 Create `packages/testkit/src/harness/harnesses.ts` with `DeterminismReport`, `cloneRun`, `doubleRun`, `saveContinue`, `expectHashStable`, and `expectSameState` per design D4/D5. Verify: `pnpm type-check` green.
- [x] 3.2 Add `packages/testkit/src/harness/harnesses.test.ts` with one test per spec scenario: `[VER-8.1][INV-17] a clone run matches the original`, `[VER-8.1] a double run produces identical checkpoints`, `[VER-8.1][INV-18] a save and continue reproduces the uninterrupted run`, `[VER-5.2] identical runs pass the stability assertion`, `[VER-5.2] different states fail the equality assertion`. Verify: green under `pnpm --filter @aesfw/testkit test`.

## 4. Public surface

- [x] 4.1 Create `packages/testkit/src/harness/index.ts` and extend `packages/testkit/src/index.ts` to re-export the harness per design D1. Verify: `pnpm type-check` green; the workspace inventory tests still pass.
- [x] 4.2 Add the TDS-10.1 top-level re-exports (`createWorld`, `cloneWorld`, `encodeWorld`, `decodeWorld`, `hashWorld`, and the world types) to `packages/core/src/index.ts` per design D2a. Verify: `pnpm type-check` green and the core zero-dependency test still passes.

## 5. Documentation

- [x] 5.1 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive). Verify: rows 0.8–0.9 dependency columns still accurate. No 01–07 amendment is needed (design records none).

## 6. Final verification

- [x] 6.1 Run `pnpm verify` on a clean checkout; all green, including the harness tests. `pnpm trace` is introduced by `add-traceability-tool` (0.8) and is not runnable yet — note its absence. [VER-5.2, VER-6, VER-8.1, INV-10, INV-17, INV-18, INV-21, INV-24]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 0.7 with "✓ archived <date>" in `docs/08` and confirm rows 0.9 (and 0.8, which depends only on 0.1) become unblocked.
