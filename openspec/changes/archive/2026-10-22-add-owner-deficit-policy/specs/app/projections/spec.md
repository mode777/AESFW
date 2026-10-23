# Spec Delta

## Purpose

The entity detail read model exposes deficit-paused state (PIC-10.1: enabled state including `paused_by_deficit`).

## MODIFIED Requirements

### Requirement: Entity detail read model
`entityDetail(session, entity)` SHALL return an `EntityDetailDto` for an entity that has a `definition` component, a producer, or a residence, and `null` otherwise. The DTO SHALL carry the entity ID, definition ID, lifecycle (`active` when unset), location, owner, `enabled` (`true` when unset), the four available commands, production state and block reasons when the entity is a producer, and the population, satisfaction, and band when the entity is a residence. When the entity is listed in its owner's `deficitPaused` state, the DTO SHALL set `paused_by_deficit: true` and include `ResumeDeficitPausedEntities` in `available_commands`.

Source: PIC-10.1, TDS-18.4

#### Scenario: A residence detail reports its population
- **WHEN** a residence entity with population `50` and satisfaction `800` is inspected
- **THEN** the detail's `residence.population` is `50` and `residence.satisfaction` is `800`

#### Scenario: An unknown entity has no detail
- **WHEN** `entityDetail` is called for an entity with no components
- **THEN** it returns `null`

#### Scenario: A deficit-paused entity reports the pause
- **WHEN** an entity is listed in its owner's `deficitPaused` state
- **THEN** its detail carries `paused_by_deficit: true` and `available_commands` contains `ResumeDeficitPausedEntities`

#### Scenario: A running entity reports no pause
- **WHEN** an entity is not deficit-paused
- **THEN** its detail carries no `paused_by_deficit` field and no resume command
