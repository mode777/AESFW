# Tasks

## 1. Keyboard map and palette

- [ ] 1.1 Implement the complete `keymap.ts` table (all REF-13.2 keys per mode) with unit tests per mode; verify the [REF-13.2] speed, cursor-announcement, and Tab-cycling scenarios.
- [ ] 1.2 Implement the `gridCursor` with `aria-live` announcements on the focused island; verify the [REF-15] announcement scenario.
- [ ] 1.3 Implement the command palette (Ctrl+K, localized names, substring filter, keyboard-only) reusing the shared payload builders; verify the [REF-13.2, REF-13.4] palette scenarios.

## 2. Table mode, theme, motion

- [ ] 2.1 Compose `tableView` from the existing selectors with all PIC-17 sections in order; verify the [PIC-17] completeness and keyboard-operability scenarios.
- [ ] 2.2 Implement the dark theme (token inversion via `data-theme`, persisted setting) and the reduced-motion switch (interpolation, camera, UI transitions; transports jump); verify the [REF-10.1, REF-15] scenarios.

## 3. Accessibility

- [ ] 3.1 Implement `entityLabel` (code, state, block reasons, localized) and apply `role="img"` to shapes and islands; verify the [REF-16] label scenario.
- [ ] 3.2 Add axe-core scans to the Playwright suite (HUD, residence panel, place mode, routes window) on the verification box; verify the [REF-15] no-serious-violations scenario.

## 4. Opening flow and M11a close-out

- [ ] 4.1 Implement the data-driven Playwright opening flow (milestone steps: first chain, advancement, second location, route, trade) and wire it into the browser CI stages; verify the [REF-18] opening-flow scenario on the verification box.
- [ ] 4.2 Run all smoke flows plus the opening flow; fix findings; verify green [VER-13.2].
- [ ] 4.3 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections.
- [ ] 4.4 Update 08 with any M11a exit-criterion wording change found during close-out; no other document change expected.

## Workflow follow-up

- Record the human playtest note in 08 §11 (M11a) after a session on the deployed build — the milestone gate, not part of this change's checkboxes.
- After 11.4 archives: M11a exit-criteria review (strict validation, SCN-14, balancing targets, playtest note), then M11b (11.5 → 11.6).
