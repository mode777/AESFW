# reference/client Specification

## Purpose

The reference browser client shell: signals, the authoritative mirror, client-local view state, i18n, the top bar, and the debug overlay (REF-9–11, REF-12.5, REF-14).

## Requirements

### Requirement: Signals
The client SHALL provide a `signal(initial)` primitive with `get`, `set`, and `subscribe`, and a `computed(fn)` primitive that recomputes when a dependency signal changes. `set` SHALL notify subscribers only when the value changes.

Source: REF-14.1, REF-14.2

#### Scenario: A computed follows its source
- **WHEN** a `computed` reads a signal and the signal is set to a new value
- **THEN** the computed returns the new value

#### Scenario: Setting the same value does not notify
- **WHEN** a signal is set to its current value
- **THEN** subscribers are not notified

### Requirement: Authoritative mirror
The client SHALL keep an authoritative mirror of the latest projection. `applySnapshot(snapshot)` SHALL replace it. `applyDelta(delta)` SHALL apply the delta only when `canApplyDelta(current, delta)` holds, and otherwise SHALL request a full snapshot (PIC-18). The mirror SHALL never be patched by client-computed values.

Source: REF-14.2, PIC-18

#### Scenario: A matching delta is applied
- **WHEN** the mirror holds revision `1` and receives a delta with `from_revision` `1`
- **THEN** the mirror's projection revision becomes the delta's `to_revision`

#### Scenario: A mismatched delta requests a snapshot
- **WHEN** the mirror holds revision `1` and receives a delta with `from_revision` `5`
- **THEN** it requests a full snapshot and its projection is unchanged

### Requirement: Client-local view state
The client SHALL keep view state (selection, mode, overlays, open panels, locale) separate from the authoritative mirror, and discarding it SHALL not affect the session.

Source: REF-14.1, PIC-16

#### Scenario: View state is independent of the mirror
- **WHEN** the selection is set and then the mirror receives a new snapshot
- **THEN** the selection is unchanged

### Requirement: Localization with fallback
`createI18n(entries)` SHALL return `t(key)` that returns the localized string for a known key and the key itself for a missing key, and `formatBaseUnits(value, scale)` SHALL format base units as a display number with grouping and no fractional part.

Source: REF-14.4, PIC-7

#### Scenario: A missing key falls back to the key
- **WHEN** `t('ref.tier.resource.p1')` is called with no entry for that key
- **THEN** it returns `ref.tier.resource.p1`

#### Scenario: Base units are formatted with grouping
- **WHEN** `formatBaseUnits(1204500, 1000)` is called
- **THEN** it returns `1,205`

### Requirement: Top bar controls
The top bar SHALL show the tick, the current speed, run/pause and step controls, and the blocked-entity count from the projection, and SHALL issue the matching `control` commands through the session client.

Source: REF-11, REF-13.2

#### Scenario: The top bar reflects the tick
- **WHEN** the mirror holds a projection at tick `12345`
- **THEN** the top bar shows `12345`

### Requirement: Debug overlay
The debug overlay SHALL show tick, revision, last state hash, protocol version, and content checksum, and SHALL be toggleable.

Source: REF-12.5

#### Scenario: The overlay shows the revision
- **WHEN** the overlay is open and the mirror holds revision `42`
- **THEN** it shows `42`

### Requirement: Client visibility
The client SHALL import only `@aesfw/protocol` and `@aesfw/host-web/client` from the framework.

Source: TDS-4.3 rule 4, REF-2

#### Scenario: The client builds without framework internals
- **WHEN** dependency-cruiser runs over `reference/client-web`
- **THEN** it reports no import of `@aesfw/core`, `@aesfw/content`, or `@aesfw/app`

### Requirement: Entity inspector selector
`entityInspector(detail, i18n)` SHALL turn an `EntityDetailDto` into a view model with the definition code, lifecycle, enabled state, the production recipe and progress, the block reasons, and the available commands. It SHALL be a pure function.

Source: REF-12.3, PIC-10.1

#### Scenario: The inspector shows the recipe and progress
- **WHEN** an entity detail with a production recipe `test.recipe.a` and progress `500` is selected
- **THEN** the view model lists the recipe and a `50 %` progress value

