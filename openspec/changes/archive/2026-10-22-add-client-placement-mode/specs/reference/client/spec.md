# Spec Delta

## ADDED Requirements

### Requirement: Build palette entries
`paletteEntries(definitions, i18n)` SHALL return one entry per placeable entity definition — those whose metadata carries a `placement` component — carrying the definition ID, its localized label, and its shape archetype, sorted by ascending definition ID. It SHALL omit definitions without a `placement` component.

Source: REF-13.3, REF-12.4, PIC-4

#### Scenario: A placeable definition is listed
- **WHEN** an entity definition metadata has a `placement` component with footprint `[3, 3]` and a `producer` component
- **THEN** `paletteEntries` returns an entry for `test.entity.a` with label `test.entity.a` and archetype `refiner`

#### Scenario: A non-placeable definition is omitted
- **WHEN** an entity definition metadata has no `placement` component
- **THEN** `paletteEntries` returns no entry for it

#### Scenario: Entries are sorted by ascending definition ID
- **WHEN** placeable definitions `test.entity.b` and `test.entity.a` are passed in that order
- **THEN** the entries list `test.entity.a` before `test.entity.b`

### Requirement: Placement footprint and ghost shape
`placementFootprint(metadata)` SHALL read the `placement.footprint` `[width, height]` from metadata and SHALL return `null` when it is absent or malformed. `ghostShape(cursor, footprint, archetype)` SHALL return the oriented footprint at the cursor, where an odd orientation swaps the width and height.

Source: REF-13.3, REF-10.2, PIC-4

#### Scenario: A footprint is read
- **WHEN** metadata has `placement.footprint` `[3, 3]`
- **THEN** `placementFootprint` returns width `3` and height `3`

#### Scenario: A missing footprint returns null
- **WHEN** metadata has no `placement` component
- **THEN** `placementFootprint` returns `null`

#### Scenario: Orientation swaps the ghost axes
- **WHEN** the ghost shape is computed for footprint `{ width: 3, height: 4 }` at position `[2, 2]` with orientation `1`
- **THEN** the ghost shape is at `x` `2`, `y` `2`, width `4`, height `3`

### Requirement: Authoritative placement preview
The client SHALL request authoritative validation with a `placement_query` whose `definition_id`, `location_id`, and `logical_transform` describe the ghost, and SHALL derive the ghost visual state only from the returned `placement_result`: `unknown` before a result, `valid` when `valid` is true, and `invalid` with the returned reasons when false. The client SHALL compute no placement mechanics.

Source: REF-13.3, REF-10.3, PIC-12.1, REF-17

#### Scenario: No result is unknown
- **WHEN** `ghostValidity(null)` is computed
- **THEN** it returns `unknown`

#### Scenario: A valid result is valid
- **WHEN** `ghostValidity({ valid: true, revision: 1, reasons: [] })` is computed
- **THEN** it returns `valid`

#### Scenario: An invalid result keeps its reasons
- **WHEN** `ghostValidity({ valid: false, revision: 1, reasons: [{ code: 'not_buildable', arguments: {} }] })` is computed
- **THEN** it returns `invalid` and `reasonLabels` returns `['not_buildable']`

#### Scenario: The placement query describes the ghost
- **WHEN** `placementQueryPayload` is built for definition `test.entity.a` at position `[2, 3]`, orientation `1`, location `100`
- **THEN** it returns `{ kind: 'placement_query', definition_id: 'test.entity.a', location_id: 100, logical_transform: { position: [2, 3], orientation: 1 } }`

#### Scenario: No definition has no query
- **WHEN** `placementQueryPayload` is built for a cursor with no selected definition
- **THEN** it returns `null`

### Requirement: Placement keyboard map
`placementKeyAction(cursor, key, bounds)` SHALL map arrow keys to a `move` action clamped to the grid bounds, `R`/`r` to a `rotate` action advancing orientation modulo 4, `Enter` to `confirm`, and `Escape` to `cancel`; any other key SHALL be `none`. A move or rotate SHALL clear the stale placement result.

Source: REF-13.1, REF-13.2, REF-13.3

#### Scenario: An arrow key moves the ghost
- **WHEN** the cursor is at `[0, 0]` and `ArrowRight` is handled with bounds `{ width: 4, height: 4 }`
- **THEN** the action is `move` and the cursor position is `[1, 0]`

