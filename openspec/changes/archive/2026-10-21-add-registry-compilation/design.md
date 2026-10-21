# Design — add-registry-compilation

## Context

`add-definition-composition` (1.3) and `add-world-state-model` (0.5) are archived. Core defines the function-based `Registry` (0.5, amendment A-04) and TDS-7 fixes handle assignment; TDS-20.2 fixes the compilation stages. This document records the choices those documents leave open, in particular the M1 reference-kind table and the normalization form.

## Goals / Non-Goals

**Goals:** dense handles per type; resolve the M1 reference kinds; id and tag indexes; canonical normalization and `fnv1a64` checksum; a deeply frozen registry implementing core's `Registry`; `loadContent` orchestration; P-12.

**Non-Goals:** condition and curve compilation and their references (1.6); graph and economic validation (10.1–10.3); presentation registry (2.7, 10.5); migrations (12.1); testkit builders (1.5).

## Decisions

### D1 — Module layout

`packages/content/src/registry/` holds `types.ts` (`CompiledDefinition`, `ContentRegistry`), `handles.ts` (handle assignment and the string↔handle maps), `references.ts` (the reference-kind table and `resolveReferences`), `indexes.ts` (`buildIndexes`), `normalize.ts` (`normalize`, `checksum`), `build.ts` (`buildRegistry`), `load.ts` (`loadContent`), and `index.ts`.

### D2 — One dense handle space per core definition type

For every core `DefinitionType`, `buildRegistry` collects the composed definitions whose collection maps to that type (via `DEFINITION_COLLECTIONS`), sorts them by ascending string ID, and assigns handles `0..n−1`. Types with no definitions get an empty space. `stringIdOf`/`handleOf` read two maps per type. Because handles follow the sorted IDs, they are independent of input order (P-12).

### D3 — The M1 reference-kind table

`resolveReferences` walks each definition and resolves exactly these references:

| Collection | Path | Target type |
| --- | --- | --- |
| resources | `substitutes[]` | resource |
| recipes | `inputs[].resource`, `outputs[].resource`, `capability_requirements[].resource` | resource |
| entity_definitions | `components.producer.recipes[]` | recipe |
| entity_definitions | `components.residence.population_tier` | tier |
| entity_definitions | `components.residence.growth_policy` | growthPolicy |
| entity_definitions | `components.resource_source.outputs[].resource` | resource |
| population_tiers | `need_categories[]` | needCategory |
| population_tiers | `outputs[].resource` | resource |
| needs | `category` | needCategory |
| needs | `applies_to[]` | tier |
| needs | `demand.resource` | resource |
| need_categories | `members[].need` | need |
| need_categories | `evaluation.required_score_by_tier` keys | tier |

A reference that exists in no type reports `unresolved_reference`; one that exists under a different type reports `reference_type_mismatch`. A `capability_requirements` target whose resource lacks the `capability` tag reports `invalid_reference_scope`.

### D4 — Opaque and deferred references

Framework policy IDs (`spatial_policy`, `inventories[].access_policy`), local inventory references (`location.<id>`), `inventory_access_purpose`, and condition/curve references (`conditions`, `increase.condition`, `decrease.condition`, `outputs[].satisfaction_curve`) are not resolved here. Conditions and curves get their own definitions and reference checks in `add-condition-and-curve-compiler` (1.6); framework policies are host-provided built-ins. This keeps 1.4 inside its roadmap scope while letting the M1 loop compile.

### D5 — Normalization and checksum

`normalize` builds a JSON object keyed by definition type; each type maps to its definitions ordered by ascending ID, each definition being `{ id, data }` with `data` the composed raw data. Keys are not pre-sorted because `canonicalStringify` (TDS-19.3) sorts keys. `checksum` is `fnv1a64(canonicalStringify(normalize(...)))`, so it depends only on the definition set, not on file or input order.

### D6 — Frozen registry and compiled definitions

`ContentRegistry` extends core's `Registry` with `definitionOf(type, handle)`, `definitionsOf(type)`, and `tagsOf(resourceId)`. Compiled definitions are `{ id, handle, type, data }` and are deep-frozen, as are the registry and its indexes. `loadContent` never returns a mutable registry. Indexes use `Map`/`Set` internally but are exposed through functions so callers cannot mutate them.

### D7 — `loadContent` orchestration

`loadContent` runs `resolveManifests → parseFiles → validateSchemas → composeDefinitions → buildRegistry`, concatenating diagnostics in stage order. If any diagnostic is an error, it returns `{ content: null, diagnostics }`; otherwise it computes the checksum and returns `{ content: { registry, checksum, packages, presentation: null }, diagnostics }` with packages in ascending ID order. The presentation registry stays `null` until `add-reference-content-seed` (2.7).

### D8 — Dependencies and versioned artifacts

No new dependency; `@aesfw/core` (`det`, branded IDs, `Registry`) is already available. No versioned algorithm, save format, protocol version, or golden hash changes.

## Amendments and clarifications to 01–07

- None.

## Risks / Trade-offs

- [The M1 reference table is a subset] → condition and curve references are added by 1.6; graph validation (10.1) adds the remaining reachability checks.
- [`reference_type_mismatch` requires a global ID index] → the registry builds a cross-type ID index to distinguish "absent" from "wrong type"; the cost is one map lookup per reference.
- [Frozen registries complicate later extension] → later rows build a new registry; the frozen one is the runtime artifact.

## Migration Plan

Additive source and test files. No state, save, protocol, or golden artifacts exist. Rollback is reverting the change.

## Open Questions

None blocking.
