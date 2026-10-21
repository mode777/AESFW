# Proposal

## Why

Roadmap 08, M0 item 0.7 (`add-testkit-foundation`, capability `testkit/harness`, size M). The pipeline of 0.6 runs, but there is no shared way to build a world for a test, no invariant checker, and no determinism harnesses — the tools every later system test depends on. This row retires R-01 and R-03 at the verification layer by making the invariant catalogue of 06 §6 and the determinism harnesses of 06 §8.1 executable from day one. Depends on: `add-tick-pipeline-skeleton` (0.6) — archived 2026-10-21.

## What Changes

- Add the store-level world builder to `@aesfw/testkit` (`packages/testkit/src/harness/`): `world(registry?)` returning a fluent builder that sets the seed, tick, owners, and component-store values and produces a `World` through `@aesfw/core` public paths. The content-driven `content()` builder is owned by `add-testkit-content-builders` (1.5) and is out of scope.
- Add `checkInvariants(before, output, registry)` evaluating the M0 subset of the invariant catalogue (06 §6): INV-10 (unique IDs, `nextEntityId` beyond every allocated ID), INV-18 (persistence round-trip hash), INV-21 (a step is an outcome, not a throw; tick advances by one), and INV-24 (ascending store iteration, no surviving tombstones). INV-17 (purity) is checked by the clone-run harness. Findings are returned as data, and `expectInvariants` throws when any is present.
- Add the determinism harnesses of 06 §8.1: `cloneRun` (INV-17 at a tick), `doubleRun` (the same scenario twice with fresh contexts, comparing hash checkpoints), and `saveContinue` (encode at tick T, decode, continue to T + N, compare with the uninterrupted run). Each returns a report; assertion helpers `expectHashStable` and `expectSameState` wrap them.
- Add L1 tests: the world builder produces the requested state; `checkInvariants` reports each invariant on a deliberately violating world and reports nothing on a valid one; each harness passes on an empty world and fails when fed a mismatched run.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts.

## Capabilities

### New Capabilities

- `testkit/harness`: the store-level world builder, the `checkInvariants` framework over the invariant catalogue, and the double-run, clone-run, and save-continue determinism harnesses that every later system and scenario test uses.

### Modified Capabilities

- None. `kernel/tick-pipeline` and `kernel/world-state` are unchanged.

## Impact

- **Packages:** `@aesfw/testkit` gains `src/harness/**`; `src/index.ts` re-exports the harness. `fast-check` and `@types/node` are already devDependencies/dependencies; no runtime dependency is added to a pure package.
- **Tick phases:** none. **Store kinds:** none. **Commands/events/error codes:** none. **Diagnostic codes:** none (findings are `InvariantFinding` records).
- **Out of scope:** the `content()` builder and query/assertion helpers that need compiled content (`add-testkit-content-builders`, 1.5); the full invariant catalogue beyond INV-10/17/18/21/24 (each later system row extends the checker with its invariants); scenario runner and CLI (1.14); browser-mode determinism (`add-browser-determinism-check`, 0.9).
- **Verification impact:** L2/L5/L6 tests gain `checkInvariants` and the harnesses; the M0 exit criteria (empty-world 10,000-tick stability, clone-run, save-continue) become reusable testkit operations rather than ad-hoc tests.
