# Tasks

## 1. Merge algorithm (design D3, D4, D6)

- [x] 1.1 Create `packages/content/src/composition/merge.ts` with `merge`, the directive handling, and `deepEqual` per design D3/D4/D6, reporting `invalid_merge_directive`.
- [x] 1.2 Add `packages/content/src/composition/merge.test.ts` with one test per spec scenario for the merge rules and list operations.

## 2. Composition (design D2, D5, D6, D7)

- [x] 2.1 Create `packages/content/src/composition/compose.ts` with `composeDefinitions` per design D2/D5/D7, emitting `unresolved_include` and `include_cycle`, and deep-freezing resolved definitions.
- [x] 2.2 Add `packages/content/src/composition/compose.test.ts` with one test per spec scenario: inheritance, override, cycles, unresolved includes, immutability, input non-mutation, and frozen results.
- [x] 2.3 Add `packages/content/src/composition/compose.prop.test.ts` for P-11: input-order independence and include associativity.

## 3. Public surface (design D1)

- [x] 3.1 Create `packages/content/src/composition/index.ts` and extend `packages/content/src/index.ts` to re-export composition. Verify: `pnpm type-check` green.

## 4. Documentation

- [x] 4.1 Apply clarification A-05 from design.md to CONT-5 §5 in `docs/03_Content_Configuration_Specification.md`.
- [x] 4.2 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive).

## 5. Final verification

- [x] 5.1 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. [CONT-5, VER-6]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 1.3 with "✓ archived <date>" in `docs/08`.
