# Spec Delta

## Purpose

Unlocks (GDD-19, CONT-6.17) expose definitions and actions to an owner once a condition holds, making progression a consequence of sustained population instead of a separate research currency.

## ADDED Requirements

### Requirement: Unlock definitions and targets
An unlock SHALL carry `id`, `scope` (`owner` or `global`), optional `reversible`, a non-empty `targets` list of `{ type, id }`, and a `condition`. Target types SHALL be limited to `entity_definition`, `recipe`, `population_tier`, `transport_type`, `location_template`, `connection`, `transition`, and `exchange`; an unknown type SHALL report `invalid_unlock_target`, and a target ID SHALL resolve to its definition when that collection exists.

Source: GDD-19, CONT-6.17

#### Scenario: A well-formed unlock validates
- **WHEN** an unlock targets `{ type: entity_definition, id: test.entity.residence_2 }` and references a resolvable condition
- **THEN** it compiles without diagnostics

#### Scenario: An unknown target type is reported
- **WHEN** an unlock target uses `type: spaceship`
- **THEN** the load reports `invalid_unlock_target`

### Requirement: Owner-scoped evaluation
Phase 25 SHALL evaluate each owner-scoped unlock's condition for every owner and add its target IDs to that owner's `unlocks` when the condition holds, keeping the list sorted and free of duplicates.

Source: GDD-19, ARCH-5.2

#### Scenario: A satisfied population threshold exposes the target
- **WHEN** an owner-scoped unlock requires `population_count >= 5`, the owner has `5` population, and phase 25 runs
- **THEN** the owner's `unlocks` contain the target IDs

#### Scenario: An unsatisfied condition exposes nothing
- **WHEN** the same owner has `4` population
- **THEN** the owner's `unlocks` stay empty

### Requirement: Reversible and persistent unlocks
A `reversible: true` unlock SHALL be revoked when its condition stops holding and no other satisfied unlock exposes the target; an unlock without `reversible` SHALL persist once exposed.

Source: GDD-19, CONT-6.17

#### Scenario: A reversible unlock is revoked
- **WHEN** a reversible unlock's condition fails after being satisfied
- **THEN** its target is removed from the owner's `unlocks`

#### Scenario: A non-reversible unlock survives
- **WHEN** a non-reversible unlock's condition fails after being satisfied
- **THEN** its target remains in the owner's `unlocks`

### Requirement: Definition availability
A definition targeted by an unlock SHALL be unavailable to an owner until that owner's `unlocks` contain the target ID. Phase 01 SHALL reject `PlaceEntityPlan` for an unavailable entity definition with `not_unlocked`; an untargeted definition SHALL remain available.

Source: GDD-19, TDS-16.2

#### Scenario: A locked definition cannot be placed
- **WHEN** an owner places an entity definition that an unsatisfied unlock targets
- **THEN** the command is rejected with `not_unlocked` and no entity is created

#### Scenario: An untargeted definition remains available
- **WHEN** an owner places a definition no unlock targets
- **THEN** the placement proceeds normally

### Requirement: Owner-scoped sustained timers
A `sustained` node inside an unlock condition SHALL have its timer updated in phase 22 for every owner, keyed by the owner's subject, so the unlock's sustained progress advances.

Source: TDS-14.3, GDD-19

#### Scenario: An unlock sustained condition accumulates per owner
- **WHEN** an unlock condition is `sustained { ticks: 2, condition: population_count >= 1 }` and the owner holds one population for two ticks
- **THEN** the timer for that owner stores `2` consecutive ticks

### Requirement: Unlock metadata exposure
Definition metadata SHALL mark a definition targeted by an unsatisfied unlock for the requesting actor with `locked: true`, and SHALL omit the field for available definitions.

Source: PIC-4, GDD-19

#### Scenario: A locked definition is marked
- **WHEN** metadata is requested for a definition the actor has not unlocked
- **THEN** its metadata carries `locked: true`