#### Scenario: The inspector lists the block reasons
- **WHEN** an entity detail has block reasons `['missing_input']`
- **THEN** the view model lists `missing_input`

### Requirement: Need breakdown rows
`needRows(breakdown, i18n)` SHALL turn need-breakdown DTOs into rows carrying the need ID, demand, delivered, and fulfillment, sorted by ascending need ID.

Source: REF-12.3, PIC-10.3

#### Scenario: Need rows are sorted by need ID
- **WHEN** breakdowns for `test.need.b` and `test.need.a` are selected
- **THEN** the rows list `test.need.a` before `test.need.b`

### Requirement: Inventory table
`inventoryRows(location, i18n)` SHALL turn a location DTO into one row per inventory entry carrying the resource ID, stored, reserved, and capacity, sorted by ascending resource ID.

Source: REF-12.4, PIC-10.2

#### Scenario: Inventory rows carry stored and reserved
- **WHEN** a location with an entry `{ resource_id: 'test.resource.a', stored: 100, reserved: 20 }` is selected
- **THEN** the row has stored `100` and reserved `20`

### Requirement: Population table
`populationRows(summaries, i18n)` SHALL turn location summaries into one row per location and tier carrying the location, the tier ID, and the population count, sorted by ascending location then tier ID.

Source: REF-12.4, PIC-10.2

#### Scenario: Population rows carry the tier total
- **WHEN** a summary with `population_by_tier['test.tier.a']` `50` is selected
- **THEN** the row has tier `test.tier.a` and count `50`

### Requirement: Table mode
The client SHALL provide a table mode that renders the current view as tables (inventory, population, inspector) instead of shapes, reachable by keyboard.

Source: REF-15, PIC-17

#### Scenario: Table mode renders tables
- **WHEN** table mode is enabled
- **THEN** the client renders the inventory and population tables

### Requirement: Inspector commands
The inspector SHALL issue `SetEntityEnabled` and `SelectRecipe` commands through the session client, and SHALL never mutate the mirror locally.

Source: REF-12.3, REF-13.4

#### Scenario: The enable command is issued
- **WHEN** the enable control is activated for entity `3`
- **THEN** a `SetEntityEnabled` envelope for entity `3` is sent

### Requirement: Smoke flow 1 — load and tick
The client SHALL load the R0 content, become ready, and advance the tick when the run control is used, showing the advancing tick in the top bar.

Source: VER-13.2, REF-11

#### Scenario: The tick advances
- **WHEN** the client has loaded and the run control is used
- **THEN** the top-bar tick increases

### Requirement: Smoke flow 2 — inspect an entity
Selecting an entity SHALL fetch its detail and show the inspector with the entity's definition and state.

Source: VER-13.2, REF-12.3

#### Scenario: Selecting an entity shows the inspector
- **WHEN** an entity item is selected
- **THEN** the inspector shows that entity's definition code

### Requirement: Smoke flow 4 — toggle an entity
The inspector's toggle control SHALL issue `SetEntityEnabled` for the selected entity and the change SHALL appear in the next projection.

Source: VER-13.2, REF-12.3

#### Scenario: Toggling disables the entity
- **WHEN** the toggle control is used on an enabled entity
- **THEN** the entity's `enabled` state becomes `false` in the projection

### Requirement: Smoke flow 6 — save and reload
The client SHALL save the session and reload it, and the reloaded tick SHALL equal the saved tick.

Source: VER-13.2, TDS-21.1

#### Scenario: Save and reload preserves the tick
- **WHEN** the session is saved at tick `N` and reloaded
- **THEN** the reloaded tick is `N`

### Requirement: Browser-versus-CLI determinism
Stepping the client a fixed number of ticks from a fixed seed and content SHALL produce the same state hash as a headless run of the same content, seed, and tick count (VER-8.2).

Source: VER-8.2, TDS-19.4

#### Scenario: Browser and CLI hashes match
- **WHEN** the client steps `20` ticks from seed `[0, 0]` on the R0 content and a headless run does the same
- **THEN** both report the same `fnv1a64-canonical-json-v1` state hash

