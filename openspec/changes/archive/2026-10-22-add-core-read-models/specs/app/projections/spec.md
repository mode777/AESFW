# Spec Delta

## Purpose

The M2 read models over the world: definition metadata, entity detail, location summary, and need breakdown (PIC-4, PIC-10.1–10.3).

## ADDED Requirements

### Requirement: Definition metadata read model
`definitionMetadata(content, type)` SHALL return one `DefinitionMetadataDto` per compiled definition of `type`, ordered by ascending definition ID, carrying the definition's string ID, its type, its tags, its data as `parameters`, and an empty `commands` list. It SHALL NOT expose behaviour a client could mistake for authority.

Source: PIC-4, TDS-18.4

#### Scenario: Entity metadata carries its tags
- **WHEN** the content has one entity definition `test.entity.residence` tagged `test.tag.a`
- **THEN** `definitionMetadata(content, 'entity')` returns one entry with `definition_id` `test.entity.residence` and `tags` `['test.tag.a']`

### Requirement: Entity detail read model
`entityDetail(session, entity)` SHALL return an `EntityDetailDto` for an entity that has a `definition` component, a producer, or a residence, and `null` otherwise. The DTO SHALL carry the entity ID, definition ID, lifecycle (`active` when unset), location, owner, `enabled` (`true` when unset), the four available commands, production state and block reasons when the entity is a producer, and the population, satisfaction, and band when the entity is a residence.

Source: PIC-10.1, TDS-18.4

#### Scenario: A residence detail reports its population
- **WHEN** a residence entity with population `50` and satisfaction `800` is inspected
- **THEN** the detail's `residence.population` is `50` and `residence.satisfaction` is `800`

#### Scenario: An unknown entity has no detail
- **WHEN** `entityDetail` is called for an entity with no components
- **THEN** it returns `null`

### Requirement: Location summary read model
`locationSummary(session, actor, location)` SHALL return a `LocationSummaryDto` for a location entity and `null` otherwise, carrying knowledge, active state, inventory totals per resource, population totals per tier, an entity count, and the connection list (empty in M2).

Source: PIC-10.2, TDS-18.4

#### Scenario: A location summary totals its population
- **WHEN** a location holds a residence with population `50` of tier `test.tier.a`
- **THEN** the summary's `population_by_tier['test.tier.a']` is `50` and its entity count is `1`

#### Scenario: A non-location has no summary
- **WHEN** `locationSummary` is called for an entity with no location component
- **THEN** it returns `null`

### Requirement: Need breakdown read model
`needBreakdown(session, entity)` SHALL return one `NeedBreakdownDto` per need of a residence, and an empty array otherwise. Each entry SHALL carry the need ID, demand, delivered (the latest window value), fulfillment in permille (`1000` when demand is `0`, otherwise `min(1000, floor(delivered × 1000 / demand))`), the category ID, and the category result.

Source: PIC-10.3, TDS-18.4

#### Scenario: Fulfillment is computed from the window
- **WHEN** a need has demand `1000` and a latest window value of `800`
- **THEN** the breakdown entry's `fulfillment` is `800`

#### Scenario: A non-residence has no needs
- **WHEN** `needBreakdown` is called for a location entity
- **THEN** it returns an empty array
