# Design

## Context

See proposal.md, "Why", for the motivation. This design records how the reference design document (`docs/07`) and the roadmap (`docs/08`) change. No code changes here. The client and content rows that this change plans implement the documents.

Current state relevant to the approach:

- **The framework already covers the Anno-style concepts.** Connector, coverage service, hub, storage module, residence tiers, automatic transitions (GDD-13.2), purpose locks (GDD-8.5), transport and routes, fog and establishment, exchanges, and unlocks are implemented and projected (M3–M10).
- **Construction proceeds without `CommitConstruction`.** A placed plan moves `planned → awaiting_resources | constructing → active` by itself (spec `sim/construction`, "Construction transitions"). The commit command only consumes reservations early. So "place = it gets built" needs no framework change.
- **Definition metadata carries `locked: true` for unsatisfied unlocks** (spec `sim/unlocks`, "Unlock metadata exposure"). It does not carry unlock conditions or progress.
- **Locations have no world coordinates** in content (03) or in the presentation mapping (04 §6).
- **The client** (`reference/client-web`) is DOM + SVG with pure selectors, a mirror, and signals (07 §14.1–14.2). This architecture is sound and is kept. It bundles only `ref.tier` (`src/content/r0.ts`) and never loads `ref.tier.presentation`.
- **06 §13.2's six smoke flows are client-agnostic** and remain valid.

Anno 1404 interface element → AESFW source (all data already projected unless noted):

| Interface element | AESFW source |
| --- | --- |
| Gold and goods slots (top left) | Owner economy (04 §10.6); location summary of the **viewed** location (04 §10.2) |
| Island name and fertilities (top centre) | Snapshot location: region, property values, slots (04 §9.1) |
| News bar (left) | Domain events (04 §11) |
| Minimap and population per tier (bottom left) | Snapshot locations and connections; location summary |
| Action bar (bottom centre) | Session control (pause, speed, step), save/load, overlays, windows |
| Build menu tabbed by tier (bottom right) | Definition metadata (04 §4) with `locked`; presentation mapping `display.category_key` and `sort_order` (04 §6) |
| Info panel (bottom right) | Entity detail, need breakdown, transport detail (04 §10.1, §10.3, §10.4) |
| Ships on the sea | Transport detail, interpolated along connections (04 §14) |
| Floating status icons | `production.block_reasons` in the snapshot (04 §9.1) |
| Upgrade allowance | Automatic transition trigger plus purpose locks (content choice) |

## Goals / Non-Goals

**Goals:**

- A `docs/07` Part B that specifies an abstract, top-down, Anno-style game HUD precisely enough for rows 11.4a–11.4f and 11.4 to be proposed one by one.
- An M11a in `docs/08` whose exit criteria include a human playtest of the deployed build.
- No change to `docs/01`–`docs/06`, the protocol, the save format, or goldens.

**Non-Goals:**

- Implementing any client or content behavior. That is owned by the planned rows.
- Scenario objectives as simulation state (13.2 stays in M13).
- Isometric projection, raster art, audio, tutorials, mobile layouts.

## Decisions

### D1. Replace the dashboard instead of running both clients

The Anno-style HUD becomes the only primary client. Table mode (07 §15) stays as the accessibility path and as the "second, simpler client" required by 04 §20. The debug overlay (07 §12.5) stays.

- *Alternative: keep the dashboard as a "planner mode".* This doubles the view surface to maintain. The planning content (supported population, chain table) survives as the statistics/planning window.
- *Alternative: evolve the dashboard.* This keeps the layout that makes the game feel like a tool.

Confirmed by the user.

### D2. One continuous world with semantic zoom and a deterministic client layout

The canvas is a single world plane:

- **Zoomed out:** locations are drawn as "islands", connections as lanes with duration labels, transport units as moving dots, and unknown locations as fog clouds.
- **Zoomed in:** the 40×40 grid of each established or known location is drawn in place.

