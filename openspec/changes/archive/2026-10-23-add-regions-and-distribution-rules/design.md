# Design

## Context

`Location.region` (core), the store encoding for it, the world-location `region` schema field, and the protocol's optional `region` fields already exist from earlier rows; the planner hardcodes `region: null` (`packages/content/src/world/plan.ts:177,200`). 3.5 delivered authored `properties`/`source_slots` on templates. The only new state is the two collections, the template `region` field, and the generation descriptor.

## Goals / Non-Goals

- Goals: region membership on plans and locations, disjoint validation of authored attributes, seeded generation of property vectors and slots, region exposure in projections.
- Non-Goals: fog filtering (8.4), establishment (8.3), exchanges (9.1), whole-catalogue graph validation (10.1).

## Decisions

### D1 — Collections append to the end of the handle space

`regions` → `'region'` and `distribution_rules` → `'distributionRule'` are appended after `transport_order_templates` in `DEFINITION_COLLECTIONS`/`DEFINITION_SCHEMAS` and to the core `DefinitionType` union. Handle assignment iterates `COLLECTION_ORDER`, so appending keeps every existing handle and golden unchanged. `location_establishment` (8.3) will append after them.

### D2 — Effective region and plan resolution

`templatePlan` resolves the effective region: the world-location entry's `region` when the key is present (an explicit `null` clears the template's), else the template's `region` field, else `null`. The string ID resolves through `registry.handleOf('region', …)`; an unresolvable region pushes `unresolved_reference` (expected `region`) with the world-location path, or `unknown_region` is not introduced — the standard reference check in `resolveReferences` already covers the load, so the planner diagnostic only guards the world path. Both plan branches (grid and abstract) write the resolved handle instead of `null`.

### D3 — Validation semantics

`resolveReferences` gains a `distribution_rules` branch executed after the per-collection checks: for each rule it collects (a) structural checks — `regions.length >= 2`, no duplicates, and a non-empty disjoint specification (`properties.length > 0 || source_slot_types`) — reporting `invalid_distribution_rule`; (b) `unresolved_reference` for each `regions` entry; (c) disjointness: the matched property-name universe is the set of property names authored on any location template or world location in the catalogue matching a glob (glob = prefix star `*` matching any suffix; names are taken from templates and world-location `properties` records), and the slot-type universe per region is the authored `source_slots[].type` sets of that region's locations. A name or type is *supplied* by a region when any location of that region authors a non-zero value or count; supply by two or more rule regions reports `distribution_not_disjoint` once per rule with the offending name in `args`. Validation applies in both modes: seeded generation only fills gaps, so authored data must already be disjoint.

### D4 — Seeded generation lives in `instantiateWorld`

Core cannot import content, so the plan carries a plain descriptor instead of rule data. `LocationPlan` gains optional `generated: { streamName, regions, propertyNames, slotTypes }` where `regions` are the rule's region handles in ascending handle order and the name lists are ascending. `worldPlan` attaches it to every location whose effective region is in a seeded rule (matched names from D3's universe restricted to the rule's globs; slot types from the catalogue-wide authored `source_slots` of the rule's regions when `source_slot_types` is set). At instantiation, ownership of each matched name is resolved first from authored supply — a name authored with a non-zero value or count on a location of the rule keeps its authoring region, so generation can never create a second supplier and break GDD-3.3 — and every remaining name is drawn with `nextInt(createStream(seed, streamName + '.' + nameString), regions.length)` in ascending name order. The effective vector = authored properties, plus for every matched unauthored name `{ property, value: owner === location.region ? 1000 : 0 }`, sorted by name; a location with no authored `source_slots` receives `{ type, count: 1 }` for each slot type owned by its region, ascending. Iteration is by ascending name (documented total order); values are plain integers, no rounding. Repetition with the same seed reproduces the same assignment (tested), and different seeds exercise different draws.

### D5 — Projection surface

`locationDto` adds `region` (region string ID via `definitionId(registry, 'region', …)`) to the `properties` DTO when the location has a region; `locationSummary` populates its existing `region` field identically. `decodeLocation` gains additive decoding of `properties` (`values` + `region`) and `decodeLocationSummary` of `region`. Additive protocol fields, no version bump (precedent: `delta.hash`, `init.content`). No fog gating here — 8.4 owns knowledge filtering of these fields.

## Clarifications recorded (no normative amendment)

- The matched-name universe for validation and generation is the set of property names authored on location templates and world locations in the catalogue (D3); globs do not invent names that no location authors.
- Generated slot counts are `1` and generated property values are `1000`/`0` permille (D4); content tunes real magnitudes by authoring explicit values.
- Seeded rules still validate authored disjointness (D3): generation fills gaps but never reconciles contradictions.

## Risks / Open Questions

- Generation draws once per matched name, so adding a name or region changes the whole assignment of a seeded rule; acceptable for v1 world generation (regeneration is an explicit content act) and revisited if M11 balance needs stable incremental generation.
- The `regionMembership`/`locationProperties` store kinds stay unused; `Location` already carries both values, avoiding a store-catalogue and hash change.
