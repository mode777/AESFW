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

## Migration Plan

- Additive settings, views, and tests; the theme default stays light. Rollback = revert.