### Requirement: Subpath-safe static build
The reference client SHALL accept a build-time base path from `VITE_BASE` (default `/`). A build with `VITE_BASE=/AESFW/` SHALL emit an `index.html` and JavaScript bundle whose asset and worker URLs are prefixed with `/AESFW/`, so the site works when served from a project subpath. The web build SHALL be written to `reference/client-web/dist-web`, separate from the TypeScript build output in `dist`.

Source: REF-14.6, TDS-21.1

#### Scenario: A base-path build prefixes assets
- **WHEN** the client is built with `VITE_BASE=/AESFW/`
- **THEN** `dist-web/index.html` references `/AESFW/assets/`

#### Scenario: The default build uses the root
- **WHEN** the client is built without `VITE_BASE`
- **THEN** `dist-web/index.html` references `/assets/`

### Requirement: Pages publication
A GitHub Actions workflow SHALL build the workspace and the reference client with `VITE_BASE=/AESFW/` on every push to `main` and publish `reference/client-web/dist-web` to GitHub Pages.

Source: REF-14.6

#### Scenario: The workflow publishes the client
- **WHEN** a commit is pushed to `main`
- **THEN** the workflow builds the client and deploys `dist-web` to GitHub Pages

### Requirement: Location grid cell model
`gridCells(location)` SHALL return the grid geometry of a grid-policy location as `{ width, height, cells }`, where each cell carries its `x`, `y`, and `blocked` flag and the cells are ordered by ascending packed index (`y * width + x`). It SHALL return `null` for a location without a grid.

Source: REF-12.2, PIC-9.1, PIC-10.2

#### Scenario: A grid exposes its cells and blocked set
- **WHEN** a location has a grid with `width` `4`, `height` `3`, and blocked cells `[1, 6]`
- **THEN** `gridCells` returns `12` cells, the cell at `x` `1`, `y` `0` is blocked, and the cell at `x` `2`, `y` `1` is blocked

#### Scenario: An abstract location has no grid
- **WHEN** a location has no `grid`
- **THEN** `gridCells` returns `null`

### Requirement: Shape grammar
`shapeGrammar(archetype)` SHALL map every REF-10.2 archetype to its shape kind and interior encoding, and SHALL map an unknown archetype to a plain square (`box`).

Source: REF-10.2

#### Scenario: A connector is a line
- **WHEN** `shapeGrammar('connector')` is computed
- **THEN** the shape kind is `line` and the interior encoding is `none`

#### Scenario: A residence is a circle
- **WHEN** `shapeGrammar('residence')` is computed
- **THEN** the shape kind is `circle`

#### Scenario: A slot extractor is a triangle on a slot ring
- **WHEN** `shapeGrammar('slot_extractor')` is computed
- **THEN** the shape kind is `triangle_ring` and the interior encoding is `progress_rise`

#### Scenario: An unknown archetype falls back to a box
- **WHEN** `shapeGrammar('unknown')` is computed
- **THEN** the shape kind is `box`

### Requirement: Entity archetype derivation
`archetypeOf(metadata)` SHALL derive the shape archetype from mechanically safe definition metadata, without computing mechanics: a `residence` component is a residence, a `producer` component is a refiner, a slot-dependent `resource_source` is a slot extractor, an area-dependent `resource_source` is an area extractor, a `connectivity` component that `provides` is a connector, and any other definition is `unknown`.

Source: REF-10.2, PIC-4

#### Scenario: A slot-dependent source is a slot extractor
- **WHEN** an entity definition has a `resource_source` component with policy `slot_dependent`
- **THEN** its archetype is `slot_extractor`

#### Scenario: An area-dependent source is an area extractor
- **WHEN** an entity definition has a `resource_source` component with policy `area_dependent`
- **THEN** its archetype is `area_extractor`

#### Scenario: A residence is a residence
- **WHEN** an entity definition has a `residence` component
- **THEN** its archetype is `residence`

#### Scenario: A producer is a refiner
- **WHEN** an entity definition has a `producer` component
- **THEN** its archetype is `refiner`

#### Scenario: A connectivity provider is a connector
- **WHEN** an entity definition has a `connectivity` component that provides a network
- **THEN** its archetype is `connector`

#### Scenario: A definition with no known component is unknown
- **WHEN** an entity definition has no recognised component
- **THEN** its archetype is `unknown`

