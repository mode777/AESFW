# Spec Delta

## Purpose

The owner deficit policy: deterministic pause and resume of an owner's maintenance payers when the balance resource is in deficit (GDD-3.7, GDD-20.3, CONT-6.22).

## ADDED Requirements

### Requirement: Deficit policy definition
A `deficit_policy` definition SHALL carry a `resource`, a `trigger` comparison, `action: pause_entities`, an `order` list of `maintenance_desc` and/or `entity_id_asc`, `stop_when: net_rate_non_negative`, optional `exclude_tags`, and a `resume` object with a `policy` of `automatic_reverse_order`, `manual`, or `disabled` and a `when` comparison. Compilation SHALL resolve the `resource` reference and SHALL report a diagnostic when two policies name the same resource.

Source: CONT-6.22, GDD-20.3

#### Scenario: A deficit policy resolves its resource
- **WHEN** a package defines a deficit policy naming `test.resource.credits`
- **THEN** compilation reports no diagnostics

#### Scenario: A duplicate deficit policy for one resource is rejected
- **WHEN** two deficit policies both name `test.resource.credits`
- **THEN** compilation reports `duplicate_deficit_policy`

### Requirement: Deficit trigger and pause ordering
Phase 27 SHALL, for each owner in ascending handle, evaluate each compiled deficit policy against the owner's account for the policy resource. When the trigger holds, the owner's maintenance-bearing entities SHALL be paused one at a time in the configured order — `maintenance_desc` by the entity's per-interval due for the resource descending, then `entity_id_asc` — until the stop condition holds or no candidate remains. A candidate SHALL be an entity owned by the owner that has a maintenance component currently charging the policy resource, is not already deficit-paused, and whose definition tags do not intersect `exclude_tags`. A paused entity SHALL be listed in the owner's `deficitPaused` state and SHALL emit `DeficitPaused`.

Source: GDD-20.3, ARCH-5.2 (phase 27), CONT-6.22

#### Scenario: A deficit pauses the highest maintenance payer first
- **WHEN** owner `0`'s balance is `-1` and two entities charge `500` and `100` per interval while income per tick is `10`
- **THEN** the `500` entity is paused first, and pausing continues while `net_rate_non_negative` does not hold

#### Scenario: An excluded entity is never paused
- **WHEN** an entity whose definition carries tag `test.tag.hub` is the highest maintenance payer and `exclude_tags: [test.tag.hub]` is configured
- **THEN** the entity stays unpaused

#### Scenario: An entity already paused is not paused twice
- **WHEN** the trigger holds and an entity is already in the owner's `deficitPaused` state
- **THEN** it is not paused again and no second `DeficitPaused` event is emitted

### Requirement: Net-rate stop condition
`net_rate_non_negative` SHALL hold when the owner's income per tick for the resource is at least the owner's maintenance expense per tick for the resource. Income per tick SHALL be the sum over the owner's residences of `floor(count × rate_per_population_per_tick × curve(satisfaction_z) / 1000)` for income outputs of the resource. Expense per tick SHALL be the sum over the owner's currently charging maintenance entities of `floor(due_for_resource / interval_ticks)`.

Source: GDD-20.3, GDD-20.2

#### Scenario: The stop condition holds when income covers expenses
- **WHEN** the owner's residences produce `100` per tick of the resource and charging maintenance costs `50` per tick
- **THEN** `net_rate_non_negative` holds and no entity is paused

#### Scenario: The stop condition fails while expenses exceed income
- **WHEN** the owner's residences produce `10` per tick and charging maintenance costs `50` per tick
- **THEN** `net_rate_non_negative` does not hold and pausing continues while candidates remain

### Requirement: Deficit resume
When the resume policy is `automatic_reverse_order` and the resume `when` comparison holds against the balance, phase 27 SHALL resume the owner's deficit-paused entities in reverse pause order, removing them from `deficitPaused` and emitting `DeficitResumed` for each. Under `manual`, only the resume command restores them; under `disabled`, automatic resume never runs.

Source: GDD-20.3

#### Scenario: Automatic resume restores entities in reverse order
- **WHEN** entities `5` then `2` were paused and the balance becomes non-negative under `automatic_reverse_order`
- **THEN** entity `2` is resumed before entity `5` and both leave `deficitPaused`

#### Scenario: Manual resume never happens automatically
- **WHEN** the resume policy is `manual` and the balance becomes non-negative
- **THEN** no entity is resumed

### Requirement: Deficit pause excludes production and maintenance
An entity listed in its owner's `deficitPaused` state SHALL report `paused_by_deficit` as a production block reason and SHALL pay no maintenance (INV-11).

Source: GDD-20.3, VER-8 (INV-11)

#### Scenario: A paused producer is blocked and pays nothing
- **WHEN** a producer is deficit-paused and the pipeline advances
- **THEN** its producer block reasons contain `paused_by_deficit` and no maintenance is charged for it

### Requirement: Resume deficit command
The `ResumeDeficitPausedEntities` command SHALL carry either a list of entities or `all`; phase 01 SHALL remove the named entities (or every entity) of the command's actor owner from `deficitPaused` and emit `CommandApplied`, rejecting with `unknown_entity` when a named entity does not exist.

Source: TDS-16.2, ARCH-7.2

#### Scenario: The command resumes a named entity
- **WHEN** a `ResumeDeficitPausedEntities` command lists a paused entity of the actor owner
- **THEN** the entity leaves `deficitPaused` and a `CommandApplied` event is emitted

#### Scenario: The command resumes all paused entities
- **WHEN** a `ResumeDeficitPausedEntities` command carries `all`
- **THEN** every entity of the actor owner leaves `deficitPaused`

#### Scenario: A command naming a missing entity is rejected
- **WHEN** a `ResumeDeficitPausedEntities` command lists an entity that does not exist
- **THEN** a `CommandRejected` event with code `unknown_entity` is emitted
