# Tasks

## 1. Schemas

- [x] 1.1 [CONT-6.18] Add `RegionSchema` and `DistributionRuleSchema`, register `regions`/`distribution_rules` at the end of the catalogue, add `region` to the location-template schema, and regenerate the published JSON Schema. Verify: schema tests for a well-formed region and rule, `schema_invalid` on an unknown generation mode and unknown fields, and a template with `region`.

## 2. Core

- [x] 2.1 [CONT-6.18] Add `region` and `distributionRule` to the core `DefinitionType` union and the optional `generated` descriptor to `LocationPlan`. Verify: type-check and existing suites stay green.

## 3. Content pipeline

- [x] 3.1 [CONT-6.18] Add the `distribution_rules` branch to `resolveReferences`: structural checks (`invalid_distribution_rule`), region reference checks, and disjoint validation over authored attributes (`distribution_not_disjoint`). Verify: `[CONT-6.18]` two-regions-supply-one-property rejection, disjoint pass, zero-supplies-nothing test.
- [x] 3.2 [GDD-6.4, CONT-6.6] Resolve the effective region in `templatePlan` (override, template, null) and attach the seeded generation descriptor for seeded rules. Verify: `[GDD-6.4]` membership, override, and unknown-region tests.

## 4. Instantiation

- [x] 4.1 [GDD-6.5, TDS-15] Implement seeded generation in `instantiateWorld` (stream per name, authored values win, `1000`/`0` fill, slot `count: 1`). Verify: `[GDD-6.5]` fill test, authored-wins test, and a property test that the same seed reproduces identical vectors with every name owned by exactly one region.

## 5. Projection surface

- [x] 5.1 [PIC-9.1, PIC-10.2] Populate `properties.region` in the location DTO and `region` in the location summary; extend `decodeLocation`/`decodeLocationSummary` additively. Verify: `[PIC-9.1]` regionful and regionless projection tests plus codec round-trip.

## 6. Fixtures and integration

- [x] 6.1 Add the theme-free `fixtures/content/demo-regions` package (two regions, a fixed validated rule, a seeded rule, regionful templates and world) and exercise it through the app instantiation path. Verify: content loads with no diagnostics and the world instantiates.

## 7. Documentation and verification

- [x] 7.1 Record the universe, fill-value, and authored-disjointness clarifications (design); confirm `docs/08` needs no change beyond archiving. Verify: no unintended document diff.
- [x] 7.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
