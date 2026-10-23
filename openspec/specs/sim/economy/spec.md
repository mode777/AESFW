# sim/economy Specification

## Purpose

The owner balance model: balance resources that may go negative, population income scaled by satisfaction curves, and the phase-26 rules that credit income to owner accounts (GDD-7.5, GDD-11.3, GDD-20.2, CONT-6.3). Maintenance and the owner deficit policy extend this capability in later M4 rows.

## Requirements

### Requirement: Balance resources
A resource whose definition sets `allow_negative: true` SHALL be allowed to hold a negative quantity in the owning owner's account; every other stored quantity SHALL remain non-negative. An account transaction that would drive a non-balance resource below zero SHALL fail with `insufficient_balance`; one that drives a balance resource below zero SHALL succeed.

Source: GDD-7.5, CONT-6.3, ARCH-6

#### Scenario: A balance resource may go negative
- **WHEN** an account transaction applies a delta of `-100` to an owner's balance of a resource with `allow_negative: true` at balance `0`
- **THEN** the account holds `-100` and no error is raised

#### Scenario: A non-balance account cannot go negative
- **WHEN** an account transaction applies a delta of `-1` to an owner's balance of a resource without `allow_negative` at balance `0`
- **THEN** the transaction fails with `insufficient_balance` and the account keeps `0`

### Requirement: Content-derived negative-balance rules
The tick pipeline SHALL derive the set of negative-allowed resources from the loaded content, so that the same content produces the same transaction outcomes in every host and test harness without per-host configuration.

Source: GDD-7.5, TDS-12.2

#### Scenario: The same content yields the same outcome without configuration
- **WHEN** the full tick pipeline runs one tick that credits and then overdraws a balance resource, with no host-supplied environment
- **THEN** the account goes negative exactly as in a hand-driven transaction run with the same content

### Requirement: Owner account invariant
Invariant INV-01 SHALL treat an owner account entry below zero as a finding unless its resource declares `allow_negative`; inventory entries below zero remain findings in all cases.

Source: GDD-7.5, VER-8 (INV-01), CONT-6.3

#### Scenario: A negative balance without allow_negative is a finding
- **WHEN** an owner account holds `-5` of a resource without `allow_negative`
- **THEN** `checkInvariants` reports INV-01

#### Scenario: A negative balance of a balance resource is clean
- **WHEN** an owner account holds `-5` of a resource with `allow_negative: true`
- **THEN** `checkInvariants` reports no INV-01 finding

### Requirement: Population income
Phase 26 SHALL, for each residence in ascending entity ID and each resolved output in order, credit a normal-storage resource output to the account of the owner of the residence's location. A credit SHALL be `floor((count × rate_per_population_per_tick × curve(satisfaction_z) + carry) / 1000)` with the carry retained in `[0, 1000)`, where `curve` is the output's satisfaction curve evaluated at the residence's satisfaction Z in permille, and the full rate (`1000` permille) when no curve is configured. A residence with zero population, no location, or a location without owner SHALL produce nothing.

Source: GDD-11.3, GDD-20.2, ARCH-5.2 (phase 26), TDS-6.4

#### Scenario: Income is credited to the location owner
- **WHEN** a residence with population `10`, an owner-scoped output of rate `100`, and no satisfaction curve advances phase 26 under a location owned by owner `0`
- **THEN** owner `0`'s account for the output resource increases by `1000`

#### Scenario: The satisfaction curve scales income
- **WHEN** a residence with population `10`, rate `100`, and a satisfaction curve that maps `500` to `500` advances phase 26 while the residence's satisfaction Z is `500`
- **THEN** the owner's account increases by `500`

#### Scenario: Fractional income accumulates across ticks
- **WHEN** the scaled income for one tick is half a base unit for two consecutive ticks
- **THEN** the first tick credits `0` and the second credits `1`

#### Scenario: Zero population produces no income
- **WHEN** a residence with population `0` and an income output advances phase 26
- **THEN** no account changes and no event is emitted

#### Scenario: A residence without an owned location produces no income
- **WHEN** a residence with population `10` and an income output has no location, or its location has no owner
- **THEN** no account changes

