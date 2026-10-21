# Tasks

## 1. Core types (design D1, D4, D5, D6)

- [x] 1.1 Add `JsonValue` to `packages/core/src/det/canonical.ts` and export it from `packages/core/src/det/index.ts`. Verify: `pnpm type-check` green.
- [x] 1.2 Create `packages/core/src/errors/diagnostic.ts` with the `Diagnostic` shape of TDS-20.3. Verify: `pnpm type-check` green.
- [x] 1.3 Create `packages/core/src/registry/types.ts` with `DefinitionType`, the function-based `Registry`, and `createEmptyRegistry()` (design D5). Verify: `pnpm type-check` green.

## 2. Component stores (design D2, D3)

- [x] 2.1 Create `packages/core/src/world/component-store.ts` with `COMPONENT_KINDS`, `ComponentKind`, `ComponentStore<T>`, `createComponentStore`, and `ComponentStores`/`createComponentStores` per design D2/D3. Verify: `pnpm type-check` green.
- [x] 2.2 Add `packages/core/src/world/component-store.test.ts` with one test per spec scenario: `[TDS-8.2] store iteration is ascending by entity ID`, `[TDS-8.2] tombstones are excluded from iteration`, `[TDS-8.2] reading an unknown component is an invariant violation`; plus a compaction test for INV-24. Verify: green under `pnpm --filter @aesfw/core test`.

## 3. World record and allocators (design D4, D8)

- [x] 3.1 Create `packages/core/src/world/types.ts` with the `World` record and its authoritative sub-types per design D4, including `DerivedCaches` and `WorldSetup`. Verify: `pnpm type-check` green.
- [x] 3.2 Create `packages/core/src/world/create.ts` with `createWorld`, `allocateEntity`, and `allocateReservation` per design D8. Verify: `pnpm type-check` green.
- [x] 3.3 Add `packages/core/src/world/create.test.ts` with one test per spec scenario: `[TDS-8.1] an empty world is initialized`, `[TDS-8.1] enabled modules are recorded`, `[TDS-7][INV-10] entity allocation is monotonic`, `[TDS-7][INV-10] reservation allocation is monotonic`, `[TDS-8.1] owner state is stored by ascending handle`. Verify: green under `pnpm --filter @aesfw/core test`.

## 4. Codec (design D7)

- [x] 4.1 Create `packages/core/src/world/codec.ts` with `CanonicalState`, `encodeWorld`, `decodeWorld`, `cloneWorld`, and `hashWorld` per design D7, tagged `fnv1a64-canonical-json-v1`. Verify: `pnpm type-check` green.
- [x] 4.2 Add `packages/core/src/world/codec.test.ts` with one test per spec scenario: `[TDS-8.5][INV-18] an empty world round-trips through encode and decode`, `[TDS-8.5][INV-18] store entries round-trip with ascending entity order`, `[TDS-8.5] definition handles are encoded as string IDs`, `[TDS-8.4] derived caches are excluded from the encoding`, `[TDS-8.5] malformed state decodes to an error`, `[TDS-8.5] clone is independent of the original`, `[TDS-19.4] clone and original hash identically`, `[TDS-19.4] hash changes with authoritative state`. Verify: green under `pnpm --filter @aesfw/core test`.

## 5. Public surface

- [x] 5.1 Create `packages/core/src/world/index.ts` and extend `packages/core/src/index.ts` to re-export `world`, `registry`, and `Diagnostic`. Verify: `pnpm type-check` green; the core zero-dependency test still passes.

## 6. Documentation

- [x] 6.1 Apply amendment A-04 from design.md to TDS-20.3 in `docs/05_Technical_Design_Specification.md`. Verify: the note names `@aesfw/core` as the definition site with roadmap-0.5 provenance.
- [x] 6.2 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive). Verify: rows 0.6–0.9 dependency columns still accurate.

## 7. Final verification

- [x] 7.1 Run `pnpm verify` on a clean checkout; all green, including the new world-state tests and the `@aesfw/core` coverage thresholds. `pnpm trace` is introduced by `add-traceability-tool` (0.8) and is not runnable yet — note its absence. [TDS-8, ARCH-3, ARCH-4.2, INV-10, INV-18, INV-24]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 0.5 with "✓ archived <date>" in `docs/08` and confirm row 0.6 becomes unblocked.
