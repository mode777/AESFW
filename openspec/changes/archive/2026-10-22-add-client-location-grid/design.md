# Design — add-client-location-grid

## Context

See proposal.md — Why. Rows 2.9 (inspector/tables), 3.6 (R1 builder content), and 3.6b (spatial projection data) are archived. The client renders from the authoritative mirror (`store/mirror.ts`) and pure selectors (`selectors/index.ts`); views are imperative DOM/SVG and are not unit-tested in the node environment. The projection now carries `LocationDto.grid`, `EntityDto.spatial`, and `EntityDto.connectivity`, and `definition_metadata` queries return mechanically safe entity definitions. REF-10, REF-12.2, and REF-14.3 define the visual language, the grid view, and the rendering layers.

## Goals / Non-Goals

**Goals:** a pure, unit-tested grid selector surface (cells, shape grammar, archetype derivation, entity shapes, state encoding, connectivity and suitability overlays); an SVG grid view with the REF-14.3 layering; the `C` and `S` overlays as client-local view state; shell wiring.

**Non-Goals:** placement mode, build palette, ghost preview, construction commands (3.8); the world map (6.8); throughput indicators (5.4); population/transition UI (7.9); coverage radii; slot markers; fog filtering (8.4). The seeded R1 entities have no logical transform, so the grid renders geometry only until entities are placed (3.8).

## Decisions

### D1 — A pure grid selector module

All derivation lives in `reference/client-web/src/selectors/grid.ts`, re-exported from `selectors/index.ts`: `gridCells`, `shapeGrammar`, `archetypeOf`, `entityShapes`, `stateEncoding`, `connectivityOverlay`, `suitabilityOverlay`. Each returns a plain view model and does no DOM work, so it is the unit-tested surface (06 §13.1, REF-14.2). Sorting is by ascending entity ID or packed cell index.

### D2 — Archetypes come from definition metadata, not content

The client may not import `@aesfw/content`, so it cannot read `mappings.yaml` or entity definitions directly. It derives an archetype from the `definition_metadata` query (PIC-4), which exposes each entity definition's `parameters` including its `components`. `archetypeOf` inspects those components only; it computes no mechanics. `main.ts` queries `definition_metadata` for `entity` once the session is ready and keeps a `definition_id → archetype` map. Definitions without a recognisable component fall back to `box` (REF-14.4). The combiner/advanced-combiner notch decoration is not derivable because recipe input counts are not in the entity metadata; a producer renders as the refiner square. This is recorded as an open question.

### D3 — Shape descriptors

`shapeGrammar` returns `{ kind, interior }` for every REF-10.2 archetype. `kind` is one of `square_inner_square`, `line`, `triangle_ring`, `triangle_area`, `square`, `square_notches`, `circle`, `diamond`, `square_bars`, `dot`, `box`; `interior` is one of `storage_bar`, `progress_rise`, `progress_sweep`, `occupancy_rings`, `none`. The view renders the kinds it knows and falls back to a rectangle for any other kind, so an unknown mapping never breaks the grid.

### D4 — Entity shapes and orientation

`entityShapes(location, entities, archetypes)` returns `{ entityId, x, y, width, height, shape, state, label }` for every entity in the location that carries `spatial`. `orientation` is an integer quarter-turn: orientation `1` or `3` swaps the footprint width and height; orientation `0` or `2` keeps them. The position is the logical position from the DTO. Entities without `spatial` are omitted (the seeded R1 entities). The label is the localized definition ID.

### D5 — State encoding

`stateEncoding` maps the DTO's lifecycle, production state, and block reasons to the REF-10.3 states. Block-reason glyphs: `missing_input`, `no_source_slot`, `no_working_area` → `I`; `missing_capability` → `C`; `missing_inventory_access` → `A`; `missing_output_capacity` → `O`; `throughput_throttled` → `T`. `disabled` and `paused_by_deficit` are not in the snapshot `EntityDto` (they are in `EntityDetailDto`), so the grid derives them only from `lifecycle`; the inspector shows the full detail.

### D6 — View layering

`views/location-grid.ts` renders one `<svg>` with `viewBox="0 0 width height"` and the REF-14.3 layers: a background layer (one `<path>` for all blocked-cell hatches and one `<path>` for the cell rules), an overlay layer (the suitability tint and the connectivity markers), and an entity layer (one `<g>` per entity, keyed by entity ID). The view subscribes to the mirror projection and the view state and re-renders on change, following the existing `replaceChildren` pattern of the other views. State classes encode blocked, throttled, planned, processing, and selected, never color alone (REF-15).

### D7 — Overlay view state

The active grid overlay is client-local view state (`store/view-state.ts`), alongside the selected location. A pure `toggleOverlay(current, key)` maps `c`/`C` to `connectivity`, `s`/`S` to `suitability`, and re-pressing the active key to none. `main.ts` handles the keys and Escape clears the overlay. The overlays read only from the projection and the selected property; they compute no mechanics.

### D8 — Overlay data

`connectivityOverlay` reads `EntityDto.connectivity` and renders a marker per entity (a filled marker when connected, a hollow marker when not), plus a hairline to the location centre so the network is legible. `suitabilityOverlay` reads `LocationDto.properties.values[propertyId]`; because suitability is a per-location value in the R1 content, the overlay tints the whole grid and shows the value in the overlay legend.

## Amendments and clarifications to 01–07

- None. The change implements REF-10.2, REF-10.3, REF-12.2, REF-13.2, REF-14.2, and REF-14.3 as written.

## Risks / Trade-offs

- [Archetype derivation is incomplete] → the combiner and advanced combiner render as the refiner square; the fallback is a plain box. Resolved when recipe metadata reaches the client (see open question).
- [No DOM unit tests] → the node test environment has no DOM; the selectors carry the tests and the view stays a thin projection of their view models (matching 2.9).
- [Blocked-cell membership cost] → `gridCells` builds a `Set` of blocked indices once per call; a 40×40 grid is 1600 cells and well within the REF-14.6 budget.
- [Metadata query is one-shot] → the map is queried on `ready`; content does not change within a session, so it does not need refreshing on each delta.

## Migration Plan

Additive client modules and shell wiring. No framework or golden change. Rollback is reverting the change.

## Open Questions

- The combiner and advanced combiner share the refiner square until recipe input counts are exposed to the client; a later row can query `definition_metadata` for `recipe` and distinguish them.
