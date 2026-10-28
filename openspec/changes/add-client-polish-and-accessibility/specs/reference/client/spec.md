# Spec Delta

## ADDED Requirements

### Requirement: Complete keyboard map
The client SHALL implement the REF-13.2 keyboard map in full: `Space` pause/resume, `1`–`5` speeds, `.` step, `B` place mode, `X` demolish, `R` rotate ghost, `E` toggle selected entity, arrows pan, `Shift+Arrows` move the keyboard grid cursor on the focused location with live-region announcements, `+`/`-` zoom, `Home` recentre, `Tab`/`Shift+Tab` cycle focusable items in the active panel, `Enter` confirm, `Ctrl+K` palette, and `C`/`V`/`S`/`T` overlays. Every interactive element SHALL be reachable and operable by keyboard.

Source: REF-13.2, REF-15

#### Scenario: Speed keys set the speed
- **WHEN** `3` is handled
- **THEN** a `control` command with speed `4` is issued

#### Scenario: The grid cursor moves with announcements
- **WHEN** `Shift+ArrowRight` is handled on a focused location
- **THEN** the grid cursor moves one cell and a live region announces the cell and its occupant

#### Scenario: Tab cycles the active panel
- **WHEN** `Tab` is handled in the context panel
- **THEN** focus moves to the panel's next focusable item in order

### Requirement: Command palette
The client SHALL provide a command palette on `Ctrl+K` listing every command and view by localized name with substring filtering, ordered by name then stable id. Activating an entry SHALL perform exactly what its direct control performs (same envelope or view action), and the palette SHALL be operable by keyboard only.

Source: REF-13.2 (Ctrl+K), REF-13.4

#### Scenario: The palette filters by name
- **WHEN** the palette opens and `exch` is typed
- **THEN** only entries whose localized name contains `exch` (case-insensitive) are listed

#### Scenario: The palette submits the same envelope
- **WHEN** the "toggle entity" entry is activated for the selected entity
- **THEN** the same `SetEntityEnabled` envelope is submitted as the panel's toggle

### Requirement: Dark theme and reduced motion
The client SHALL offer a dark theme implemented by inverting the neutral design tokens per REF-10.1 (light default), persisted with view settings. Under `prefers-reduced-motion` (or a client-local override) interpolation easing, camera easing, and UI transitions SHALL be disabled and transports SHALL jump between authoritative positions; state encodings and contrast SHALL be unchanged.

Source: REF-10.1, REF-15

#### Scenario: The theme persists
- **WHEN** the dark theme is selected and the page is reloaded
- **THEN** the dark tokens are applied

#### Scenario: Reduced motion disables interpolation
- **WHEN** reduced motion is on and a transport moves between locations
- **THEN** its dot jumps between authoritative positions without easing

### Requirement: Axe accessibility checks
The Playwright suite SHALL run axe-core checks over the HUD frame, world canvas (with entities present), context panels, and each window, and SHALL report no serious or critical violations. Every entity shape and island SHALL carry `role="img"` and a localized `aria-label` naming its code, state, and block reasons; focus indicators SHALL be visible on every interactive element.

Source: REF-15, REF-16

#### Scenario: Axe reports no serious violations
- **WHEN** the axe scan runs over the HUD with the residence panel open
- **THEN** no serious or critical violation is reported

#### Scenario: Entity shapes carry labels
- **WHEN** an entity shape renders at location level
- **THEN** it carries `role="img"` and an `aria-label` with its code and state

### Requirement: Opening flow
A Playwright opening flow SHALL cover the M11a exit script on the deployed-style build: build the first S1 chain, reach the first S1→S2 advancement, explore and establish a second location, run a transport route, and complete one exchange trade — driven only through the client's public controls. The flow runs in the browser-check environment (build/verification box or CI L7/L10), and the human playtest findings SHALL be recorded as the M11a playtest note.

Source: REF-18, VER-13.2, 08 M11a exit criteria

#### Scenario: The opening flow completes
- **WHEN** the Playwright opening flow runs against the built client on the R3 content
- **THEN** every step of the script completes without console errors

#### Scenario: The playtest note is recorded
- **WHEN** M11a closes
- **THEN** the human playtest note exists in the milestone log per 08 §9 item 4

## MODIFIED Requirements

### Requirement: Table mode
The client SHALL provide a table mode that renders the complete tabular projection of the current location or world per PIC-17 — sections for the world (locations, connections), the viewed location (properties, slots, inventory), entities (lifecycle, state, block reasons), needs (demand, delivery, fulfillment by residence), transport (units, orders), exchanges (quotes), and events — reachable and operable by keyboard, as the complete non-visual client.

Source: REF-15, PIC-17, 04 §17

#### Scenario: Table mode renders tables
- **WHEN** table mode is enabled
- **THEN** the client renders the inventory and population tables

#### Scenario: Table mode covers every section
- **WHEN** table mode is enabled on a world with two known locations, one route, and one exchange
- **THEN** sections for locations, connections, inventory, entities, needs, transport, and exchange quotes are all rendered

#### Scenario: Table mode is keyboard-operable
- **WHEN** table mode is enabled and `Tab` is handled
- **THEN** focus moves through the table sections in reading order
