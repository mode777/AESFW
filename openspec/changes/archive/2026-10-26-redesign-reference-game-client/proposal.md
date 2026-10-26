# Proposal

## Why

Roadmap 08, M11a ("Reference Prototype Game") and M11b. M11a is supposed to end with "the first complete playtest of the prototype" and retire **R-08** (the game is not legible or fun). As currently planned, it cannot. The framework (M0–M10) supports every mechanic an Anno-style game needs, but the reference client that `docs/07` Part B specifies is a minimalist *planner dashboard*: near-monochrome "ink on paper", numbers first, a separate world map and location grid, an inspector, and a tabbed drawer. M11a's only client row, 11.4 `add-client-polish-and-accessibility`, polishes that dashboard. Executed perfectly, M11a would produce a polished spreadsheet, not a playable game.

The deployed build (`https://mode777.github.io/AESFW/`) confirms the gap:

- It shows raw string IDs, because the client never loads `ref.tier.presentation`.
- It has an unstyled button list instead of the §11 layout.
- Its content is roughly stage R2.
- M3's exit criterion "a player can build the R1 chain from scratch in the browser" was never run (08 §11).

So R-08 has only been "mitigated" by automated first looks.

This change re-targets the reference client to an **abstract, theme-free, top-down version of the Anno 1404 interface** and restructures M11a so that it actually ends with a playable game and a human playtest. It changes `docs/07` Part B and `docs/08` M11a/M11b. Its only change to 01–04 is a one-phrase clarification of 04 §20 (A14).

## What Changes

- **`docs/07` Part B, client redesign (normative for the reference client):**
  - §9 principles are restated for a game HUD. "Mechanics are the art" and "the client never computes mechanics" stay. "Near-monochrome" and "numbers first" become "numbers on demand". "One gesture, one command" becomes "every command is named and visible; one gesture may submit several independently validated commands".
  - §10 visual language: flat top-down geometry, categorical colors by resource role and tier, terrain tinted by suitability, and an accent color still reserved for attention. There is still no raster art.
  - §11 layout is replaced by an Anno-style HUD:
    - a resource bar for the viewed location (top left);
    - a location banner (top centre);
    - a news rail (left);
    - a minimap with population per tier (bottom left);
    - an action bar (bottom centre);
    - a context panel that is either the tier-tabbed build menu or the selection info panel (bottom right).
  - §12 views:
    - one continuous **world canvas** with semantic zoom replaces the separate world map and location grid. Locations sit in a deterministic client layout, connections are lanes, transport units move along them, and fog is drawn as clouds;
    - context panels replace the inspector;
    - overlay windows (statistics/planning, routes, exchange, log) replace the drawer.
  - §13 interaction model:
    - camera pan and zoom;
    - placement creates a plan that constructs by itself;
    - drag to lay connectors;
    - radius previews;
    - demolish mode;
    - cost shown next to stock (display only, no affordability judgment).
  - §14.3 rendering stays SVG, with semantic levels of detail. A Canvas 2D fallback is owned by 11.6. §14.6 budgets are restated for the world canvas.
  - §17: contextual hints and a client-side milestone tracker are in scope. Tutorials, audio, and raster art remain non-goals.
  - §18: adds a human playtest acceptance criterion.
  - The dashboard is **replaced**, not kept alongside. Table mode (§15, the "second client" of 04 §20) and the debug overlay (§12.5) are retained.
- **`docs/07` Part A:**
  - §5/§6: R3 includes a complete presentation package (names, tier display categories, glyph keys, formatting, static unlock hints) and a start state tuned for the opening minutes.
  - §7: the reference transitions use the "automatic when eligible" trigger (GDD-13.2). Purpose locks act as the player's "allow advancement" switch.
- **`docs/08`:**
  - M11a keeps 11.1–11.3 and splits the client work into rows 11.4a–11.4f plus 11.4 (accessibility and polish, now last).
  - 11.4a can start in parallel with 11.1.
  - The M11a exit criteria gain a **human playtest gate** on the deployed build.
  - R-08's mitigation is updated.
  - M11b's 11.6 budgets refer to the restated §14.6.
  - Row numbers 11.5/11.6 are unchanged, so M12's dependencies stay intact.

## Capabilities

### New Capabilities

- None. This change amends the reference design document and the roadmap only. The `reference/client` and `reference/content` requirements change in the rows it plans (11.1, 11.4a–11.4f, 11.4), each with its own delta spec. `skip_specs: true` applies.

### Modified Capabilities

- None.

## Impact

- **Documents:** `docs/07` (Part B §9–§14, §17, §18; Part A §5–§7), `docs/08` (§3 R-08, §4, M11a/M11b tables and exit criteria), and a one-phrase clarification of `docs/04` §20 recorded as A14 in `docs/05` §26. 01–03 and 06 are unchanged. 06 §13.2's generic smoke flows remain valid.
- **Code, specs, content, goldens, save format, protocol version:** no change in this change. Later rows will supersede most dashboard-specific `reference/client` requirements: top bar, drawer views, drawer keyboard map, world-map view, map/grid toggle, and SVG shape and state encoding. Selector-level requirements (mirror, signals, localization, placement preview, command construction, "client stays on the protocol") carry over.
- **Framework:** no change is planned. Two gaps are recorded for later rows: unlock-progress exposure (definition metadata carries only `locked: true`, PIC-4) and authored world positions for locations (presentation mapping, PIC-6).
- **Clarified conflict:** the 05 §26 amendment A12 (04 §20) forbids displaying values outside 04 §9/§10/§12, but build menus, costs, and radii come from 04 §4 definition metadata. A new amendment, A14, names §4 as a displayable source. It is a one-phrase clarification of 04 §20 that matches shipped behavior (design.md, Risk R3).
- **Tooling:** `tools/trace` writes POSIX-style paths so `docs/traceability.md` is identical on Windows and Linux.
- **Out of scope:** `add-reference-content-prototype` (11.1, owns R3 content and the presentation package), `add-balance-runner-strategies` (11.2), `add-golden-complete-game` (11.3), `add-reference-content-full` (11.5), `add-client-performance-pass` (11.6), and `add-scenario-objectives` (13.2, which stays in M13; M11 uses client milestones instead).