Island positions come from a pure selector:
- regions are placed as clusters in ascending region ID order;
- locations within a cluster are placed in ascending location ID order on a fixed ring or spiral;
- each island is sized from its grid dimensions.

The layout is presentation, not mechanics, and must be stable across reloads.

- *Alternative: authored `map_position` in the presentation mapping.* This needs a 04 §6 amendment, and the user chose to leave 04 untouched. It is recorded as a later enhancement.
- *Alternative: two levels (world map ↔ location view).* This is the current model, and the user rejected it.

Confirmed by the user.

### D3. SVG with level-of-detail, not Canvas 2D

The world canvas stays SVG, with one root transform for the camera and three levels of detail:

| Level | Zoom | What is drawn |
| --- | --- | --- |
| World | Far | Island silhouettes, lanes, transports, fog; no cells or entities |
| Location | Mid | Terrain path (one cached `<path>` per location for cells and hatches), entity shapes, status markers |
| Detail | Near | Adds progress fills, working areas, radius previews, labels |

Entities outside the viewport or below the level threshold are not mounted.

This keeps the existing grid view code, `role="img"` and `aria-label` on entities (07 §15), and `data-testid` hit targets (07 §16). It also keeps vector crispness at every zoom.

- *Alternative: Canvas 2D.* Its performance is more predictable, but it loses per-entity accessibility and test hooks and means rewriting the grid renderer. It remains the fallback if row 11.6 (`add-client-performance-pass`) cannot meet 07 §14.6 with SVG. The swap is confined to `views/`, because selectors already produce view models.

### D4. HUD layout (replaces 07 §11)

Fixed HUD regions over a full-bleed world canvas:

- **Resource bar** (top left): balance with net rate, then up to six resource chips for the viewed location. The default chips are the resources tagged construction; the player can pin others in client-local settings.
- **Location banner** (top centre): code, region, ownership, slot types, and suitability chips of the viewed location. "Viewed location" means the location nearest the camera centre at location level or deeper, otherwise none.
- **News rail** (left): recent domain events and pending warnings. Clicking one jumps the camera to the subject.
- **Minimap** (bottom left): the world layout of D2 with a viewport rectangle. Below it: population per tier for the viewed location, or for the whole owner when none is viewed.
- **Action bar** (bottom centre):
  - pause, speed, and step;
  - overlay toggles;
  - window buttons (statistics/planning, routes, exchange, log);
  - save and load;
  - table mode;
  - debug.
- **Context panel** (bottom right): the build menu when nothing is selected, otherwise the info panel for the selection. Panel tabs: Build, Demolish, Routes.

### D5. Views (replaces 07 §12, section numbers kept)

| Section | View |
| --- | --- |
| §12.1 | World canvas (D2, D3) |
| §12.2 | Location level of the world canvas, using today's grid content and overlays |
| §12.3 | Context panels: build menu, residence, producer, hub, transport unit, unknown or unestablished location |
| §12.4 | Overlay windows: statistics/planning (economy and planning read models), routes (the existing route editor), exchange, log |
| §12.5 | Debug overlay (unchanged) |
| §12.6 (new) | News rail, contextual hints, and milestone tracker |

Keeping section numbers preserves existing `REF-12.x` trace tags.

### D6. Interaction changes (07 §9, §13)

- **Principle 5 is reworded:** "Every mutation is a named, visible command. One gesture may submit several commands, each validated independently and each shown in the log. The client has no hidden automations."
- **Placement:**
  - a click submits `PlaceEntityPlan`, and construction proceeds by itself;
  - a plan without materials shows as `awaiting_resources` (dashed ghost);
  - dragging a connector submits one `PlaceEntityPlan` per cell along an axis-aligned L path;
  - cells rejected by the authoritative placement query are drawn as invalid and are not submitted.
- **Placement previews:**
  - working-area and coverage radii are drawn from definition metadata parameters while placing;
  - costs are shown next to the viewed location's stock without an "affordable" judgment;
  - both depend on Risk R3.
