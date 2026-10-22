# Tasks

## 1. Schema (design D1)

- [x] 1.1 Add `ConnectivitySchema` (the `requires`/`provides` union) and the optional `connectivity` field to `ComponentsSchema` in `packages/content/src/schemas/entity.ts`; update the module TSDoc to name connectivity (CONT-6.8).
- [x] 1.2 Regenerate `packages/content/schemas/entity_definitions.json` with `pnpm --filter @aesfw/content export:schemas` (after a build) and confirm the committed file equals the exported schema.

## 2. Instantiation (design D2)

- [x] 2.1 Add `connectivityNodeFrom` and the `connectivityNode` write (plus the `definition` component for connectivity-only entities) to `instantiateContentEntities` in `packages/app/src/content/instantiate.ts`; import the `ConnectivityNode` type.

## 3. Unit tests

- [x] 3.1 Extend `packages/content/src/schemas/schemas.test.ts` with the connectivity schema cases: a `requires` component validates [CONT-6.8]; a `provides` component validates [CONT-6.8]; a both-role component is rejected [CONT-6.8]; a neither-role component is rejected [CONT-6.8].
- [x] 3.2 Extend `packages/app/src/content/instantiate.test.ts` with the instantiation cases: a requiring definition yields a `requirement` node with the declared network [CONT-6.8, GDD-9.2]; a providing definition yields a `provider` node with the declared network [CONT-6.8, GDD-9.9]; a definition without connectivity yields no node [CONT-6.8].

## 4. Documentation and verification

- [x] 4.1 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none beyond the new 3.4b row (mark it done only at archive).
- [x] 4.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. [CONT-6.8, GDD-9.2, GDD-9.9]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 3.4b with "✓ archived <date>" in `docs/08`.