#### Scenario: Movement is clamped at the grid edge
- **WHEN** the cursor is at `[3, 0]` and `ArrowRight` is handled with bounds `{ width: 4, height: 4 }`
- **THEN** the cursor position stays `[3, 0]`

#### Scenario: Rotate advances the orientation
- **WHEN** the cursor orientation is `0` and `R` is handled
- **THEN** the action is `rotate` and the orientation is `1`

#### Scenario: Rotate wraps at four
- **WHEN** the cursor orientation is `3` and `R` is handled
- **THEN** the orientation is `0`

#### Scenario: Enter confirms the placement
- **WHEN** `Enter` is handled
- **THEN** the action is `confirm`

#### Scenario: Escape cancels the placement
- **WHEN** `Escape` is handled
- **THEN** the action is `cancel`

#### Scenario: An unhandled key does nothing
- **WHEN** `q` is handled
- **THEN** the action is `none`

#### Scenario: Moving clears the stale result
- **WHEN** a cursor with a placement result is moved by an arrow key
- **THEN** the moved cursor's result is `null`

### Requirement: Placement command submission
`placeEntityPlanPayload(cursor, locationId)` SHALL build the `PlaceEntityPlan` payload `{ definition_id, location_id, logical_transform: { position, orientation } }`, or `null` when no definition is selected. The client SHALL submit the command through the session client and SHALL NOT mutate the mirror optimistically.

Source: REF-13.3, PIC-12

#### Scenario: The plan payload describes the ghost
- **WHEN** the payload is built for definition `test.entity.a` at position `[2, 3]`, orientation `1`, location `100`
- **THEN** it returns `{ definition_id: 'test.entity.a', location_id: 100, logical_transform: { position: [2, 3], orientation: 1 } }`

#### Scenario: No definition has no payload
- **WHEN** the payload is built for a cursor with no selected definition
- **THEN** it returns `null`

### Requirement: Construction commands from selection
`constructionCommands(lifecycle)` SHALL return the construction commands applicable to an entity's lifecycle: a not-yet-active lifecycle (`planned`, `awaiting_resources`, `constructing`) SHALL offer `CancelEntityPlan` and `CommitConstruction`; the `active` lifecycle SHALL offer `DeconstructEntity`; any other lifecycle SHALL offer none. The inspector SHALL issue a listed command for the selected entity through the session client.

Source: REF-12.2, REF-12.3, REF-13.3

#### Scenario: A planned entity can be committed or cancelled
- **WHEN** `constructionCommands('planned')` is computed
- **THEN** it returns `['CancelEntityPlan', 'CommitConstruction']`

#### Scenario: A constructing entity can be committed or cancelled
- **WHEN** `constructionCommands('constructing')` is computed
- **THEN** it returns `['CancelEntityPlan', 'CommitConstruction']`

#### Scenario: An active entity can be deconstructed
- **WHEN** `constructionCommands('active')` is computed
- **THEN** it returns `['DeconstructEntity']`

#### Scenario: An unknown lifecycle offers no command
- **WHEN** `constructionCommands('dormant')` is computed
- **THEN** it returns `[]`

### Requirement: Placement mode and command feedback
The client SHALL keep the interaction mode in client-local view state, enter `place` mode on `B`, and return to `inspect` on `Escape`, and SHALL show the current mode. `commandNotice(result, i18n)` SHALL return a localized notice naming the rejection code for a rejected command result and `null` for an accepted one.

Source: REF-13.1, REF-13.2, REF-13.4, PIC-13

#### Scenario: The build key enters place mode
- **WHEN** `nextMode('inspect', 'b')` is computed
- **THEN** it returns `place`

#### Scenario: Escape returns to inspect mode
- **WHEN** `nextMode('place', 'Escape')` is computed
- **THEN** it returns `inspect`

#### Scenario: An unrelated key leaves the mode unchanged
- **WHEN** `nextMode('place', 'x')` is computed
- **THEN** it returns `place`

#### Scenario: A rejected command produces a notice
- **WHEN** `commandNotice({ command_id: 'c1', status: 'rejected', current_revision: 2, errors: [{ code: 'state_revision_mismatch', arguments: {} }] }, i18n)` is computed
- **THEN** it returns a string containing `state_revision_mismatch`

#### Scenario: An accepted command produces no notice
- **WHEN** `commandNotice({ command_id: 'c1', status: 'accepted', scheduled_tick: 5 }, i18n)` is computed
- **THEN** it returns `null`
