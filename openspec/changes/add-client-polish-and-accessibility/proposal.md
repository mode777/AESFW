# Proposal

## Why

Roadmap 08, M11a item 11.4 (final client row, after the redesign split). The HUD, canvas, panels, windows, and news rail exist, but the keyboard map is partial, there is no command palette, table mode is not yet the complete tabular client of 04 §17, accessibility is unmeasured (axe), reduced-motion and the dark theme are unimplemented (REF-15, REF-10.1). This row closes M11a's client work and carries its exit verifications: the Playwright opening flow on the build/verification box and the recorded human-playtest gate (**R-08** retirement).

Depends on: `add-client-construction-flow` 11.4c, `add-client-windows-routes-and-trade` 11.4e, and `add-client-news-and-milestones` 11.4f (all proposed in this batch — must be archived first). Order within M11: last client row of M11a; after it, only 11.5/11.6 (M11b).

## What Changes

- The complete keyboard map of REF-13.2 lands: speed keys 1–5, step `.`, B/X modes, R rotate, E toggle entity, arrows pan, Shift+Arrows move the keyboard grid cursor on the focused location with live-region announcements, +/− zoom, Home, Tab/Shift+Tab panel cycling, Enter confirm, Ctrl+K palette, C/V/S/T overlays.
- A command palette (Ctrl+K) listing every command and view by localized name with fuzzy filtering, submitting the same envelopes as the direct controls.
- Table mode becomes the complete tabular projection of the current location or world per 04 §17 (world, location, entities, needs, transport, exchange, events sections), reachable by keyboard, as the non-visual full client.
- Accessibility pass: axe-core checks in the Playwright suite over the HUD, canvas, panels, and windows; `role="img"` with localized `aria-label`s on every entity shape and island; focus visibility everywhere; reduced-motion support (interpolation easing, camera easing, UI transitions off; transports jump between authoritative positions).
- Dark theme via token inversion (REF-10.1), persisted with view settings.
- The Playwright opening flow (the M11a exit script: first S1 chain → first advancement → explore and establish a second location → one transport route → one exchange trade) runs on the build/verification box, and the human playtest note is recorded per 08 M11a.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `reference/client`: table mode is completed; keyboard map, palette, theme, reduced motion, and accessibility requirements are added.

## Impact

- **Packages:** `reference/client-web` (input, views, style tokens, i18n; axe-core as a dev dependency of the e2e suite only). No framework package changes; no phases, store kinds, commands, events, error codes, or diagnostic codes.
- **Commands:** none new — the palette reuses existing envelopes.
- **CI:** the opening flow joins the browser stages (build/verification box or CI L7/L10 per AGENTS.md).
- **Goldens:** none.

## Out of scope

- `add-reference-content-full` (11.5) and `add-client-performance-pass` (11.6): R4 content and budgets.
- Tutorials, narrative onboarding, audio, mobile layouts (07 §17).
- New protocol fields or projection changes for unlock progress (redesign R4).