- **Demolish mode:** submits `DeconstructEntity`.
- **New §13.5 Camera:**
  - drag or arrow keys pan (Shift+arrows move the grid cursor when a location is focused);
  - the wheel or +/- zooms;
  - Home recentres on the first established location.

### D7. Visual language (07 §10)

The design tokens keep `--accent` for attention and `--focus` for selection. They add:
- categorical colours per resource role tag (`ref.tier.role.*`, used for display grouping per 04 §4);
- tier colours;
- a "sea" background;
- a terrain tint that scales with the selected suitability property.

The shape grammar (§10.2) and state encoding (§10.3) are kept. Resources appear as coloured code chips (P1, H1, C1…). No `icon_key` assets are used in v1.

### D8. Goals through a client milestone tracker

Milestones are client data in `reference/client-web`, not part of the presentation package: 04 §5 has no file kind for them, and extending it would amend 04. Each milestone is a predicate over projected facts only:
- a definition's `locked` flag cleared;
- population per tier at or above a value in a location summary;
- the number of locations with `knowledge: established`;
- the number of transport orders;
- a domain event seen (for example the first exchange trade).

Completed milestones are kept in client-local storage per save slot. Discarding them never affects the game (04 §16). Confirmed by the user.

### D9. Content choices for playability (07 Part A)

- Reference transitions S1→S2 use the trigger "automatic when eligible" (GDD-13.2). The player gates advancement by purpose-locking BM1/BM2 for `population_transition` (GDD-8.5), which is the abstract equivalent of Anno's upgrade toggle.
- The R3 presentation package is complete:
  - localized names and short descriptions for every definition;
  - `display.category_key` per tier for the build-menu tabs;
  - `sort_order`;
  - formatting;
  - a static localized unlock hint per locked definition (for example `ref.tier.entity.combiner.unlock_hint: "Requires 150 S1"`).
- The start state lets the player place the first S1 chain within the first minute, consistent with 07 §8's "start state" target.

These are 11.1 scope. This change records them in 07 §5–§7.

### D10. Roadmap restructuring (08 M11a)

The client work is split into suffixed rows so that 11.5, 11.6, and M12's dependencies keep their numbers. This follows the existing suffix precedent (3.4b, 3.6b, 3.7b). See "Document changes" below for the exact rows.

### D11. Human playtest gate

M11a's exit criteria add a human playtest on the deployed Pages build, recorded as the milestone's playtest note (08 §9 item 4). The automated part is a Playwright "opening" flow on the build/verification box, per AGENTS.md "Browser checks". The human part cannot be automated and is a release gate, not a CI gate.

## Document changes

The text to apply during implementation. Wording may be polished. The normative content may not change without updating this design.

### `docs/07` Part A

- **§5, R3 row:** append ", complete presentation package (names, descriptions, tier display categories, formatting, unlock hints), automatic advancement".
- **§7, B.7 row:** replace the text with "Advancement with four conditions (occupancy, sustained Z, costs from the location inventory under purpose `population_transition`, population-threshold unlock), triggered **automatically when eligible**; the player gates advancement with purpose locks. Decline with `refund_policy: none` and `clamp_to_target_capacity`".

### `docs/07` Part B

- **Header:** version 1.1; status "Design baseline (revised: game HUD)".
- **§9 Design principles** become:
  1. Mechanics are the art.
  2. Numbers on demand: rates, ratios, and supported population are one hover or one panel away, in tabular figures.
  3. Calm by default, colour for categories and attention.
  4. Geometry over icons.
  5. Every mutation is a named, visible command (D6 wording).
  6. Calm motion.
  7. Text is a full client (table mode).
- **§10:**
  - §10.1: add the role, tier, sea, and terrain tokens (D7).
  - §10.2: keep the shape grammar, and change the "Location (world map)" row to "Location (world level): island silhouette sized from its grid; region shown by outline pattern; unknown as a fog cloud".
  - §10.3: keep.
