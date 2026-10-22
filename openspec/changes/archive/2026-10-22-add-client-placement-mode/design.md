# Design — add-client-placement-mode

## Context

See proposal.md — Why. Rows 3.7 (location grid) and 3.7b (placement query through the web host) are archived. The client renders from the authoritative mirror (`store/mirror.ts`) and pure selectors (`selectors/index.ts`); views are imperative DOM/SVG and are not unit-tested in the node environment. The web host answers `{ kind: 'placement_query', definition_id, location_id, logical_transform }` with `{ placement_result: { valid, revision, reasons } }` (PIC-12.1, TDS-21.1), and `definition_metadata` exposes each entity definition's `parameters`, including its `components` (PIC-4). REF-10.2/10.3, REF-12.2/12.4, REF-13.1–13.4, and REF-14.3 define the visual language, the views, the interaction model, and the rendering layers.

## Goals / Non-Goals

**Goals:** a pure, unit-tested placement selector surface (palette entries, footprint and ghost shape, authoritative validity, keyboard actions, command payloads, construction commands, command notice); a build palette; a ghost layer on the grid whose validity is authoritative; keyboard placement; construction-command submission from the inspector; a command-result notice; shell wiring.

**Non-Goals:** the world map (6.8); throughput indicators (5.4); population/transition UI (7.9); economy and planning views (4.7); the route editor (6.9); coverage radii; fog filtering (8.4). No client-side placement-validity computation: the ghost is drawn only from the `placement_result` (REF-13.3, REF-17). Pointer support is limited to the grid cursor and click-to-confirm described in REF-13.3; it is smoke-level and not unit-tested.

## Decisions

### D1 — A pure placement selector module

All derivation lives in `reference/client-web/src/selectors/placement.ts`, re-exported from `selectors/index.ts`: `paletteEntries`, `placementFootprint`, `ghostShape`, `ghostValidity`, `reasonLabels`, `placementQueryPayload`, `placementKeyAction`, `placeEntityPlanPayload`, `constructionCommands`, `commandNotice`. Each returns a plain view model and does no DOM work, so it is the unit-tested surface (06 §13.1, REF-14.2). Sorting is by ascending definition ID; the keyboard action set is closed and exhaustive.

### D2 — Placeability comes from metadata, not content

The client may not import `@aesfw/content`. A definition is placeable when its `definition_metadata` `parameters.components.placement` is present; the palette lists exactly those definitions, so an unlocked or non-buildable definition is simply absent from metadata. This uses only mechanically safe metadata (PIC-4) and computes no mechanics. The R1 content gives all six entity definitions a `placement` component, so the palette lists six entries.

### D3 — Footprint and ghost shape

`placementFootprint` reads `components.placement.footprint` as a two-integer `[width, height]`; a missing or malformed value returns `null` and the definition is not selectable for placement. `ghostShape` reuses the orientation rule of `entityShapes` (REF-12.2): an odd orientation swaps the axes; even orientations keep them. The ghost's shape kind and interior come from `shapeGrammar(archetypeOf(metadata))`, so the ghost matches the entity that would be built.

### D4 — Validity is authoritative only

`ghostValidity` maps a `PlacementResultDto | null` to `unknown`, `valid`, or `invalid`; it never inspects world state. On every cursor change the composition root sends a `placement_query` through `SessionClient.query`, coalesced to one request per animation frame (`requestAnimationFrame` when available), and writes the returned `placement_result` back into view state. Before the first result the ghost is `unknown`. `reasonLabels` localizes the returned reason codes in their authoritative order. This satisfies REF-13.3 step 4 and REF-17 (no client-side mechanics).

### D5 — Keyboard map as a pure reducer

`placementKeyAction(cursor, key, bounds)` is a pure reducer over the REF-13.2 excerpt: arrows produce `move` clamped to `[0, width-1] × [0, height-1]`, `r`/`R` produces `rotate` with `(orientation + 1) % 4`, `Enter` produces `confirm`, `Escape` produces `cancel`, and any other key produces `none`. A `move` or `rotate` resets the stale `result` to `null`, so the ghost returns to `unknown` until the next authoritative answer. `main.ts` handles `B` to enter place mode (`nextMode`) and dispatches the action; `Escape` also clears the placement and the overlay.

### D6 — View state

`store/view-state.ts` gains a `placement` signal carrying a `PlacementCursor` (`definitionId`, `position`, `orientation`, `result`) and a pure `nextMode(current, key)`. The cursor and its latest authoritative result are client-local; discarding them never affects the session (REF-14.1, PIC-16). The existing `mode` signal carries `inspect`/`place`/`route-edit` and is rendered in the top bar (REF-13.1).

### D7 — Ghost layer and palette view

`views/location-grid.ts` gains a ghost layer (REF-14.3) rendered after the entity layer when `mode` is `place` and a definition is selected: `ghostShape` geometry plus a `ghost-valid` (ink dashed) or `ghost-invalid` (accent dashed) class, with the localized reasons in a `grid-ghost-status` line. It subscribes to `mode` and `placement`. `views/build-palette.ts` renders one button per palette entry and calls back with the selected definition ID. Pointer `pointermove` over the SVG maps the cell under the pointer to a cursor move and `click` confirms, matching REF-13.3.

### D8 — Construction commands and feedback

`constructionCommands(lifecycle)` returns `['CancelEntityPlan', 'CommitConstruction']` for a not-yet-active lifecycle, `['DeconstructEntity']` for `active`, and `[]` otherwise. `views/inspector.ts` renders a button per listed command and submits the command envelope (`{ entity_id }`) through the session client, never mutating the mirror. The composition root handles `command_result`: an accepted result is ignored and a rejected one shows the localized `commandNotice` in a `views/notice.ts` toast (REF-13.4, PIC-13).

## Amendments and clarifications to 01–07

- None. The change implements REF-10.2, REF-10.3, REF-12.2, REF-12.4, REF-13.1–13.4, REF-14.3, and PIC-12.1/13 as written.

## Risks / Trade-offs

- [Pointer mapping is untested] → the node test environment has no DOM; keyboard placement is fully covered by the pure reducer tests and pointer support stays smoke-level, matching 2.9 and 3.7.
- [Metadata query is one-shot] → definitions do not change within a session, so the palette and footprint maps are populated on `ready` and not refreshed per delta.
- [No optimistic state] → an accepted plan appears only when the next delta carries the planned entity, so a slow host briefly shows the ghost after `Enter`; this is the intended REF-13.3 behavior.
- [Ghost before the first result] → a cursor that has moved but whose query is in flight shows `unknown` (neutral dashed); it never shows a stale valid/invalid state.

## Migration Plan

Additive client modules and shell wiring. No framework or golden change. Rollback is reverting the change.

## Open Questions

- None blocking. The palette lists every definition with a `placement` component; when an unlock or build-gating mechanism reaches definition metadata, the filter can be narrowed without changing the selector surface.
