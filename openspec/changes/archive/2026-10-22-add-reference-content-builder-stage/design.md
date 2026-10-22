# Design — add-reference-content-builder-stage

## Context

See proposal.md — Why. `add-slot-and-area-sources` (3.5), `add-connectivity-requirement` (3.4), `add-connectivity-content-component` (3.4b), and `add-placement-predicates-and-commands` (3.3) are archived 2026-10-22. The content schemas now accept `source_slots` on a location template, `scale_by_property` and the slot/area source policies on `resource_source`, `working_area` and `requires_slot` on `placement`, and `requires`/`provides` on `connectivity`; `@aesfw/app` instantiates the `connectivityNode` component and resolves the new source fields. The reference package is still the R0 seed (07 §5): one abstract-capacity location, infinite sources, scale `1000`. This document records the R1 part-1 content choices. It is data only: no framework behavior changes.

## Goals / Non-Goals

**Goals:** the R1 builder-stage part-1 content of 07 §5 and §7 (grid location, `BM1`, slot and area extractors, refiner, connector) as pure content validated through the real pipeline, and a reference content test project.

**Non-Goals:** the client grid and placement mode (3.7, 3.8), Credits/maintenance/deficit (4.x), the storage module and throughput (5.1), the full R1 balance and balancing targets (11.2), regions and distribution rules (8.1), and any framework or schema change.

## Decisions

### D1 — Package layout and test project

The `ref.tier` package keeps a single `content.yaml` (as in the seed) because `reference/client-web/src/content/r0.ts` bundles exactly `package.yaml` and `content.yaml` as raw text; splitting per 07 §6 would require a client change owned by 3.7. A new `reference/content/test/` directory holds the validation tests, with `reference/content/tsconfig.json` so ESLint's project service type-checks them, and a `reference-content` Vitest project in `vitest.config.ts` (resolving `@aesfw/content` and `@aesfw/core` to source). The test imports `loadContent`/`createMemorySource` from `@aesfw/content`, reads the two YAML files, and validates strict. This is a reference test, so it may use `ref.*` IDs; `packages/**` never sees them.

### D2 — Reference base scale

Per 07 §4, the reference uses `6000` base units per display unit so every Appendix B rate is an exact integer per tick: a rate of *r* per minute is `100 × r` base units per tick. The seed's `1000` scale is therefore replaced for every storable resource (`p1`, `p2`, `h1`, `c1`, `bm1`). The capability `s1` keeps `integer`/`1`. The presentation `formatting.base_scale` moves from `1000` to `6000`. The seed design recorded that the `6000` scale "arrives with R1"; this is that arrival.

### D3 — R1 definitions

- **Location** `ref.tier.location.a` becomes `framework.spatial.grid`, `width: 40`, `height: 40`, `buildable_ratio: { min: 400, max: 700 }`, `properties: { ref.tier.property.suitability_p1: 1000 }`, `source_slots: [{ type: ref.tier.slot.v_a, count: 2 }]`, one shared inventory, `activation.initial: true` (07 §7 B.1; CONT-6.4). The R0 abstract location is superseded, as 07 §5 gives R1 "one grid location 40×40".
- **Resources** gain the 07 §7 B.2 role tags (`ref.tier.role.{primary,intermediate,consumer,construction}`), `c1` gains `complexity: 1`, and `ref.tier.resource.bm1` is added as a storable construction resource.
- **Recipes** `ref.tier.recipe.refine` (`30` ticks, `6000` `p1` + `6000` `p2` → `6000` `h1`) and `ref.tier.recipe.combine` (`30` ticks, `12000` `h1` → `6000` `c1`) use the 07 §4 conversions; both keep the `ref.tier.capability.s1` requirement of the seed.
- **Entities**: `ref.tier.entity.slot_extractor_p2` (`slot_dependent`, `p2` `400`/tick, footprint `[3,3]`, `requires_slot: ref.tier.slot.v_a`), `ref.tier.entity.area_extractor_p1` (`area_dependent`, `p1` `400`/tick, `scale_by_property: ref.tier.property.suitability_p1`, footprint `[3,3]`, `working_area: { cells: 12, exclusive: true }`), `ref.tier.entity.refiner` (producer of `refine`, footprint `[3,3]`), `ref.tier.entity.connector` (`provides` `ref.tier.connectivity.hub_network`, footprint `[1,1]`), and the retained `combiner`/`residence`. The R0 infinite sources `source_p1`/`source_p2` are removed; the extractors replace them.

### D4 — Connectivity authoring and the seeding limitation

The extractors, refiner, and combiner declare `connectivity.requires: ref.tier.connectivity.hub_network`; the connector declares `connectivity.provides: ref.tier.connectivity.hub_network`. This is the GDD-9.11 connector archetype and the GDD-10.2 binary hub-access rule. It exposes a limitation of the default scenario seeding: `instantiateContentEntities` (`@aesfw/app`) creates entities without a `transform`, and the connectivity runtime (`buildConnectivityCache`, `isConnected`) reads nodes from the `transform` store, so a requirement node is never connected and the seeded producers/sources are blocked with `missing_inventory_access`. The content still validates and runs (blocked entities produce no invariant finding); the chain becomes live once entities are placed through the placement commands, which is the job of 3.7/3.8 and of the not-yet-implemented world-definition `initial_entities` path (CONT-6.6). This is recorded as a risk; no framework behavior is added here.

### D5 — Presentation

`ref.tier.presentation` gains localization entries for the R1 location, slot, property, connectivity network, resources (codes `P1`, `P2`, `H1`, `C1`, `BM1`, `S1`), and entity definitions, and its `formatting.base_scale` becomes `6000`. `mappings.yaml` keeps the existing refiner mapping (it is a skeleton until the presentation registry lands).

### D6 — Determinism, encoding, and hashes

Content is plain data; no clock, RNG, floating point, or ordering is introduced. The content defines only components that already exist, so no store kind or codec changes. No framework fixture or golden declares `ref.tier` content, so **no golden hash changes** and no versioned algorithm tag is bumped.

## Amendments and clarifications to 01–07

- None. The R1 part-1 content is a subset of 07 §5 and the Appendix B mapping of 07 §7; the `6000` scale and the conversion table are already in 07 §4.

## Risks / Trade-offs

- [The default scenario seeding does not place entities] → requirement nodes are unconnected in the seeded world and the seeded chain is blocked. The content validates and runs; placement (3.7/3.8) and the CONT-6.6 world-definition path restore the live chain. Recorded in D4; reported as a framework/scenario limitation, not patched here.
- [Rescaling to `6000` changes the numbers the client displays for the seed] → this is the intended reference convention of 07 §4; the client selects the display scale from the presentation package, which is updated here.
- [BM1 has no source or sink at R1 part 1] → construction costs and the `BM` branches are later balance/content rows; the resource is defined now so those rows and the client can reference it.
- [The `content.yaml` monolith grows] → splitting per 07 §6 is deferred to 3.7, which owns the client's raw-content bundling.

## Migration Plan

Additive and superseding reference data plus one reference test project. No framework, save-format, protocol, or golden artifact changes. Rollback reverts the content, the presentation, the test, and the Vitest project entry.

## Open Questions

None blocking.