### Requirement: Entity shapes
`entityShapes(location, entities, archetypes)` SHALL return one shape per entity that carries spatial data, ordered by ascending entity ID, carrying its cell position, its footprint dimensions after orientation, its shape kind and interior, and its state encoding. It SHALL omit entities with no spatial data.

Source: REF-12.2, REF-14.3, PIC-9.1

#### Scenario: A placed entity is drawn at its logical position
- **WHEN** an entity at logical position `[10, 12]` with footprint `{ width: 2, height: 3 }` and orientation `0` is placed on a location
- **THEN** its shape is at `x` `10`, `y` `12`, `width` `2`, `height` `3`

#### Scenario: Orientation swaps the footprint axes
- **WHEN** an entity with footprint `{ width: 2, height: 3 }` and orientation `1` is placed
- **THEN** its shape `width` is `3` and its `height` is `2`

#### Scenario: An unplaced entity is omitted
- **WHEN** an entity has no `spatial` object
- **THEN** `entityShapes` returns no shape for it

### Requirement: State encoding
`stateEncoding(entity)` SHALL encode the REF-10.3 visual state from the entity's lifecycle, production state, and block reasons: a not-yet-active lifecycle is `planned` and dashed, a throughput block is `throttled` with glyph `T`, another block reason is `blocked` with a reason glyph, a processing producer is `processing` with a progress permille, and an idle producer is `idle`.

Source: REF-10.3

#### Scenario: A constructing entity is planned
- **WHEN** an entity has lifecycle `constructing`
- **THEN** its state is `planned` and it is dashed

#### Scenario: A missing input is blocked with an input glyph
- **WHEN** an entity has block reason `missing_input`
- **THEN** its state is `blocked` and its glyph is `I`

#### Scenario: A throughput block is throttled
- **WHEN** an entity has block reason `throughput_throttled`
- **THEN** its state is `throttled` and its glyph is `T`

#### Scenario: A processing producer reports progress
- **WHEN** an entity is processing with `progress` `500` and `progress_scale` `1000`
- **THEN** its state is `processing` and its progress permille is `500`

### Requirement: Connectivity overlay
`connectivityOverlay(entities)` SHALL return one entry per entity that carries connectivity, ordered by ascending entity ID, carrying the entity ID, the network, the role, and the `connected` flag. It SHALL omit entities with no connectivity.

Source: REF-12.2, PIC-10.2

#### Scenario: A connected requirement is listed
- **WHEN** an entity carries a `requirement` node for network `test.connectivity.hub` with `connected` `true`
- **THEN** the overlay has an entry with that network, role `requirement`, and `connected` `true`

#### Scenario: An entity without connectivity is omitted
- **WHEN** an entity carries no connectivity
- **THEN** the overlay has no entry for it

### Requirement: Suitability overlay
`suitabilityOverlay(location, propertyId)` SHALL return the suitability value of the selected property from the location's property values, and SHALL return `null` when the location or property value is absent.

Source: REF-12.2, PIC-9.1, PIC-10.2

#### Scenario: A suitability property is read
- **WHEN** a location has property `test.property.suitability` with value `1000`
- **THEN** `suitabilityOverlay(location, 'test.property.suitability')` returns `1000`

#### Scenario: A missing property returns null
- **WHEN** a location has no value for `test.property.suitability`
- **THEN** `suitabilityOverlay(location, 'test.property.suitability')` returns `null`

### Requirement: Grid overlay view state
The client SHALL keep the active grid overlay (connectivity or suitability, or none) in client-local view state, toggled by the `C` and `S` keys, and discarding it SHALL not affect the session.

Source: REF-12.2, REF-13.2, PIC-16

#### Scenario: The connectivity key selects the connectivity overlay
- **WHEN** the active overlay is none and the `C` key is handled
- **THEN** the active overlay is `connectivity`

#### Scenario: The suitability key selects the suitability overlay
- **WHEN** the active overlay is none and the `S` key is handled
- **THEN** the active overlay is `suitability`

#### Scenario: The same key clears the overlay
- **WHEN** the active overlay is `connectivity` and the `C` key is handled
- **THEN** the active overlay is none

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

### Requirement: Top bar balance
The top bar SHALL display the actor's credits balance formatted from base units with the reference scale (6000), updated on every published snapshot and owner update.

Source: REF-12.4, REF-14.3