- **§11 Layout:** replace the diagram and bullets with the HUD of D4:

  ```text
  +------------------------------------------------------------------------------+
  | [balance +net] [chip][chip][chip][chip] |      [ location banner ]           |
  +--+                                                                 +---------+
  |N |                                                                 |         |
  |e |                       WORLD CANVAS (pan / zoom)                 |         |
  |w |                                                                 +---------+
  |s |                                                                 | CONTEXT |
  +--+-------+                                                         | PANEL   |
  | minimap  |      [ || > >> | overlays | windows | save | table ]    | build / |
  | pop/tier |                                                         | info    |
  +----------+---------------------------------------------------------+---------+
  ```

  Then: "Desktop first, minimum width 1024 px. The HUD regions are fixed; windows open over the canvas and close with Escape. The canvas always shows the world (D2); there is no separate world map or location view."
- **§12:** restructure per D5, keeping each subsection's "Shows / Data / Commands" form.
  - §12.1 world canvas, with D2 layout and D3 levels.
  - §12.2 location level (today's §12.2 content, minus "SVG grid" as a separate canvas).
  - §12.3 context panels; the inspector content moves here unchanged.
  - §12.4 overlay windows; the drawer table becomes a window table, and Inventory and Population move into the hub and residence panels plus the HUD.
  - New §12.6: "News rail, hints, and milestones" (D8; hints are derived from block reasons as already allowed by §17).
- **§13:**
  - §13.1 modes: `inspect`, `place`, `demolish`, `route-edit`.
  - §13.2 keyboard map: add X (demolish), +/- (zoom), Home, Shift+Arrows (D6).
  - §13.3 placement flow: per D6.
  - New §13.5 camera: per D6.
- **§14:**
  - §14.1: add `views/world/` and `selectors/layout.ts`.
  - §14.3: per D3.
  - §14.5: the storage key becomes `aesfw-ref.client.v2`, and milestones are stored per save slot.
  - §14.6: replace the first budget row with "Frame time while panning and zooming the world with all known locations at location level, R3 content: ≤ 8 ms p95".
- **§15:** add "The world canvas exposes a keyboard grid cursor with live-region announcements; table mode remains the complete non-visual client."
- **§17 Non-goals:**
  - keep raster art, 3D, isometric projection, audio, mobile, and multiplayer UI;
  - replace the tutorials bullet with "Tutorials or narrative onboarding. Contextual hints and the client milestone tracker (§12.6) are in scope.";
  - keep the "no client mechanics" bullet, with "placement queries" extended to "placement queries and display of metadata parameters (radii, costs)", subject to Risk R3.
- **§18:** add "A human playtest of the deployed build completes the opening script of 08 M11a without consulting the documents, and its findings are recorded."

### `docs/08`

- **§3, R-08 mitigation:** "Playable client from M2, planning view in M4, progression in M7, balance runner, game HUD client, and human playtest gate in M11a".
- **M11a table:** rows 11.1–11.3 unchanged; replace row 11.4 and add rows:

  | # | Change ID | Capability | Scope | Sources | Depends on | Size |
  | --- | --- | --- | --- | --- | --- | --- |
  | 11.4a | `add-client-game-shell` | reference/client | full-bleed HUD frame (resource bar for the viewed location, location banner, action bar, minimap and context-panel slots); presentation package loading (names, formatting); dashboard shell removed; table mode and debug overlay retained | REF-9, REF-11, REF-14.4, REF-15 | 9.5 | M |
  | 11.4b | `add-client-world-canvas` | reference/client | continuous world canvas: deterministic region-cluster layout, camera and semantic zoom, SVG levels of detail, fog clouds, lanes, interpolated transports, minimap; location level with shapes, state encoding, and overlays | REF-10, REF-12.1, REF-12.2, REF-13.5, REF-14.3 | 11.4a | L |
  | 11.4c | `add-client-construction-flow` | reference/client | tier-tabbed build menu with locked entries and unlock hints; authoritative ghost; drag-line connectors; radius previews; cost next to stock; demolish mode | REF-12.3, REF-13.3, REF-13.4 | 11.4b, 11.1 | M |
  | 11.4d | `add-client-context-panels` | reference/client | residence (need bars, Z band, advancement checklist, purpose locks), producer, hub (inventory, policies), transport unit, and location panels; floating status markers | REF-12.3, REF-10.3 | 11.4b | M |
  | 11.4e | `add-client-windows-routes-and-trade` | reference/client | statistics/planning, routes, exchange, and log windows; explore and establish from the world canvas | REF-12.4, REF-12.1 | 11.4d | M |
  | 11.4f | `add-client-news-and-milestones` | reference/client | news rail with jump-to-subject, contextual hints from block reasons, client milestone tracker | REF-12.6, REF-13.4 | 11.4d, 11.1 | S |
  | 11.4 | `add-client-polish-and-accessibility` | reference/client | complete keyboard map, command palette, table-mode completeness, axe checks, reduced motion, dark theme | REF-13, REF-15 | 11.4c, 11.4e, 11.4f | M |

- **M11a exit criteria:** append "**Human playtest gate:** on the deployed build, a player who has not read the documents builds the first S1 chain, reaches the first S1→S2 advancement, explores and establishes a second location, runs a transport route, and completes one exchange trade; the findings are recorded as the M11a playtest note. A Playwright opening flow on the build/verification box covers the same script." Change **Demo** to "first human playtest of the prototype game".
- **M11b, row 11.6 scope:** "client budgets of REF-14.6 (as revised for the world canvas) on R4 content; Canvas 2D fallback for the world level if SVG misses the budget".
- **§11 Milestone Log, M10 "Next":** add "11.4a may start in parallel with 11.1."

## Risks / Trade-offs

- **[R1] Scope growth in M11a.** One M row becomes six to seven client rows, comparable to M6. → Rows are independent after 11.4b. 11.4a starts now, in parallel with 11.1. Content and balance (11.1–11.3) stay on their own track.
- **[R2] SVG performance at world scale.** → Levels of detail mount only visible entities at location level or deeper. The terrain is one cached path per location. 11.6 measures against the revised §14.6 and owns the Canvas fallback.
- **[R3] Conflict between A12 (04 §20) and metadata display.** A12 says "A value absent from §9, §10, or §12 SHALL NOT be displayed", but the build menu, cost display, and radius previews use definition metadata (04 §4). The existing build palette already does this. → **Resolved (decided during apply, as delegated by the user):** 04 §4 already offers "exposed numeric parameters" to clients, so A12 is clarified to name §4 as a displayable source. The amendment is recorded as **A14** in 05 §26: "04 §20 (A12): definition metadata (§4) is a displayable source alongside §9, §10, and §12; clients still never infer behavior from it." It changes no behavior: the shipped build palette already displays §4 metadata.
- **[R4] Unlock progress is not projected.** `locked: true` carries no condition or progress, so "65 / 150 S1" cannot be shown. → M11a uses static localized hints (D9). Live progress needs a definition-metadata extension (04 §4) owned by a future `app/projections` row.
- **[R5] A human playtest is not reproducible.** → The automated opening flow covers the mechanics path. The human gate covers legibility and fun, and is recorded, not asserted.
- **[R6] Dashboard-specific `reference/client` requirements become obsolete.** These include the top bar, drawer views, drawer keyboard map, world-map view, map/grid toggle, and SVG grid layering. → Each client row removes or modifies the requirements it supersedes in its own delta spec. Selector-level requirements carry over.

## Migration Plan

- This change edits only `docs/07` and `docs/08`. The rollback is a revert of the change.
- The deployed Pages build keeps working until 11.4a replaces the shell.
- Client-local settings move to `aesfw-ref.client.v2`. The old key is ignored, not migrated: view settings are disposable (04 §16).

## Open Questions

- Whether authored world positions (a presentation-mapping `map_position`, 04 §6) are worth a later 04 amendment once the D2 layout has been playtested.
- The exact milestone list and its wording, settled in 11.4f after the 11.1 balance data exists.
