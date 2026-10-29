# Proposal: fix-client-playability

## Why

Roadmap 08, M11a, new repair row **11.4g**. The M11a client rows 11.4a–11.4f and 11.4 are task-complete, but the reference game is not playable. A Playwright session on the built client (2026-10-29) showed that no building can be selected for construction, the location grid renders as black blocks, half of the start buildings are missing, and a building placed by working around the selection bug never appears. The M11a human playtest gate ("a player who has not read the documents builds the first S1 chain …") cannot be attempted. This change retires **R-08** (the game is not legible or fun) for the opening loop. It also closes a framework contract gap: projection deltas cannot express entity creation or removal.

Observed defects, all reproduced in the browser:

| # | Symptom | Root cause |
| --- | --- | --- |
| D1 | Every build-menu entry is disabled, locked or not | The DOM helper writes `disabled="false"`; any `disabled` attribute disables an HTML button. Context-panel actions are affected the same way. |
| D2 | Hidden panels stay visible: the island actions (Deactivate/Explore/Establish) and the build menu overlap the context panel | Author CSS (`display: flex`) overrides the user-agent `[hidden]` rule. |
| D3 | The grid is black blocks with oversized text; blocked terrain is indistinguishable | The location grid's SVG classes (cells, rules, shapes, glyphs, ghost, overlays, markers) have no style rules, so SVG defaults (black fill, 16px text in grid units) apply. |
| D4 | The ghost-to-cell mapping can drift | The grid's caption paragraphs share the overlay box with the SVG and shrink its square. |
| D5 | Hub, area extractors, and slot extractors are not drawn | The projection derives `location_id` only from producer, residence, and movement components. Placed entities without them get no location, so the grid omits them. |
| D6 | A newly placed building never appears, and a removed one would never disappear | `diffProjection` skips entities absent from the previous projection and ignores removed ones, and 04 §9.2 has no way to express either. Only a save/load resynchronizes. |
| D7 | Transport state changes are never delivered after the first snapshot | `transport` is missing from the delta's entity field list. |
| D8 | `B` enters place mode with a locked advanced combiner | Place mode picks the alphabetically first palette entry instead of an available one. |
| D9 | A slight mouse movement while placing a residence can place a line of residences | Drag-path placement runs for every definition, not only connectors (REF-13.3 step 4). |
| D10 | The S3/S4 build tabs read `ref.tier.category.s3` / `…s4` | The presentation package localizes `tier3`/`tier4` but maps definitions to `s3`/`s4`. |
| D11 | "Build a residence", "Build a producer", and "Run a transport route" are complete at tick 0 and persist that way | The milestone predicates count authored start entities and an idle start transport. Completions are stored per slot, so they stay wrong after a fix unless invalidated. |
| D12 | The resource bar shows only credits | Construction-tagged resource chips are looked up in entity metadata; resource metadata is never queried. |
| D13 | The context panel is filled with debug buttons (`13 ref.tier.entity.hub` …) | The entity and location lists of the M2 dashboard are still mounted in the context panel. |
| D14 | At the default zoom a cell is about 4 px; placement is impractical | Entering place mode does not bring the viewed location to a usable zoom. |
| D15 | There is no in-client guidance on how to play | No help surface exists; the playtest gate requires play without the documents. |

Preconditions: this row depends on 11.4 (`add-client-polish-and-accessibility`) and 11.6 (`add-client-performance-pass`). At proposal time those changes, and 11.4a–11.4f, are task-complete but **not yet archived**. They MUST be archived before this change is applied, so that `reference/client` carries their requirements. This change's client requirements are written as ADDED requirements, so they do not depend on those changes' requirement names.

## What Changes

