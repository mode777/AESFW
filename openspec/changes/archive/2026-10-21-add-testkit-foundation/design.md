# Design — add-testkit-foundation

## Context

0.6 is archived: `step`, `runPhases`, `runSystem`, the phase table, and the world codec exist. `@aesfw/testkit` is still a stub. What the harness must provide is fixed by VER-5.2, VER-6, and VER-8.1; this document records only the choices VER leaves open.

## Goals / Non-Goals

**Goals:** a store-level world builder; `checkInvariants` over INV-10, INV-18, INV-21, INV-24; the clone-run, double-run, and save-continue harnesses; assertion helpers; `@aesfw/testkit` stays pure and adds no runtime dependency.

**Non-Goals:** the `content()` fluent builder and query helpers that need compiled content (`add-testkit-content-builders`, 1.5); invariants beyond the M0 subset (each system row adds its own); the scenario runner and CLI (1.14); browser-mode determinism (0.9); generators for property tests (1.5+).

## Decisions

### D1 — Module layout

`packages/testkit/src/harness/` holds `world-builder.ts`, `invariants.ts`, `harnesses.ts`, and `index.ts`. `src/index.ts` re-exports the harness alongside `TESTKIT_PACKAGE_ID`.

### D2 — World builder builds through the core public path

`world(registry = createEmptyRegistry())` returns a builder that accumulates a `WorldSetup`, owner states, and store entries, then calls `createWorld` and applies the accumulated mutations on `build()`. It uses only `@aesfw/core` public exports, so it cannot produce a world the kernel would not. The seed defaults to `[0, 0]` and the tick to `0`. Owner states are appended and sorted by handle on `build()`; store entries are applied with `set`, and `nextEntityId` is advanced past the largest placed entity ID so the builder's output satisfies INV-10. A test that wants to place an entity *without* allocating it (to exercise the INV-10 check) does so directly on the built world.

### D2a — Core top-level re-exports of the TDS-10.1 API

TDS-10.1 lists `createWorld`, `cloneWorld`, `encodeWorld`, `decodeWorld`, and `hashWorld` as the public API of `@aesfw/core`, but 0.5 exposed them only under the `world` namespace. This change adds the top-level re-exports (and the `World`/`ComponentStores`/`OwnerState`/etc. types) to `packages/core/src/index.ts` so consumers use the documented API; the `world` namespace remains. This is additive and changes no behavior.

### D3 — `checkInvariants` returns findings; `expectInvariants` throws

`checkInvariants(before, output, registry)` returns `readonly InvariantFinding[]`, each `{ id, message }` naming the invariant (`INV-10`, `INV-18`, `INV-21`, `INV-24`). Findings are data, never thrown, so a test can inspect them. `expectInvariants` throws `InvariantViolation('invariant_violation', { id, message })` on the first finding. The four checks are implemented as separate pure functions so later rows can extend the catalogue without touching the runner. INV-17 is not a per-tick check (it needs a second run) and is provided by `cloneRun`.

### D4 — Harnesses are pure functions returning a report

Each harness returns a `DeterminismReport` (`{ ok: boolean; detail: string }`) rather than throwing, so a test can assert or log. `cloneRun` clones via `cloneWorld`, steps both worlds with the same `TickInput`, and compares `hashWorld`, `events`, and `outcomes`. `doubleRun` clones the input world for each of two runs, steps `ticks` times, records a hash every `interval` ticks (default `10`), and compares the checkpoint arrays. `saveContinue` runs one clone uninterrupted, runs a second clone to `saveAtTick`, encodes/decodes it through the world codec, continues the decoded world, and compares final hashes; a decode error is a failed report, not a throw. All use `hash: true` inputs internally where a hash is needed and never mutate the caller's world.

### D5 — Assertion helpers wrap the harnesses

`expectHashStable(run)` calls the thunk twice and throws `InvariantViolation('hash_unstable')` when the results differ. `expectSameState(a, b, registry)` throws `InvariantViolation('state_mismatch')` when the two hashes differ. They are thin wrappers so failures carry a clear invariant code.

### D6 — Content builders are deliberately absent

The `content()` builder, and query/assertion helpers such as `stock`, `producerStatus`, and `satisfaction`, need a compiled registry and component schemas. They are owned by `add-testkit-content-builders` (1.5) and by the system rows that define those components, so this change leaves them out.

## Amendments and clarifications to 01–07

None. The harness implements VER-5.2, VER-6, and VER-8.1 without refining any document.

## Risks / Trade-offs

- [`checkInvariants` covers only four invariants] → intentional: it is the M0 subset, and the function is structured so each later row adds its invariant.
- [Harnesses re-run the pipeline, which is cheap for no-ops but grows] → they are test-only and scenario-scoped; property and scenario budgets bound their use (VER-7.3, VER-9).
- [The builder's empty default registry limits what it can build now] → content arrives in 1.5; until then tests exercise the pipeline and world model, which is exactly the M0 goal.

## Migration Plan

Additive source and test files inside `@aesfw/testkit`; no state, save, protocol, or golden artifacts exist. Rollback is reverting the change.

## Open Questions

None blocking.
