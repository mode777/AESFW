# Tasks

## 1. Window infrastructure

- [ ] 1.1 Turn the window host into a registry with an ordered open-stack (cap two), Escape popping the top, and action-bar plus keyboard toggles (`E/P/L/X/G`); verify the [REF-13.2, REF-16] window-key scenarios.
- [ ] 1.2 Implement `logLines` (bounded ring, newest first, filters by type/location/entity, subject references); verify the [REF-12.4, PIC-11] log scenarios.

## 2. Window contents

- [ ] 2.1 Move the economy selector into the statistics window and add the tier pyramid (per location and owner) and capability supply-versus-demand; verify the [REF-12.4] statistics scenarios.
- [ ] 2.2 Re-host the planning window (unchanged selector) with visibility-driven `planning` queries; verify the [PIC-10.5] scenarios still pass.
- [ ] 2.3 Move the logistics and route editor into the routes window with unit/order lists and detail; verify the [REF-12.4] routes/editor scenarios.
- [ ] 2.4 Move the exchange view into the exchange window with the trade shortcut now prefilled into the routes window; verify the [PIC-10.7] and shortcut scenarios.
- [ ] 2.5 Render the log window with filters and click-to-select; verify the [PIC-11] interaction test.

## 3. Explore and establish from the canvas

- [ ] 3.1 Wire island selection and the location panel to `expansionDraft(mode, island)` opening the routes window prefilled, with the EP cost displayed from metadata; verify the [REF-12.1, GDD-16.2/16.3] scenarios.
- [ ] 3.2 Delete the provisional drawer views, the notice strip remnants, and the population drawer; verify no drawer `data-testid` remains and statistics/pyramid covers the `V` content.

## 4. Tests and documentation

- [ ] 4.1 Run smoke flows and the logistics/exchange selector suites against the windows; verify green [VER-13.2].
- [ ] 4.2 No 01–07 amendment expected; record the window key map (D5) here for 11.4 to normalize.
- [ ] 4.3 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections.