#### Scenario: The top bar shows the credits balance
- **WHEN** the actor's owner holds `60000` credits base units
- **THEN** the top bar's balance element reads `10` display units

### Requirement: Economy drawer view
The client SHALL offer an economy drawer listing the owner's balance, the net rate per tick, revenue by source, expenses by source, the idle-but-paying entities, and the deficit-paused entities in pause order, with a control that submits `ResumeDeficitPausedEntities` with `entities: 'all'`. Every value SHALL come from the projection's owner balance entry; the trend sparkline SHALL be client-side history of the net rate (last 60 published samples).

Source: REF-12.4, PIC-10.6

#### Scenario: The economy view lists sources and paused entities
- **WHEN** the owner balance carries revenue by source `{'tier.test.tier.s1': 10}` and expenses by source `{'entity.3': 50}` with one deficit-paused entity
- **THEN** the economy view shows one revenue row, one expense row, and the paused entity, and offers the resume control

#### Scenario: The resume control submits the resume command
- **WHEN** the economy view's resume control is activated
- **THEN** the client submits a `ResumeDeficitPausedEntities` command with `entities: 'all'`

### Requirement: Planning drawer view
The client SHALL offer a planning drawer that fetches the `planning` query when visible and lists, per consumed resource, the net rate and per consuming tier the per-capita demand, supported population, current population, and coverage; and the chain table with stage definition, count, ratio, output, footprint, maintenance, and capability demand.

Source: REF-12.4, PIC-10.5

#### Scenario: The planning view renders supported population
- **WHEN** the planning query returns a resource whose owner scope reports a tier with supported `1` and coverage `1000`
- **THEN** the planning view shows that tier row with supported `1`

#### Scenario: The planning view refreshes while visible
- **WHEN** the planning drawer is open and a new snapshot is published
- **THEN** the client issues a new `planning` query

### Requirement: Drawer keyboard map
The keys `E` and `P` SHALL toggle the economy and planning drawers respectively; activating the visible drawer's key again closes it. The mapping SHALL be a pure view-state helper.

Source: REF-13.4, REF-16

#### Scenario: The economy key toggles the drawer
- **WHEN** the drawer is closed and the `E` key action is applied
- **THEN** the drawer state becomes `economy`; applying it again returns the drawer to closed

### Requirement: Throughput gauge and overlay
The location grid SHALL show a throughput gauge when the location snapshot carries a throughput DTO, and SHALL provide a `T` overlay that highlights entities whose production block reasons include `throughput_throttled`. The gauge SHALL report capacity, requested quantity, and throttle permille.

Source: REF-12.2, REF-13.2, PIC-9.1

#### Scenario: A throttled location shows a gauge
- **WHEN** a location snapshot has capacity `1000`, requested `1600`, and throttle `625` permille
- **THEN** the grid shows a gauge with capacity `1000`, requested `1600`, and throttle `625`

#### Scenario: The throughput overlay highlights a throttled entity
- **WHEN** the `T` overlay is active and an entity's block reasons include `throughput_throttled`
- **THEN** the grid marks that entity as throttled

#### Scenario: A location without throughput shows no gauge
- **WHEN** a location snapshot has no throughput DTO
- **THEN** the grid shows no throughput gauge

### Requirement: Throughput pressure calculation
The gauge SHALL derive pressure as `floor(1000 × requested / capacity)` permille, `0` when both are zero, and `1000` when capacity is zero and requested is positive. It SHALL mark the gauge throttled when `throttle_permille < 1000`.

Source: REF-12.2, PIC-9.1

#### Scenario: Pressure reports over-request
- **WHEN** capacity is `1000` and requested is `1600`
- **THEN** pressure is `1600` permille and the gauge is throttled

#### Scenario: Zero capacity with demand is full pressure
- **WHEN** capacity is `0` and requested is `100`
- **THEN** pressure is `1000` permille

### Requirement: World-map view
The client SHALL provide a world map that lays locations out deterministically from their entity ids, draws every connection with its base duration, marks inactive and unknown locations, and shows ownership. It SHALL show transport dots at each transport unit's current location and move a dot to its new location with an interpolation that never delays authoritative state.

Source: REF-12.1, REF-14.3

