# Tasks

## 1. Registry types and handles (design D1, D2, D6)

- [x] 1.1 Create `packages/content/src/registry/types.ts` with `CompiledDefinition` and `ContentRegistry` per design D6.
- [x] 1.2 Create `packages/content/src/registry/handles.ts` with handle assignment and the string↔handle maps per design D2.

## 2. Reference resolution and indexes (design D3, D4)

- [x] 2.1 Create `packages/content/src/registry/references.ts` with the reference-kind table and `resolveReferences` per design D3/D4, emitting `unresolved_reference`, `reference_type_mismatch`, and `invalid_reference_scope`.
- [x] 2.2 Create `packages/content/src/registry/indexes.ts` with `buildIndexes` (ID and tag indexes) per design D6.

## 3. Normalization, checksum, and build (design D5, D6)

- [x] 3.1 Create `packages/content/src/registry/normalize.ts` with `normalize` and `checksum` per design D5.
- [x] 3.2 Create `packages/content/src/registry/build.ts` with `buildRegistry` per design D2/D6, deep-freezing the registry.
- [x] 3.3 Add `packages/content/src/registry/build.test.ts` with one test per spec scenario for handles, references, indexes, checksum, and freezing.

## 4. Content load orchestration (design D7)

- [x] 4.1 Create `packages/content/src/registry/load.ts` with `loadContent` per design D7.
- [x] 4.2 Add `packages/content/src/registry/load.test.ts` with one test per spec scenario for a valid load and an error load.

## 5. Property tests (design D2, D5)

- [x] 5.1 Add `packages/content/src/registry/registry.prop.test.ts` for P-12: handles and checksum independent of input order.

## 6. Public surface (design D1)

- [x] 6.1 Create `packages/content/src/registry/index.ts` and extend `packages/content/src/index.ts` to re-export the registry surface. Verify: `pnpm type-check` green.

## 7. Documentation

- [x] 7.1 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive).
- [x] 7.2 Confirm no amendment to 01–07 is required; record in design.md if one emerges.

## 8. Final verification

- [x] 8.1 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. [CONT-11.3, CONT-12, TDS-7, TDS-19.3, TDS-20.1, TDS-20.2]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 1.4 with "✓ archived <date>" in `docs/08`.
