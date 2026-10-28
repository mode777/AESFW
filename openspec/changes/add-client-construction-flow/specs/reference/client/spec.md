# Spec Delta

## ADDED Requirements

### Requirement: Drag-line connector placement
With a connector definition selected in place mode, pressing and dragging on the canvas SHALL trace an axis-aligned L path from the press cell to the current cell. The client SHALL preview every cell of the path with a `placement_query` (debounced to one batch per animation frame) and, on release, submit one `PlaceEntityPlan` per valid cell in path order. Invalid cells SHALL be drawn as invalid and SHALL not be submitted.

Source: REF-13.3, PIC-12.1

#### Scenario: A straight drag places one connector per cell
- **WHEN** the pointer drags from `[2, 5]` to `[6, 5]` with all cells valid
- **THEN** five `PlaceEntityPlan` commands are submitted in ascending x order

#### Scenario: An L path is traced axis-aligned
- **WHEN** the pointer drags from `[2, 2]` to `[5, 6]`
- **THEN** the traced path is the L with a single bend and its cells are previewed

#### Scenario: Invalid cells are skipped
- **WHEN** one cell of the path returns `valid: false`
- **THEN** no command is submitted for that cell and it renders with the invalid encoding

### Requirement: Radius previews
While placing a definition whose metadata carries a working-area or coverage radius parameter, the client SHALL draw the radius around the ghost from the metadata value. The preview is display-only and computes nothing mechanical.

Source: REF-13.3, PIC-4, REF-17

#### Scenario: A coverage radius is previewed
- **WHEN** a coverage service with metadata radius `18` is being placed
- **THEN** a hairline circle of radius 18 cells is drawn around the ghost

#### Scenario: A working area is previewed
- **WHEN** an area extractor with a working area of `12` exclusive cells is being placed
- **THEN** the working-area outline is drawn around the ghost

### Requirement: Demolish mode
The client SHALL enter demolish mode with `X` from inspect mode and return to inspect on `Escape`. In demolish mode, hovering an entity SHALL highlight it and clicking (or Enter on the keyboard cursor) SHALL submit `DeconstructEntity` for it; entities in a not-yet-active lifecycle SHALL offer `CancelEntityPlan` instead. The mode SHALL be shown in the action bar.

Source: REF-13.1, REF-12.2, ARCH-7.3

#### Scenario: X enters demolish mode
- **WHEN** `X` is handled in inspect mode
- **THEN** the mode becomes `demolish` and the action bar shows it

#### Scenario: Clicking an active entity deconstructs it
- **WHEN** an active entity is clicked in demolish mode
- **THEN** a `DeconstructEntity` command for that entity is submitted

#### Scenario: Clicking a planned entity cancels it
- **WHEN** an `awaiting_resources` entity is clicked in demolish mode
- **THEN** a `CancelEntityPlan` command for that entity is submitted

## MODIFIED Requirements

### Requirement: Build palette entries
`buildMenuEntries(definitions, metadata, presentation, i18n)` SHALL return one entry per placeable entity definition — those whose metadata carries a `placement` component — grouped by the presentation mapping's `display.category_key` (one tab per category, ordered by tier), ordered within a tab by `sort_order` then ascending definition ID, each carrying its localized label, shape archetype, footprint, and construction costs from definition metadata. Locked definitions (metadata `locked: true`) SHALL be listed greyed with their localized unlock hint and SHALL NOT be selectable. Cost rows SHALL be shown next to the viewed location's stock without any affordability judgment.

Source: REF-12.3, REF-13.3, PIC-4, PIC-6

#### Scenario: Entries are grouped and ordered
- **WHEN** two placeable definitions map to categories `tier1` and `tier2`
- **THEN** the menu renders two tabs in tier order with the definitions sorted by `sort_order` inside each

#### Scenario: A locked entry shows its unlock hint
- **WHEN** a definition's metadata is `locked: true` and its localization carries `Requires 150 S1`
- **THEN** the entry is greyed, shows the hint, and cannot be chosen

#### Scenario: Costs are shown next to stock
- **WHEN** an entry costs `6` BM1 and the viewed location stores `4` BM1 display units
- **THEN** the entry shows the cost `6` beside the stock `4` and no disabled state is derived from them

#### Scenario: A placeable definition is listed
- **WHEN** an entity definition metadata has a `placement` component with footprint `[3, 3]` and a `producer` component
- **THEN** the menu returns an entry for `test.entity.a` with its localized label and archetype `refiner`

#### Scenario: A non-placeable definition is omitted
- **WHEN** an entity definition metadata has no `placement` component
- **THEN** the menu returns no entry for it

#### Scenario: Entries are sorted by ascending definition ID
- **WHEN** placeable definitions of one category `test.entity.b` and `test.entity.a` are passed in that order with equal `sort_order`
- **THEN** the entries list `test.entity.a` before `test.entity.b`

### Requirement: Placement mode and command feedback
The client SHALL keep the interaction mode in client-local view state, enter `place` mode on `B`, enter `demolish` mode on `X`, and return to `inspect` on `Escape`, and SHALL show the current mode in the action bar. A not-yet-active plan SHALL remain visible with the dashed planned encoding, including `awaiting_resources`. `commandNotice(result, i18n)` SHALL return a localized notice naming the rejection code for a rejected command result and `null` for an accepted one.

Source: REF-13.1, REF-13.2, REF-13.4, REF-12.2, PIC-13

#### Scenario: The build key enters place mode
- **WHEN** `nextMode('inspect', 'b')` is computed
- **THEN** it returns `place`

#### Scenario: Escape returns to inspect mode
- **WHEN** `nextMode('demolish', 'Escape')` is computed
- **THEN** it returns `inspect`

#### Scenario: An awaiting-resources plan stays visible
- **WHEN** a placed plan lacks materials
- **THEN** the canvas keeps drawing it with the dashed planned encoding

#### Scenario: An unrelated key leaves the mode unchanged
- **WHEN** `nextMode('place', 'q')` is computed
- **THEN** it returns `place`

#### Scenario: A rejected command produces a notice
- **WHEN** `commandNotice({ command_id: 'c1', status: 'rejected', current_revision: 2, errors: [{ code: 'state_revision_mismatch', arguments: {} }] }, i18n)` is computed
- **THEN** it returns a string containing `state_revision_mismatch`

#### Scenario: An accepted command produces no notice
- **WHEN** `commandNotice({ command_id: 'c1', status: 'accepted', scheduled_tick: 5 }, i18n)` is computed
- **THEN** it returns `null`