#### Scenario: Locations are laid out deterministically
- **WHEN** the snapshot has locations `1` and `3`
- **THEN** the map places location `1` before location `3` in the id-derived grid

#### Scenario: A bidirectional connection is drawn once
- **WHEN** both endpoints carry the same connection id
- **THEN** the map draws one connection line with its duration

#### Scenario: A transport dot follows the authoritative location
- **WHEN** a transport entity's `location_id` changes from location `1` to `3`
- **THEN** its dot moves to location `3` with a transform transition

#### Scenario: Unknown locations are dashed
- **WHEN** a location's knowledge is `unknown`
- **THEN** the map draws it with a dashed outline

### Requirement: Map and grid toggle
The client SHALL switch between the location grid and the world map with a visible toggle and the `M` key, preserving the current location selection.

Source: REF-12.1, REF-13.2

#### Scenario: The M key toggles the map
- **WHEN** the user presses `M`
- **THEN** the world map replaces the grid and pressing `M` again restores the grid

### Requirement: Logistics drawer
The client SHALL provide a logistics drawer, opened with `L`, that lists transport units and orders. Selecting a unit SHALL query its transport detail and show state, current station, cargo, progress, and failure reasons.

Source: REF-12.4, PIC-10.4

#### Scenario: The drawer lists units and orders
- **WHEN** the snapshot has one transport unit and the read model has one order
- **THEN** the drawer shows one unit row and one order row

#### Scenario: Selecting a unit shows its detail
- **WHEN** the user selects a unit
- **THEN** the client queries `transport_detail` and renders its state, cargo, and progress

### Requirement: Route editor
The route editor SHALL edit a station list with ordered actions. Each action SHALL expose a resource id, an action (`load`, `unload`, `buy`, `sell`), a quantity rule (all GDD-15.3 modes), a quantity when the rule needs one, and an optional price limit. The editor SHALL create a new order, modify the selected order, delete it, and assign or unassign the selected unit.

Source: REF-12.4, GDD-15.3, ARCH-7.3

#### Scenario: A new two-station route is created
- **WHEN** the user creates a route with a load action at the origin and an unload action at the destination
- **THEN** the client sends `CreateTransportOrder` with the converted payload

#### Scenario: An existing route is modified
- **WHEN** the user changes an action rule and saves a selected order
- **THEN** the client sends `ModifyTransportOrder` with the order id and payload

#### Scenario: A unit is assigned
- **WHEN** a unit and an order are selected and the user presses assign
- **THEN** the client sends `AssignTransport` with both ids

#### Scenario: An invalid draft is not saved
- **WHEN** a draft has no stations or an empty resource id
- **THEN** `draftValid` is false and the editor does not claim the draft is valid

### Requirement: Tier pyramid and transition checklist
The client SHALL render the tier pyramid per location from location summaries, and the selected residence's transition eligibility as a per-condition checklist including sustained-timer progress, issuing `RequestPopulationTransition` from an eligible entry.

Source: REF-12.3, REF-12.4, PIC-10.1, PIC-10.2

#### Scenario: The checklist shows sustained progress
- **WHEN** a residence's transition entry reports a sustained condition with `progress: 2` of `ticks: 3`
- **THEN** the residence section shows the condition, its progress, and a disabled Advance button while ineligible

#### Scenario: An eligible transition can be requested
- **WHEN** the entry is eligible
- **THEN** the Advance button is enabled and issues `RequestPopulationTransition` for the residence and transition

### Requirement: Purpose-lock toggles
The progression drawer SHALL list the selected location's inventory resources with Lock and Unlock controls issuing `SetResourcePurposeLock` for the `population_transition` purpose.

Source: REF-12.4, GDD-8.5

#### Scenario: A resource can be locked
- **WHEN** the player presses Lock on a resource
- **THEN** the client sends `SetResourcePurposeLock` with `locked: true` for that inventory, resource, and purpose

### Requirement: Coverage overlay
The client SHALL offer a coverage grid overlay (`O`) that draws each coverage provider's radius derived from definition metadata.

Source: REF-12.2, PIC-4

#### Scenario: Coverage circles appear for providers
- **WHEN** the coverage overlay is active and a coverage provider is placed
- **THEN** a circle of the provider's configured radius is drawn at its position
