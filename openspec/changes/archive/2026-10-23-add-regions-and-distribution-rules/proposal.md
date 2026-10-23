# Proposal

## Why

Roadmap 08, M8 item 8.1 (`add-regions-and-distribution-rules`). GDD-3.3 makes long-distance logistics exist for exactly one reason — no location and no region can supply every raw resource — but the framework cannot express that yet: the `region` field on a world location is accepted by the schema and silently dropped by the planner (`region: null` is hardcoded), there is no `regions` or `distribution_rules` collection, and location property vectors and source slots are authored-only. This change adds regions, fixed and seeded property vectors and slots, and disjoint distribution rules with generation and validation, retiring the content side of the spatial-scarcity risk R-09 and preparing the GDD-6.4 distribution guarantee that SCN-05 (8.5) and the reference R4 content build on.

## What Changes

- New `regions` collection (CONT-6.18): `{ id, tags? }`. Core gains the `region` and `distributionRule` definition types; both collections are appended after `transport_order_templates`, so existing handles and goldens are unchanged.
- Location templates gain an optional `region` field; the world-location `region` override (already in the schema) is now read. The world plan resolves the effective region to a definition handle and carries it into `Location.region` instead of writing `null`.
- New `distribution_rules` collection (CONT-6.18): `{ id, regions: [id...], disjoint: { properties: [glob...], source_slot_types }, generation: { mode: fixed | seeded, seed_stream? } }`.
- **Validation** (both modes, at load): each matched property name (globs expanded over the property names authored on location templates and world locations) and each source slot type authored on the rule's regions must be supplied by at most one of the rule's regions; violations report `distribution_not_disjoint`. Structural defects (fewer than two regions, duplicate regions, an empty disjoint specification) report `invalid_distribution_rule`. Region references resolve with the standard `unresolved_reference` check.
- **Seeded generation** (`generation.mode: seeded`): location plans in a rule's region carry a generation descriptor (matched property names, matched slot types, the rule's region handles, and the stream name, default `world_generation`). `instantiateWorld` assigns each matched name to exactly one region with `nextInt(createStream(seed, '<stream>.<name>'), n)` in ascending name order, and fills each location's effective vector: authored values win, missing matched names get `1000` in the owning region and `0` elsewhere; locations without authored `source_slots` receive `count: 1` for each slot type their region owns, in ascending type order.
- **Projection surface (PIC-9.1):** the location DTO's `properties` gain the `region` string ID, and the location summary populates its existing `region` field; the snapshot and read-model codecs decode the new additive fields.

## Capabilities

### Modified Capabilities

- `sim/world`: regions, distribution rules, seeded generation of property vectors and slots.
- `content/schemas`: the `regions` and `distribution_rules` collections, the location-template `region` field, and reference checks.

## Impact

- **Packages:** `@aesfw/core` (`region`/`distributionRule` definition types, generation descriptor on `LocationPlan`, seeded generation in `instantiateWorld`), `@aesfw/content` (two schemas, catalogue entries, reference checks, plan region resolution and validation), `@aesfw/app` (region in location DTO and location summary), `@aesfw/protocol` (additive `region` decode fields), `fixtures/` (theme-free `demo-regions` coverage).
- **Tick phases:** none — generation happens at world-plan instantiation, not in a tick phase. **Store kinds:** none new (`Location.region` and `Location.properties`/`sourceSlots` already exist and are encoded).
- **Commands/events/error codes:** none. **Diagnostic codes:** `invalid_distribution_rule`, `distribution_not_disjoint`.
- **Protocol/save format:** additive optional `properties`/`region` decode fields; no version bump. **HASH-CHANGING:** no — no shipped fixture declares regions or distribution rules, so all locations keep `region: null` and existing goldens are unchanged.
- **Dependencies on archived changes:** 6.1 `add-world-definition-and-connections` (archived 2026-10-23), 3.5 `add-slot-and-area-sources` (archived 2026-10-22).

## Out of Scope

- 8.2 `add-knowledge-and-exploration`: fog hiding region membership of unknown locations.
- 8.3 `add-location-establishment`: the `location_establishment` collection and establishment validation.
- 9.1 `add-exchange-price-state`: region-scoped exchanges.
- 10.1 `add-graph-validation`: whole-catalogue distribution graph checks beyond the per-rule validation above.
