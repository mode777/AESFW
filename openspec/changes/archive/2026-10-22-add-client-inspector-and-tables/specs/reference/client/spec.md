# Spec Delta

## Purpose

The entity inspector, the residence need breakdown, the inventory and population tables, and table mode (REF-12.3, REF-12.4, REF-15).

## ADDED Requirements

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