- **Projection deltas carry entity creation and removal** (D6). `SnapshotDeltaDto` gains optional `entity_creates`, which holds full entity DTOs in ascending entity ID, and optional `entity_removals`, which holds entity IDs in ascending order. `diffProjection` emits them. `applyDelta` removes, then inserts in ascending entity ID order, so P-10 holds across creation and removal. The codec decodes both lists and accepts deltas without them. `PROTOCOL_VERSION` stays `1`, because the fields are additive and optional. 04 §9.2 is amended (A17).
- **Transport summaries are diffed** (D7). `transport` joins the entity fields that `diffProjection` compares. A field that disappears from an entity is deleted by `applyDelta` instead of being stored as `null`, so P-10 also holds for disappearing optional fields.
- **Every placed entity carries `location_id`** (D5). It falls back to the location recorded on the entity's logical transform. This matches the 04 §9.1 example, so no amendment is needed.
- **Boolean DOM attributes** (D1). `true` writes an empty attribute, and `false` omits it.
- **`[hidden]` always hides** (D2).
- **The location grid is styled and stable** (D3, D4). The change adds styling for terrain, grid rules, entity shapes by state, the placement ghost by validity, overlays, and status markers. Captions no longer change the SVG box.
- **Placement fixes** (D8, D9, D14). `B` selects the first unlocked entry of the active build tab. Drag paths apply only to connector-archetype definitions. Entering place mode recentres the camera on the viewed location at detail zoom when it is further out.
- **Presentation and HUD fixes** (D10, D12, D13). The change adds `ref.tier.category.s3` and `ref.tier.category.s4` localizations. Construction resource chips come from resource definition metadata. The debug entity and location lists move from the context panel into the Tables window.
- **Milestones reflect player actions** (D11). The residence and producer milestones complete on a `ConstructionCompleted` event for a matching entity. The route milestone requires a transport with an assigned order. The milestone storage key is versioned, so stale completions are discarded.
- **Help window** (D15). An action-bar `?` button and the `?` key open a Help window that lists the key map and a short opening guide. The opening guide is client strings only and computes no mechanics.
- **Opening-flow e2e** covers the real loop: select a residence by a normal click, hover until the authoritative ghost is valid, place it, run until it completes, and assert that it is drawn as an active shape. It also asserts that no unlocked entry is disabled and that hidden panels are not visible.
- Documents: 04 §9.2 amendment A17 with the 05 §26 entry, 07 clarifications for §12.6 and §13.3, and 08 row 11.4g.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/projections`: the projection delta reports created and removed entities and transport summary changes, delta application handles creation and removal, and every placed entity carries its location.
- `app/protocol`: the snapshot delta codec decodes the optional `entity_creates` and `entity_removals` lists.
- `reference/client`: adds playability requirements for boolean attributes, hidden regions, grid styling and box stability, the place-mode entry, connector-only drag paths, the place-mode camera, localized build tabs, construction resource chips, debug lists in table mode, player-action milestones, the help window, and the end-to-end placement loop.

## Out of scope

- 11.6 `add-client-performance-pass` budgets: unchanged. The design states how this change stays inside them.
- News-rail wording: raw event lines such as `CapabilityShortageDetected capability=0 …` remain. Localized news text is a follow-up for the playtest note.
- Balancing and reference content mechanics (11.1–11.3, 11.5): no change to `ref.tier` simulation content. Only the presentation package gains two localization entries.
- Rows 12.2 `add-replay-documents` and 12.3 `add-debug-tooling`: no debug-tooling changes beyond relocating the debug lists.
- The human playtest note: this change makes the gate attemptable but does not produce the note.

## Impact

- **Packages:** `@aesfw/protocol` (`SnapshotDeltaDto`, `applyDelta`, `decodeSnapshotDelta`), `@aesfw/app` (`project`, `diffProjection`), `@aesfw/host-web` (no code change; it already forwards `diffProjection` output), `@aesfw-ref/client-web`, and `reference/content/ref.tier.presentation` (localization only).
- **Tick phases:** none. Projection runs in the application layer after `step` (A2).
- **Store kinds:** read-only use of `transform`. No new stores.
- **Commands and events:** no new commands or events. The client newly reads `ConstructionCompleted` for milestones.
- **Error and diagnostic codes:** none new. Malformed new delta fields use the existing `protocol.invalid_field`.
- **Wire format:** additive optional delta fields. `PROTOCOL_VERSION` is unchanged at `1`. This is not **BREAKING**: the existing decoder ignores unknown keys, and a delta without creations or removals is byte-identical to before.
- **Golden hashes:** not **HASH-CHANGING**. State hashes (`fnv1a64-canonical-json-v1`) cover world state, not projections. No simulation code changes.
- **Client storage:** milestone completions under the old key are ignored once, so players who already loaded the broken build see their milestones reset. View settings are unaffected.