### Requirement: Satisfaction curve resolution
Entity instantiation SHALL resolve a tier output's `satisfaction_curve` reference to the curve's definition handle; an unresolvable reference SHALL produce a content diagnostic. A tier output without `satisfaction_curve` SHALL use the full rate.

Source: GDD-11.3, CONT-6.10, TDS-20.2

#### Scenario: A configured curve is resolved at instantiation
- **WHEN** a package instantiates a tier whose income output declares `satisfaction_curve: test.curve.income`
- **THEN** the residence's income output carries the handle of `test.curve.income`

### Requirement: Income event attribution
A phase-26 income credit SHALL emit `PopulationOutputProduced` with the credited owner and the credited amount; capability outputs keep emitting without owner attribution.

Source: GDD-20.2, ARCH-9

#### Scenario: Income carries owner attribution
- **WHEN** a residence credits income of `1000` to owner `0`
- **THEN** a `PopulationOutputProduced` event names owner `0`, the residence, and amount `1000`

### Requirement: Maintenance component
An entity definition MAY declare a `maintenance` component with `interval_ticks ≥ 1`, a non-empty `inputs` list of `{ resource, quantity ≥ 1 }`, a `charge_policy` of `while_exists`, `while_enabled`, `while_active`, or `while_processing`, and a `shortage_policy` of `deactivate_entity`, `scale`, `accumulate_debt`, `ignore`, `trigger_transition`, or `owner_deficit_policy`. Instantiation SHALL publish the resolved component on entities of that definition.

Source: GDD-20.1, CONT-6.8

#### Scenario: A producer with maintenance instantiates the component
- **WHEN** a package instantiates an entity whose definition carries `interval_ticks: 60`, one input of quantity `5000`, `charge_policy: while_enabled`, and `shortage_policy: owner_deficit_policy`
- **THEN** the entity's maintenance component carries the interval, input, and both policies

### Requirement: Maintenance validation
Content validation SHALL report a diagnostic when `charge_policy: while_processing` is declared on an entity definition without a `producer` component, and when `shortage_policy: trigger_transition` is declared (transitions are not yet supported).

Source: GDD-20.1, CONT-6.8

#### Scenario: while_processing without a producer is rejected
- **WHEN** an entity definition without a `producer` component declares `charge_policy: while_processing`
- **THEN** validation reports the producer-required diagnostic

#### Scenario: trigger_transition is rejected until transitions exist
- **WHEN** an entity definition declares `shortage_policy: trigger_transition`
- **THEN** validation reports the unsupported-policy diagnostic

### Requirement: Maintenance charging
Phase 26 SHALL charge every maintenance-bearing entity on each interval boundary — when `tick mod interval_ticks = 0` — by debiting the owner-account of the entity's owner for every input line, in ascending input order, with reason `maintenance`. The charge SHALL be per interval, not per tick. Entities without a resolvable owner SHALL not be charged.

Source: GDD-4.8, GDD-20.1, GDD-20.2, ARCH-5.2 (phase 26)

#### Scenario: A charge debits the owner account on the interval boundary
- **WHEN** an entity with `interval_ticks: 10` and one input of quantity `500` is charged by the full pipeline at tick `20` under owner `0` holding `10000`
- **THEN** the owner's account holds `9500`, and a `MaintenanceCharged` event names the entity, owner, resource, and amount `500`

#### Scenario: No charge between interval boundaries
- **WHEN** the pipeline advances ticks `11` through `19` for an entity with `interval_ticks: 10`
- **THEN** no maintenance is charged in those ticks

#### Scenario: An entity without an owner is not charged
- **WHEN** a maintenance-bearing entity has no owner component
- **THEN** no account changes and no event is emitted

### Requirement: Charge policies
The charge policies SHALL gate charging as follows: `while_exists` charges from construction completion until deconstruction (operational lifecycle states, and entities without a lifecycle); `while_enabled` charges whenever the entity is not disabled and not deficit-paused, regardless of utilization; `while_active` charges only while the entity is not blocked; `while_processing` charges only while the entity's process advances. Under every policy, an entity paused by the deficit policy SHALL pay no maintenance (INV-11).

Source: GDD-4.8, GDD-20.1, VER-8 (INV-11)

