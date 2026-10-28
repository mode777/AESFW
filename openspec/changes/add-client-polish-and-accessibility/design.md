# Design

## Context

See proposal.md "Why". After 11.4a–f the HUD surface is complete; this row normalizes input, completes table mode, and measures accessibility. Tokens live in `style/tokens.css` (light values only today); signals drive all views; the e2e suite (Playwright) exists for smoke flows; per AGENTS.md, browser runs happen on the build/verification box or in CI, not in this container.

## Goals / Non-Goals

**Goals:**

- One keyboard map, fully implemented and documented in the client.
- Table mode as the honest 04 §17 client (the "second client" of PIC-20).
- Measured accessibility (axe) and motion/theme preferences honored.
- The M11a exit verifications executed and recorded.

**Non-Goals:**

- Performance work (11.6); R4 content (11.5); new mechanics or protocol; tutorials (non-goal by 07 §17).

## Decisions

### D1. Keyboard map as data

`input/keymap.ts` maps `(mode, key, modifiers) → action` as one pure table (extends the existing `placementKeyAction`/`nextMode` helpers rather than replacing them). Shift+Arrows operate a `gridCursor` on the focused island (11.4b's focus concept) with announcements through an `aria-live` region fed by a pure `cursorAnnouncement(cell, occupant)` string. Tab order is DOM order; panels and windows declare their focusables via `tabindex` management in the generic row/section renderer.

### D2. Palette reuses command builders

`paletteEntries(commands, views, presentation)` produces `{id, label, run}` from the same pure payload builders the direct controls use (never a second envelope construction site). Filtering is case-insensitive substring on the localized label; ordering is label then id (total order). The palette is a window in the 11.4e registry with keyboard-only operation.

### D3. Table mode sections from existing selectors

Each PIC-17 section maps to an existing selector: locations/connections (snapshot), properties/slots/inventory (`inventoryRows` + summary), entities (archetype/state encoding pass), needs (`needRows` per residence), transport (routes window data), exchange (quotes), events (`logLines`). One `tableView(mirror, viewState, presentation)` composer renders the sections in the fixed PIC-17 order; missing data renders an empty section header (honest emptiness).

### D4. Dark theme and reduced motion

Tokens split into `{light, dark}` maps applied by a `data-theme` attribute on the root (client-local setting defaulting from `prefers-color-scheme`, itself read once at startup — an environment read in the shell, allowed for the client). Reduced motion: one boolean in view state (from `prefers-reduced-motion` or manual override) consumed by the interpolation hook (11.4b D4), camera easing, and a `--motion: 0ms` token cascade. No encoding or layout changes between themes (contrast constants already fixed in REF-10.1).

### D5. Axe in the e2e suite only

`axe-core` is a devDependency of the Playwright suite (not shipped). The scan runs on four states (HUD idle, residence panel, place mode with ghost, routes window). `aria-label`s come from a pure `entityLabel(shape, state, presentation)` helper — one place, unit-tested, used by the canvas and table mode.

### D6. Opening flow and the human gate

The Playwright script is data-driven from the milestone list (11.4f) — each milestone is a step with its own assertions — so the script and the tracker cannot drift. It joins the CI browser stages; local runs use the verification box per AGENTS.md. The human playtest note is a milestone-log entry (08 §9 item 4), written when M11a closes; this row's task list carries it as a follow-up bullet, not a checkbox (it gates the milestone, not this change).

## Risks / Trade-offs

- [axe flags SVG contrast on overlays] → fix tokens, never waive; if a finding is a false positive, document it in the change with the axe rule id.
- [Complete table mode is a lot of rendering] → sections reuse selectors; the table is only mounted while active; budgets checked in 11.6.
- [Keymap regressions across modes] → the keymap table is exhaustively unit-tested per mode.

## As built

- **Keyboard map** (1.1, 1.2): `input/keymap.ts` resolves one action per key and mode: Space pause, `1–5` speed, `.` step, `B` build, `X` demolish, `R` rotate (place only), `E` toggle the selected entity (outside place), arrows pan, Shift+arrows move the grid cursor, `+`/`−` zoom, `Home` recentre, `C/V/S/T/O` overlays, `Escape` cancel, `Ctrl+K` palette, and `Alt+E/P/L/Y/G/T` windows. Window toggles moved to Alt so the plain letters stay free for gameplay, which is the normalization 11.4 owed 11.4a/11.4e. `KEY_HINTS` lists the map for the help line.
- **Grid cursor and announcements** (1.2, partial): Shift+arrows produce a `cursor` action and the main composition moves the placement cursor when placing. A dedicated `aria-live` announcement region for the focused island is not added; the islands and entity shapes carry `role="img"` with localized `aria-label`s, and the canvas is fully mirrored by the table window. Recorded as a deviation, not claimed.
- **Command palette** (1.3): `selectors/palette.ts` holds the command and view catalogue with label and keyword matching, and `views/hud/command-palette.ts` renders it keyboard-only (Arrow keys, Enter, Escape) with `Ctrl+K`. The action bar gained `commands` and `theme` buttons.
- **Table mode** (2.1): the tables window still renders the inventory and population tables; composing the full PIC-17 ordering is deferred to 12.x tooling, recorded here.
- **Theme and motion** (2.2): `data-theme="dark"` inverts the neutral tokens; the theme button flips it and the setting persists under `aesfw-ref.client.v2`. A `prefers-reduced-motion` media query zeroes `--motion`, transitions, and animations. Transport interpolation does not exist yet (11.4b recorded it), so there is nothing to disable there.
- **Labels** (3.1): islands and entity shapes already carry `role="img"` and localized `aria-label`s; the context panels and table window give the same information textually.
- **Axe** (3.2): `e2e/accessibility.spec.ts` scans the HUD, a residence panel, place mode, and the routes window with `@axe-core/playwright`, failing on serious or critical violations. It runs on the build/verification box like the other Playwright flows.
- **Opening flow** (4.1): `e2e/opening-flow.spec.ts` is a data-driven list of the opening steps (build menu, select and place a residence, inspect it, statistics, routes, exchange, milestones) and asserts each is reachable through the client. The long-horizon outcomes (advancement, route, trade) stay with SCN-14, which simulates the same content headlessly; the flow notes this rather than pretending a browser session can run 900 ticks.
- **Close-out** (4.4): no M11a exit-criterion wording changed; the human playtest note remains the milestone gate.

## Migration Plan

- Additive settings, views, and tests; the theme default stays light. Rollback = revert.
