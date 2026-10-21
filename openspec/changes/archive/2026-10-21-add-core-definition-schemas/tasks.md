# Tasks

## 1. Shared schema fragments (design D1, D2, D3)

- [x] 1.1 Create `packages/content/src/schemas/common.ts` with the ID, local-reference, quantity, storage, item-reference, and rate-reference fragments per design D2/D3. Verify: `pnpm type-check` green.
- [x] 1.2 Create `packages/content/src/schemas/ids.ts` with `isValidDefinitionId` per design D4.

## 2. Definition schemas (design D1, D2, D3)

- [x] 2.1 Create `packages/content/src/schemas/resource.ts` with `ResourceSchema`.
- [x] 2.2 Create `packages/content/src/schemas/location.ts` with `LocationTemplateSchema`.
- [x] 2.3 Create `packages/content/src/schemas/recipe.ts` with `RecipeSchema`.
- [x] 2.4 Create `packages/content/src/schemas/entity.ts` with `EntityDefinitionSchema` and its components.
- [x] 2.5 Create `packages/content/src/schemas/population.ts` with `PopulationTierSchema` and `GrowthPolicySchema`.
- [x] 2.6 Create `packages/content/src/schemas/need.ts` with `NeedSchema` and `NeedCategorySchema`.

## 3. Catalogue and validation (design D5, D6)

- [x] 3.1 Create `packages/content/src/schemas/collections.ts` with `DEFINITION_COLLECTIONS`, `COLLECTION_ORDER`, and `DEFINITION_SCHEMAS` per design D6.
- [x] 3.2 Create `packages/content/src/schemas/validate.ts` with `validateSchemas`, `RawDefinition`, and `RawDefinitions` per design D5, emitting `invalid_definition_document`, `unknown_definition_type`, `schema_invalid`, and `invalid_id`.
- [x] 3.3 Add `packages/content/src/schemas/validate.test.ts` with one test per spec scenario for validation, ID rules, and each diagnostic code.

## 4. Schema tests (design D3)

- [x] 4.1 Add `packages/content/src/schemas/schemas.test.ts` with one test per spec scenario for the resource, location, recipe, entity, population, need, need-category, and growth-policy schemas, including boundary rejections.

## 5. JSON Schema export (design D7)

- [x] 5.1 Create `packages/content/src/schemas/export.ts` with `exportJsonSchemas` per design D7.
- [x] 5.2 Create `packages/content/scripts/export-schemas.mjs` and add the `export:schemas` script to `packages/content/package.json`; add `schemas` to the package `files` list.
- [x] 5.3 Run the build and the export script to generate `packages/content/schemas/*.json`.
- [x] 5.4 Add `packages/content/src/schemas/export.test.ts` asserting the committed files equal `exportJsonSchemas()`.

## 6. Public surface (design D1)

- [x] 6.1 Create `packages/content/src/schemas/index.ts` and extend `packages/content/src/index.ts` to re-export the schemas, catalogue, ID rules, and validation. Verify: `pnpm type-check` green.

## 7. Documentation

- [x] 7.1 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive). Verify: rows 1.3–1.6 dependency columns still accurate.
- [x] 7.2 Confirm no amendment to 01–07 is required; record in design.md if one emerges.

## 8. Final verification

- [x] 8.1 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. [CONT-4, CONT-6.1, CONT-6.2, CONT-6.4, CONT-6.7, CONT-6.8, CONT-6.9, CONT-6.10, CONT-6.11, CONT-6.13, CONT-6.14, CONT-11.2, TDS-7, TDS-20.2, TDS-20.4]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 1.2 with "✓ archived <date>" in `docs/08`.