#### Scenario: while_enabled charges an idle and a blocked producer
- **WHEN** a producer with `charge_policy: while_enabled` is `blocked` with block reasons at an interval boundary
- **THEN** maintenance is charged

#### Scenario: while_enabled does not charge a disabled entity
- **WHEN** an entity with `charge_policy: while_enabled` has been disabled at an interval boundary
- **THEN** no maintenance is charged

#### Scenario: while_exists charges a disabled entity
- **WHEN** an entity with `charge_policy: while_exists` is disabled at an interval boundary
- **THEN** maintenance is charged

#### Scenario: while_active does not charge a blocked producer
- **WHEN** a producer with `charge_policy: while_active` is `blocked` at an interval boundary
- **THEN** no maintenance is charged

#### Scenario: while_processing charges only a processing producer
- **WHEN** a producer with `charge_policy: while_processing` advances at an interval boundary first in `idle` and later in `processing`
- **THEN** the `idle` boundary charges nothing and the `processing` boundary charges

#### Scenario: A deficit-paused entity pays no maintenance under any policy
- **WHEN** an entity with `charge_policy: while_exists` is listed in its owner's deficit-paused state at an interval boundary
- **THEN** no maintenance is charged

#### Scenario: An entity under construction pays no maintenance
- **WHEN** an entity with `charge_policy: while_exists` is in the `constructing` state at an interval boundary
- **THEN** no maintenance is charged

### Requirement: Shortage policies
When a charge cannot be applied in full, the shortage policy SHALL decide the outcome: `deactivate_entity` disables the entity and charges nothing further this interval; `scale` charges the largest amount the owner's balance covers (zero when the balance is not positive); `accumulate_debt` charges nothing and adds the due amount to the entity's arrears, which the next interval adds to its due quantity until fully charged; `ignore` charges nothing; `owner_deficit_policy` charges nothing and emits the shortage event for the deficit policy; `trigger_transition` is rejected at validation. A partial shortfall within one input line SHALL be handled by the same policy.

Source: GDD-20.1

#### Scenario: deactivate_entity disables a shorted entity
- **WHEN** a charge of `500` cannot be paid at balance `100` under `deactivate_entity`
- **THEN** nothing is charged and the entity is disabled

#### Scenario: scale charges the affordable part
- **WHEN** a charge of `500` cannot be paid at balance `300` under `scale`
- **THEN** `300` is charged and the account holds `0`

#### Scenario: accumulate_debt accrues arrears and repays them later
- **WHEN** a charge of `500` cannot be paid at balance `0` under `accumulate_debt`, and the owner holds `1000` at the next interval
- **THEN** the arrears component reads `500` after the shorted interval, and the next interval charges `1000` in total and clears the arrears

#### Scenario: ignore leaves the balance untouched
- **WHEN** a charge of `500` cannot be paid at balance `100` under `ignore`
- **THEN** the account still holds `100` and the entity stays enabled

#### Scenario: owner_deficit_policy emits the shortage event
- **WHEN** a charge of `500` cannot be paid under `owner_deficit_policy`
- **THEN** a `MaintenanceShortage` event names the entity, resource, due amount, and the delegated policy

### Requirement: Maintenance read model
The entity detail read model SHALL expose the entity's maintenance as the per-interval amount (the sum of its input quantities) and its charge policy.

Source: PIC-10.1

#### Scenario: The entity detail carries the maintenance summary
- **WHEN** the entity detail is read for an entity with one input of quantity `500` and `charge_policy: while_enabled`
- **THEN** `maintenance` reads `{ amount: 500, policy: 'while_enabled' }`

### Requirement: Entity owner attribution
Entity instantiation and entity placement SHALL write the owning owner on the entity so phase 26 resolves the charging owner without content access. An entity placed at a location without owner SHALL carry no owner component.

Source: GDD-20.2, ARCH-12

#### Scenario: An instantiated entity carries its owner
- **WHEN** content instantiates entities at a location owned by owner `0`
- **THEN** each entity's owner component reads owner `0`

#### Scenario: A placed entity carries the location's owner
- **WHEN** an entity is placed at a location owned by owner `0`
- **THEN** the placed entity's owner component reads owner `0`

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
