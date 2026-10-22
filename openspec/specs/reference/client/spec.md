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
