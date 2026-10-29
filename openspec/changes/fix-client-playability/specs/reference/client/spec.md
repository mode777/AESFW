## ADDED Requirements

### Requirement: Boolean DOM attributes
The client's DOM helpers SHALL write a boolean property value `true` as an empty attribute and SHALL omit the attribute for `false`. ARIA and `data-*` attributes that need the literal strings `"true"` and `"false"` SHALL receive strings from their callers.

Source: REF-14.1, REF-12.3, REF-15

#### Scenario: A false boolean is omitted
- **WHEN** a button is created with `{ disabled: false }`
- **THEN** the element has no `disabled` attribute and `button.disabled` is `false`

#### Scenario: A true boolean is an empty attribute
- **WHEN** a button is created with `{ disabled: true }`
- **THEN** the element's `disabled` attribute is `""` and `button.disabled` is `true`

#### Scenario: Unlocked build entries are enabled
- **WHEN** the build menu shows `ref.tier.entity.residence_s1` with `locked: false` and `ref.tier.entity.combiner_c1` with `locked: true`
- **THEN** the residence button is not disabled, and the combiner button is disabled with `aria-disabled="true"`

### Requirement: Hidden regions are not displayed
Any client element with the `hidden` attribute SHALL not be displayed, regardless of the display mode its class sets.

Source: REF-11, REF-12.3

#### Scenario: Island actions are hidden until an island is selected
- **WHEN** the client has loaded and no island has been clicked
- **THEN** the `island-actions` element is not visible

#### Scenario: A hidden build menu is not displayed
- **WHEN** an entity is selected so the context panel shows the entity panel
- **THEN** the `build-menu` element is not visible

### Requirement: Location grid styling
The location grid SHALL style its layers so they are legible. Buildable and non-buildable cells SHALL be distinguishable. Grid rules SHALL use a hairline stroke. Entity shapes SHALL use the land fill with an ink stroke, and planned entities SHALL be dashed. Status glyphs SHALL fit inside one cell. The placement ghost SHALL be ink-dashed when valid and accent-dashed when invalid.

Source: REF-10.2, REF-10.3, REF-12.2, REF-13.3

#### Scenario: Entity shapes are not default black
- **WHEN** the start location is shown at location zoom
- **THEN** the computed fill of the hub shape is the `--land` token colour, not `rgb(0, 0, 0)`

#### Scenario: Non-buildable cells differ from buildable ones
- **WHEN** the start location is shown
- **THEN** the computed fill of the blocked-cell layer differs from the computed fill of the grid background

#### Scenario: A status glyph fits inside its cell
- **WHEN** a refiner shows the `C` marker for `missing_capability`
- **THEN** the marker glyph's bounding box is no larger than one grid cell

#### Scenario: The ghost shows authoritative validity
- **WHEN** the ghost's placement result is `valid: false`
- **THEN** the ghost's computed stroke is the `--accent` token colour and its stroke is dashed

### Requirement: Stable grid box
The location grid's SVG SHALL occupy the whole grid overlay box, and the grid's legend and status captions SHALL not change that box. A pointer at the centre of cell `(x, y)` SHALL move the placement cursor to `(x, y)`.

Source: REF-12.2, REF-13.3

#### Scenario: The SVG fills the overlay
- **WHEN** the grid overlay is laid out at 400 × 400 px and the ghost status shows `valid`
- **THEN** the grid SVG's bounding box is 400 × 400 px at the overlay's origin

#### Scenario: Hover maps to the cell under the pointer
- **WHEN** a residence is selected and the pointer moves to the centre of cell `(20, 6)`
- **THEN** the next `placement_query` carries `position: [20, 6]`

### Requirement: Place mode starts with an available definition
Pressing `B`, or choosing the build mode in the command palette, without a selected definition SHALL select the first unlocked entry of the active build tab, and otherwise the first unlocked entry in tab order. When no entry is unlocked, the mode SHALL stay `inspect`.

Source: REF-13.1, REF-13.2, REF-12.3

#### Scenario: B selects the first unlocked S1 entry
- **WHEN** the S1 tab is active, nothing is selected, and `B` is pressed
- **THEN** the mode is `place` and the selected definition is the first unlocked S1 entry, not a locked definition

#### Scenario: No unlocked entry keeps inspect mode
- **WHEN** every build entry is locked and `B` is pressed
- **THEN** the mode stays `inspect` and no definition is selected

### Requirement: Connector-only drag paths
A press-drag-release on the grid SHALL submit one `PlaceEntityPlan` per path cell only when the selected definition has the connector archetype. For any other definition, a press and release SHALL submit at most one `PlaceEntityPlan`, at the cursor cell.

Source: REF-13.3 step 4

#### Scenario: A residence drag places at most one residence
- **WHEN** a residence is selected and the pointer is pressed at cell `(20, 6)` and released at cell `(22, 6)`
- **THEN** at most one `PlaceEntityPlan` is submitted

#### Scenario: A connector drag places one plan per cell
- **WHEN** a connector is selected and the pointer is pressed at cell `(5, 5)` and released at cell `(8, 5)`
- **THEN** four `PlaceEntityPlan` commands are submitted for cells `(5, 5)` through `(8, 5)` in path order

### Requirement: Place-mode camera
Selecting a build entry while the camera zoom is below detail level SHALL centre the camera on the viewed location at detail zoom. At or above detail zoom, the camera SHALL be unchanged. The camera stays client-local view state.

