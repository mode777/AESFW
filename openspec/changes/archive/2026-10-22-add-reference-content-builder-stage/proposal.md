# Proposal

## Why

Roadmap 08, M3 item 3.6 (`add-reference-content-builder-stage`, capability `reference/content`, size S). M3 is the space-and-construction milestone and retires R-09 (spatial and placement complexity). Rows 3.1–3.5 delivered the grid policy, the construction lifecycle, the placement predicates and commands, connectivity, and slot/area sources, and row 3.4b made the `connectivity` entity component authorable, but the reference content package `ref.tier` is still the R0 seed: one abstract-capacity location, infinite sources, and a scale-1000 loop. There is no reference content that exercises a grid location, source slots, a working area scaled by a location property, a connectivity provider, or the construction resource `BM1`, so rows 3.7 and 3.8 (client grid and placement) have nothing concrete to render or build. Depends on: `add-placement-predicates-and-commands` (3.3), `add-connectivity-requirement` (3.4), `add-slot-and-area-sources` (3.5), and `add-connectivity-content-component` (3.4b) — all archived 2026-10-22.

## What Changes

- Advance `reference/content/ref.tier` to the **R1 builder stage, part 1** of 07 §5: one grid location 40×40 with a seeded buildable ratio and a source-slot and suitability property vector, the construction resource `BM1`, a slot extractor, an area extractor, a refiner, and a connectivity connector, alongside the existing population tier, need, and residence.
- Rescale the reference storable resources to the reference base scale `6000` base units per display unit of 07 §4, so every Appendix B rate is an exact integer per tick (slot extractor 400/tick, refiner 12000→6000 over 30 ticks).
- Author the new entity components through the schemas closed by 3.4b/3.5: `resource_source` with `slot_dependent` and `area_dependent` policies, `placement.requires_slot` and `placement.working_area`, `resource_source.scale_by_property`, and `connectivity.requires`/`provides`.
- Add a reference content test project that validates the package through the real content pipeline (parse, schema, registry, strict validation) and asserts the R1 component shapes.
- Update the reference presentation package for the new codes and the `6000` display scale.
- No **BREAKING** changes; no **HASH-CHANGING** framework artifacts. Reference content is not consumed by any framework test or golden.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `reference/content`: replaces the R0 seed description with the R1 builder-stage part-1 content (grid location, `BM1`, slot and area extractors, refiner, connector), the `6000` base scale, and the R1 entity connectivity and placement components.

## Impact

- **Packages:** `reference/content/ref.tier/**` and `reference/content/ref.tier.presentation/**` (data only), plus a new `reference/content/test/**` validation test and a Vitest project for it. No framework package changes.
- **Tick phases:** none. **Commands:** none. **Events:** none. **Error codes:** none. **Store kinds:** none (the content only authors components that already exist).
- **Out of scope (later roadmap rows):** the client grid, shape grammar, and overlays (3.7 `add-client-location-grid`); the client placement mode (3.8 `add-client-placement-mode`); Credits, maintenance, and the deficit policy (4.1 `add-balance-resources-and-income`, 4.2 `add-maintenance`, 4.3 `add-owner-deficit-policy`); the storage module and hub throughput (5.1 `add-throughput-allocation`); the full R1 balance, capabilities magnitudes, and balancing targets (11.2 `add-balance-runner-strategies`); regions, distribution rules, and seeded property/slot vectors (8.1 `add-regions-and-distribution-rules`); and `EP`/`BM2`–`BM4`/`AK2`–`AK4` (R3/R4 content, 11.1, 11.5).
- **Verification impact:** `aesfw validate reference/content/ref.tier --strict` exits `0`; the new reference content test runs under `pnpm test`; no framework test or golden changes.
