# Spec Delta

## Purpose

Maintenance: deterministic periodic entity costs with charge policies, intervals, and shortage policies (GDD-4.8, GDD-20.1).

## ADDED Requirements

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