Source: REF-12.1, REF-13.3, REF-13.5

#### Scenario: Selecting from far zoom moves to detail
- **WHEN** the camera zoom is `1` and the residence entry is selected
- **THEN** the camera zoom is the detail zoom and its centre is the viewed location's island centre

#### Scenario: Selecting at detail zoom keeps the camera
- **WHEN** the camera zoom is `3` and the residence entry is selected
- **THEN** the camera is unchanged

### Requirement: Localized build tabs
Every display category key used by a presentation mapping SHALL have a localization entry, and the build menu SHALL show the localized label.

Source: REF-12.3, PIC-6, PIC-7

#### Scenario: The S3 and S4 tabs are localized
- **WHEN** the build menu is shown with the reference presentation package
- **THEN** the tabs for `ref.tier.category.s3` and `ref.tier.category.s4` read `S3` and `S4`

### Requirement: Construction resource chips
The resource bar SHALL show a chip for every resource whose definition metadata carries the construction role tag, with the viewed location's stock. The client SHALL obtain those tags from resource definition metadata.

Source: REF-11, PIC-4, PIC-10.2

#### Scenario: BM1 stock is shown at the start
- **WHEN** the client has loaded the reference world and the start location is viewed
- **THEN** the resource bar has a BM1 chip whose value is `60`

#### Scenario: A placement lowers the chip
- **WHEN** a residence costing 6 BM1 is placed at the start location and its construction starts
- **THEN** the BM1 chip's value is `54`

### Requirement: Debug lists in table mode
The entity and location ID lists SHALL render in the Tables window, not in the context panel.

Source: REF-12.3, REF-15

#### Scenario: The context panel has no debug lists
- **WHEN** the client has loaded
- **THEN** the context panel contains no `entity-item-*` or `location-item-*` element

#### Scenario: The Tables window lists entities
- **WHEN** the Tables window is opened
- **THEN** it contains `entity-item-13` for the start hub

### Requirement: Milestones reflect player actions
The residence and producer milestones SHALL complete only on a `ConstructionCompleted` event whose subject is a residence, respectively an entity with production. The route milestone SHALL require a transport with an assigned `order_id`. Completions stored under the previous storage key SHALL be ignored.

Source: REF-12.6, REF-14.5, PIC-16

#### Scenario: Start entities complete no milestone
- **WHEN** the reference world is loaded at tick `0` with an empty milestone store
- **THEN** no milestone is complete

#### Scenario: A completed residence completes the milestone
- **WHEN** a `ConstructionCompleted` event names an entity whose `definition_id` is `ref.tier.entity.residence_s1`
- **THEN** the residence milestone is complete

#### Scenario: An idle transport does not complete the route milestone
- **WHEN** the only transport has `transport.state: unassigned` and no `order_id`
- **THEN** the route milestone is not complete

#### Scenario: An assigned transport completes the route milestone
- **WHEN** a transport has `transport.order_id: 30`
- **THEN** the route milestone is complete

#### Scenario: Stale completions are ignored
- **WHEN** the previous milestone key for slot `auto` holds `["residence", "producer", "route"]`
- **THEN** reading the slot's milestones returns `[]`

### Requirement: Help window
The action bar SHALL offer a Help button, and `?` SHALL toggle a Help window. The window SHALL list the keyboard map and a short opening guide. Its text SHALL be client strings, and it SHALL compute no mechanics. Escape SHALL close it like other windows.

Source: REF-12.4, REF-13.2, REF-15, 08 M11a human playtest gate

#### Scenario: The help window lists the key map
- **WHEN** the Help button is clicked
- **THEN** the `window-help` element is visible and lists every `KEY_HINTS` entry

#### Scenario: The question-mark key toggles help
- **WHEN** `?` is pressed twice
- **THEN** the Help window is opened and then closed

#### Scenario: The help window shows the opening guide
- **WHEN** the Help window is open
- **THEN** it contains an ordered opening guide whose first step names the Residence S1 entry of the S1 tab

### Requirement: Created and removed entities reach the grid
The mirror SHALL apply `entity_creates` and `entity_removals` through `applyDelta`, so that a placed entity is drawn on the next delta and a removed entity disappears without a snapshot resynchronization.

Source: REF-14.2, REF-12.2, PIC-9.2, PIC-18

#### Scenario: A created entity is drawn
- **WHEN** the mirror at revision `3` receives a delta from revision `3` whose `entity_creates` holds entity `24` at location `1` with spatial data
- **THEN** the location grid draws `grid-entity-24` and no snapshot is requested

#### Scenario: A removed entity disappears
- **WHEN** the mirror holds entity `24` and receives a matching delta whose `entity_removals` is `[24]`
- **THEN** the location grid no longer draws `grid-entity-24`

### Requirement: Playable opening loop
The browser opening flow SHALL place a residence through normal user input and see it complete. It SHALL click the Residence S1 entry without forcing, hover cells until the authoritative ghost is valid, and click to place. It SHALL run the simulation until the residence completes, then assert that the new shape is drawn with a non-planned state.

Source: REF-18, VER-13.2, 08 M11a human playtest gate

#### Scenario: A residence is placed and completes in the browser
- **WHEN** the opening flow places a Residence S1 on a cell whose ghost reports `valid` and runs the simulation for 15 ticks
- **THEN** a new `grid-entity-*` with the residence label is drawn, its `data-state` is not `planned`, and the BM1 chip shows `54`
