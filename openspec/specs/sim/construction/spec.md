# sim/construction Specification

## Purpose

The generic entity lifecycle and construction mechanism (GDD-9.1, GDD-18.1, GDD-18.3): lifecycle states, construction plans and progress, atomic cost reservation, the `start`/`continuous`/`completion` commit policies, cancellation, deconstruction policies, and the phase-03/phase-30 finalization of lifecycle and expired reservations. It also owns the generic placement predicates (GDD-18.2), the read-only `placement_query` (PIC-12.1), and the `PlaceEntityPlan`, `CancelEntityPlan`, `CommitConstruction`, and `DeconstructEntity` commands (ARCH-7.3), which wire the 3.1 grid policy and the lifecycle mechanism into the command path. It is theme-free framework behavior.

## Requirements

### Requirement: Lifecycle states

An entity's lifecycle SHALL be exactly one of `planned`, `awaiting_resources`, `constructing`, `active`, `disabled`, `blocked`, `deconstructed`, or `cancelled`, stored in the `lifecycle` component and readable through `WorldReader.lifecycle`. Phase 03 SHALL advance the construction and operational transitions; phase 30 SHALL finalize the terminal states.

Source: GDD-9.1, ARCH-3.4, ARCH-5.2, TDS-8.3, TDS-11.1

#### Scenario: A planned entity with available costs starts constructing

- **WHEN** a `test.entity.builder` has a plan of duration `5` and a cost of `1000` of `test.resource.build`, the inventory stores `1000`, and phase 03 runs once
- **THEN** its lifecycle is `constructing`, its progress is `1`, and a `ConstructionStarted` event is emitted

#### Scenario: A constructing entity activates at its duration

- **WHEN** a `test.entity.builder` with duration `1` is planned and phase 03 runs once
- **THEN** its progress is `1`, its lifecycle is `active`, and a `ConstructionCompleted` event is emitted

### Requirement: Construction transitions

Only these construction transitions SHALL occur: `planned` → `awaiting_resources` or `constructing`; `awaiting_resources` → `constructing`; `constructing` → `active`; and `planned`, `awaiting_resources`, or `constructing` → `cancelled`.

Source: GDD-9.1, GDD-18.1, ARCH-5.2

#### Scenario: A planned entity without costs waits for resources

- **WHEN** the inventory stores `999` of `test.resource.build` and phase 03 runs once
- **THEN** its lifecycle is `awaiting_resources` and no reservation is created

#### Scenario: An awaiting entity starts when resources arrive

- **WHEN** an entity is `awaiting_resources`, the inventory then stores `1000`, and phase 03 runs
- **THEN** its lifecycle is `constructing` and a reservation for `1000` exists

### Requirement: Operational lifecycle states

`active` SHALL transition to `disabled` when the entity's `enabled` component is false, and back to `active` when it is true. `active` SHALL transition to `blocked` when the entity's producer is in the `blocked` state, and back to `active` otherwise.

Source: GDD-9.1, ARCH-5.2

#### Scenario: An active entity is disabled and re-enabled

- **WHEN** an `active` entity's `enabled` component is `false`, phase 03 runs, then `enabled` is set to `true` and phase 03 runs again
- **THEN** its lifecycle is `disabled` after the first run and `active` after the second

#### Scenario: An active entity is blocked and unblocked

- **WHEN** an `active` entity's producer is `blocked`, phase 03 runs, then the producer is `idle` and phase 03 runs again
- **THEN** its lifecycle is `blocked` after the first run and `active` after the second

### Requirement: Terminal lifecycle states

`deconstructed` and `cancelled` SHALL be terminal: an entity in either state SHALL NOT transition further, and phase 03 SHALL NOT advance it.

Source: GDD-9.1, TDS-11.1

#### Scenario: Terminal states are not advanced

- **WHEN** phase 03 runs on an entity whose lifecycle is `cancelled`
- **THEN** its lifecycle is still `cancelled`

### Requirement: Construction plans

A construction plan SHALL declare a duration in ticks, a resolved cost list, a commit policy, and a target inventory. A plan whose cost list is empty SHALL construct without reservations. Phase 03 SHALL process plans in ascending entity ID. The `PlaceEntityPlan` command SHALL create a plan from the entity definition's `construction` component, resolving `duration_ticks`, `costs`, `commit_policy`, the target inventory (the location's first inventory), and the optional `deconstruction` block; an entity definition without a `construction` component SHALL be placed directly in the `active` lifecycle state with no plan.

Source: GDD-18.1, ARCH-6.2, TDS-11.1

#### Scenario: A plan with no costs starts without reservations

- **WHEN** a plan with an empty cost list starts in phase 03
- **THEN** its lifecycle is `constructing` and it has no reservations

#### Scenario: Competing plans reserve in ascending entity ID order

- **WHEN** two plans at entities `3` and `4` each cost `1000` and the inventory stores `1000`
- **THEN** entity `3` is `constructing` and entity `4` is `awaiting_resources`

#### Scenario: Placement builds a plan from the definition

- **WHEN** a `test.entity.builder` definition declares `construction` with duration `5`, a cost of `1000` of `test.resource.build`, and commit policy `completion`, and `PlaceEntityPlan` places it at a `test.location.grid`
- **THEN** the new entity's plan has duration `5`, one cost of `1000` of `test.resource.build`, commit policy `completion`, and its lifecycle is `planned`

### Requirement: Construction progress

Progress SHALL advance by exactly one tick per phase-03 run that starts or continues construction, so a plan of duration `D` activates on the `D`-th run. A plan whose duration is `0` SHALL activate in the phase-03 run that starts it.

Source: GDD-18.1, TDS-11.1

#### Scenario: Progress advances one tick per run

- **WHEN** a `constructing` entity of duration `5` at progress `2` runs phase 03 twice
- **THEN** its progress is `4` and its lifecycle is still `constructing`

#### Scenario: A zero-duration plan activates immediately

- **WHEN** a plan of duration `0` with cost `0` starts in phase 03
- **THEN** its lifecycle is `active` at the end of that run

### Requirement: Atomic construction-cost reservation

Phase 03 SHALL reserve a plan's full cost list as one atomic composite with purpose `construction` and the constructing entity as holder. If any line cannot be reserved, no line SHALL be reserved and the entity SHALL enter `awaiting_resources`. Reserved costs SHALL be recorded in ascending reservation-ID order, parallel to the plan's cost list.

Source: GDD-18.1, GDD-8.3, ARCH-6.2, TDS-12.2

#### Scenario: The full cost list is reserved

- **WHEN** a plan costs `500` of `test.resource.a` and `300` of `test.resource.b` and the inventory stores both, and phase 03 starts it
- **THEN** the ledger holds one `500` reservation for `test.resource.a` and one `300` reservation for `test.resource.b`, both with purpose `construction`

#### Scenario: A partially available cost list reserves nothing

- **WHEN** a plan costs `500` of `test.resource.a` and `300` of `test.resource.b`, the inventory stores `500` of `test.resource.a` and `299` of `test.resource.b`, and phase 03 runs
- **THEN** its lifecycle is `awaiting_resources` and the ledger holds no reservation for the entity

#### Scenario: Exact stock is sufficient

- **WHEN** a plan costs `1000` and the inventory stores exactly `1000`
- **THEN** the reservation succeeds and the entity is `constructing`

### Requirement: Start commit policy

Under the `start` commit policy, the reserved costs SHALL be consumed in the phase-03 run that starts construction.

Source: GDD-18.1, CONT-6.8, ARCH-6.2

#### Scenario: Start policy consumes at start

- **WHEN** a plan costs `1000` with commit policy `start` starts, and phase 03 runs once
- **THEN** the inventory stores `0` and the entity has no reservations

### Requirement: Completion commit policy

Under the `completion` commit policy, the reserved costs SHALL be consumed when construction completes.

Source: GDD-18.1, CONT-6.8, ARCH-6.2

#### Scenario: Completion policy consumes at completion

- **WHEN** a plan costs `1000` of duration `3` with commit policy `completion` starts, and phase 03 runs once
- **THEN** the inventory still stores `1000` and a `1000` reservation exists; after two more phase-03 runs the inventory stores `0` and the reservation is gone

### Requirement: Continuous commit policy

Under the `continuous` commit policy, costs SHALL be consumed incrementally so that after `k` of `duration` ticks the total consumed is `floor(cost × k / duration)` per line, and exactly the full cost at completion.

Source: GDD-18.1, CONT-6.8, ARCH-6.2

#### Scenario: Continuous policy consumes incrementally

- **WHEN** a plan costs `1000` of duration `4` with commit policy `continuous` starts and runs through completion
- **THEN** the inventory stores `750` after the first run, `500` after the second, `250` after the third, and `0` after the fourth

#### Scenario: Continuous rounding sums exactly

- **WHEN** a plan costs `1000` of duration `3` with commit policy `continuous` completes
- **THEN** the inventory has been reduced by exactly `1000`

### Requirement: Cancellation

Cancelling a plan SHALL be a state transition to `cancelled` available only from `planned`, `awaiting_resources`, or `constructing`. Phase 30 SHALL release every outstanding reservation of a `cancelled` entity, SHALL NOT return already-committed quantities, SHALL emit `ConstructionCancelled`, and SHALL remove the entity from every store.

Source: GDD-9.1, GDD-18.1, TDS-12.3, TDS-11.1, INV-24

#### Scenario: Cancelling a constructing entity releases reservations

- **WHEN** a `constructing` entity under the `completion` policy has a `1000` reservation, it is cancelled, and phase 30 runs
- **THEN** the reservation is gone, the inventory stores `1000`, a `ConstructionCancelled` event is emitted, and the entity has no components

#### Scenario: Cancelling after a partial commit keeps the committed part

- **WHEN** a `constructing` entity under the `continuous` policy has consumed `500` of `1000` and is cancelled, and phase 30 runs
- **THEN** the inventory stores `500` and the entity is removed

#### Scenario: An active entity cannot be cancelled

- **WHEN** cancellation is requested for an `active` entity
- **THEN** the request is rejected and its lifecycle remains `active`

### Requirement: Deconstruction request

A deconstruction policy SHALL declare a duration in ticks, a list of returned resources, and whether outstanding reservations are cancelled. Requesting deconstruction SHALL set the entity's deconstruction deadline to the requesting tick plus the duration, available only from `active`, `disabled`, or `blocked`.

Source: GDD-18.3, GDD-18.1

#### Scenario: Deconstruction completes only at the deadline

- **WHEN** an `active` entity with a deconstruction duration of `2` is deconstructed and phase 30 runs one tick before the deadline
- **THEN** the entity is still `active` and no resources are returned

#### Scenario: A terminal entity cannot be deconstructed

- **WHEN** deconstruction is requested for a `cancelled` entity
- **THEN** the request is rejected and its lifecycle remains `cancelled`

### Requirement: Deconstruction completion

Phase 30 SHALL, on or after the deadline, deposit the returned resources into the plan's inventory as one atomic composite, release outstanding reservations when the policy says so, emit `EntityDeconstructed`, and remove the entity from every store.

Source: GDD-18.3, ARCH-6.2, INV-24

#### Scenario: Deconstruction deposits returned resources

- **WHEN** an `active` entity with a deconstruction policy of duration `2` returning `400` of `test.resource.build` is deconstructed and phase 30 runs at the deadline
- **THEN** the inventory gains `400` of `test.resource.build` and an `EntityDeconstructed` event is emitted

#### Scenario: Reservation cancellation on deconstruction

- **WHEN** an `active` entity whose deconstruction policy cancels reservations has an outstanding `300` reservation, and phase 30 runs at the deadline
- **THEN** the reservation is released and the entity is removed

### Requirement: Phase 30 lifecycle finalization and expired reservations

Phase 30 SHALL release every reservation whose expiry is at or before the tick being computed (TDS-12.3), remove every entity whose lifecycle is `cancelled` or whose deconstruction completed, compact every component store so no tombstone survives the phase (INV-24), and mark the derived caches dirty when any entity was removed.

Source: TDS-11.1, TDS-12.3, TDS-8.2, INV-24

#### Scenario: An expired reservation is released

- **WHEN** a reservation expires at tick `10` and phase 30 runs at tick `10`
- **THEN** the reservation is gone from the ledger

#### Scenario: A removed entity leaves no tombstone

- **WHEN** a `cancelled` entity is processed by phase 30
- **THEN** no component store lists it and its component slots are compacted

#### Scenario: Removing an entity marks the caches dirty

- **WHEN** phase 30 removes an entity
- **THEN** `world.caches.dirty` is true

### Requirement: Placement component

A `placement` component SHALL declare a non-negative `capacity_cost`, an optional `footprint` of width by height cells, and an optional list of `conditions` referencing condition definitions.

Source: GDD-18.2, CONT-6.8

#### Scenario: A placement component declares its cost and footprint

- **WHEN** a `test.entity.builder` definition declares `placement` with `capacity_cost: 10` and `footprint: [2, 2]`
- **THEN** its resolved placement spec has capacity cost `10` and a `2` by `2` footprint

### Requirement: Built-in geometric predicates

Placement SHALL be validated by the built-in geometric predicates of GDD-18.2. They SHALL reject, in this order: a missing location (`unknown_location`), an inactive location (`location_inactive`), footprint cells outside the grid (`out_of_bounds`), cells overlapping a blocked cell (`not_buildable`), and cells occupied by another entity (`occupied`).

Source: GDD-18.2, CONT-6.8, ARCH-11, TDS-10.1

#### Scenario: A valid placement is accepted

- **WHEN** a `test.entity.builder` with a `1` by `1` footprint and capacity cost `1` is validated at a `4` by `4` grid location with free capacity
- **THEN** the result is `ok`

#### Scenario: An unknown location is rejected

- **WHEN** a placement targets an entity that is not a location
- **THEN** the result is `unknown_location`

#### Scenario: An inactive location is rejected

- **WHEN** a placement targets a grid location whose `active` flag is false
- **THEN** the result is `location_inactive`

#### Scenario: A footprint outside the grid is rejected

- **WHEN** a `2` by `2` footprint is validated at position `(3, 3)` of a `4` by `4` grid
- **THEN** the result is `out_of_bounds`

#### Scenario: A blocked cell is rejected

- **WHEN** a `1` by `1` footprint is validated at the blocked cell `(0, 0)` of a `4` by `4` grid
- **THEN** the result is `not_buildable`

#### Scenario: An occupied cell is rejected

- **WHEN** a placed entity occupies cell `(1, 1)` and a second `1` by `1` footprint is validated at `(1, 1)`
- **THEN** the result is `occupied`

### Requirement: Capacity predicate

Placement SHALL reject a footprint or `capacity_cost` that exceeds the location's free capacity with `insufficient_capacity`, carrying the required and available amounts. For a grid location the free capacity is the buildable cell count minus the used cells; for a count-based location it is the total capacity minus the used amount.

Source: GDD-18.2, ARCH-11, TDS-10.1

#### Scenario: A footprint beyond grid capacity is rejected

- **WHEN** a `3` by `3` footprint is validated at a `4` by `4` grid location with `12` buildable cells and `4` used cells
- **THEN** the result is `insufficient_capacity` with required `9` and available `8`

#### Scenario: A count beyond abstract capacity is rejected

- **WHEN** a `capacity_cost` of `10` is validated at a count-based location with total `12` and used `3`
- **THEN** the result is `insufficient_capacity` with required `10` and available `9`

### Requirement: Placement conditions

Each `conditions` entry of a `placement` component SHALL be evaluated against the target location; when any evaluates to false the placement SHALL be rejected with `placement_condition_failed` naming the condition.

Source: GDD-18.2, CONT-6.8, TDS-10.1

#### Scenario: A satisfied condition is accepted

- **WHEN** a placement declares one condition that the target location satisfies and all built-in predicates pass
- **THEN** the result is `ok`

#### Scenario: A failed condition is rejected

- **WHEN** a placement declares one condition that the target location does not satisfy
- **THEN** the result is `placement_condition_failed` naming that condition

### Requirement: Placement query

The read-only `placement_query` of PIC-12.1 SHALL take a definition, a location, and a logical transform and return a `placement_result` carrying `valid`, the current session `revision`, and the ordered rejection `reasons`. It SHALL NOT mutate authoritative state. An unknown definition SHALL be rejected with `unknown_definition`.

Source: PIC-12.1, GDD-18.2, TDS-10.1

#### Scenario: A valid query reports valid

- **WHEN** `placement_query` is asked about a legal placement at revision `942`
- **THEN** the result is valid, its revision is `942`, and its reasons are empty

#### Scenario: An invalid query reports its reasons

- **WHEN** `placement_query` is asked about a placement on an inactive location
- **THEN** the result is invalid and its reasons contain `location_inactive`

#### Scenario: A query does not mutate the world

- **WHEN** a `placement_query` is answered
- **THEN** the world's tick, ledger, and occupancy cache are unchanged

#### Scenario: An unknown definition is rejected

- **WHEN** `placement_query` names a definition ID that is not in the content registry
- **THEN** the result is invalid and its reasons contain `unknown_definition`

### Requirement: Place entity plan command

`PlaceEntityPlan` SHALL be applied in phase 01 in `(tick, actor, seq)` order. On a legal placement it SHALL allocate an entity, set its `definition`, `placement`, `transform`, and `footprint`, create the construction plan from the definition, and emit `CommandApplied`. An illegal placement SHALL emit `CommandRejected` with the reasons and allocate no entity. An unknown definition SHALL emit `CommandRejected` with `unknown_definition`.

Source: GDD-18.1, GDD-18.2, ARCH-7.3, TDS-16.1

#### Scenario: A legal placement creates a planned entity

- **WHEN** `PlaceEntityPlan` places a `test.entity.builder` at `(1, 1)` of a `4` by `4` grid location
- **THEN** a new entity exists whose lifecycle is `planned`, whose definition is the requested one, and whose `transform` position is `(1, 1)`

#### Scenario: A definition without construction activates immediately

- **WHEN** `PlaceEntityPlan` places a definition with no `construction` component
- **THEN** the new entity's lifecycle is `active` and it has no `constructionPlan` component

#### Scenario: An illegal placement allocates no entity

- **WHEN** `PlaceEntityPlan` targets an occupied cell
- **THEN** the command is rejected with `occupied` and the world's entity count is unchanged

#### Scenario: An unknown definition is rejected

- **WHEN** `PlaceEntityPlan` names a definition ID that is not in the content registry
- **THEN** the command is rejected with `unknown_definition`

#### Scenario: Two placements apply in submission order

- **WHEN** two `PlaceEntityPlan` commands for the same `1` by `1` cell are scheduled with sequence `0` and `1`
- **THEN** the first is applied and the second is rejected with `occupied`

### Requirement: Cancel entity plan command

`CancelEntityPlan` SHALL request cancellation of a plan in phase 01. It SHALL apply only from `planned`, `awaiting_resources`, or `constructing` and SHALL emit `CommandApplied`; from any other state it SHALL emit `CommandRejected` with `invalid_construction_state` and SHALL NOT change the lifecycle.

Source: GDD-9.1, ARCH-7.3, TDS-16.1

#### Scenario: Cancelling a planned entity applies

- **WHEN** `CancelEntityPlan` targets a `planned` entity
- **THEN** the command is applied and its lifecycle is `cancelled`

#### Scenario: Cancelling an active entity is rejected

- **WHEN** `CancelEntityPlan` targets an `active` entity
- **THEN** the command is rejected with `invalid_construction_state` and its lifecycle remains `active`

### Requirement: Commit construction command

`CommitConstruction` SHALL commit every outstanding construction reservation held by a `planned`, `awaiting_resources`, or `constructing` entity in phase 01 and emit `CommandApplied`. From any other state, or when the entity has no construction plan, it SHALL emit `CommandRejected` with `invalid_construction_state`.

Source: GDD-18.1, ARCH-7.3, TDS-12.2, TDS-16.1

#### Scenario: Committing a constructing entity consumes its reservation

- **WHEN** a `constructing` entity under the `completion` policy holds a `1000` reservation and `CommitConstruction` is applied
- **THEN** the inventory stores `0`, the reservation is gone, and the command is applied

#### Scenario: Committing an active entity is rejected

- **WHEN** `CommitConstruction` targets an `active` entity
- **THEN** the command is rejected with `invalid_construction_state`

### Requirement: Deconstruct entity command

`DeconstructEntity` SHALL request deconstruction in phase 01 through the deconstruction policy. It SHALL apply only from `active`, `disabled`, or `blocked` when the entity's plan declares a deconstruction policy, setting the deadline to the requesting tick plus the policy duration, and SHALL emit `CommandApplied`; from any other state it SHALL emit `CommandRejected` with `invalid_construction_state`.

Source: GDD-18.3, ARCH-7.3, TDS-16.1

#### Scenario: Deconstructing an active entity applies

- **WHEN** `DeconstructEntity` targets an `active` entity whose plan declares a deconstruction policy of duration `2`
- **THEN** the command is applied and its deconstruction deadline is the requesting tick plus `2`

#### Scenario: Deconstructing a terminal entity is rejected

- **WHEN** `DeconstructEntity` targets a `cancelled` entity
- **THEN** the command is rejected with `invalid_construction_state` and its lifecycle remains `cancelled`

### Requirement: Placement command error codes

The command error-code registry SHALL define `unknown_definition`, `unknown_location`, `location_inactive`, `out_of_bounds`, `not_buildable`, `occupied`, `insufficient_capacity`, `placement_condition_failed`, and `invalid_construction_state`, each declaring the argument names it carries.

Source: TDS-16.3, PIC-13, GDD-18.2

#### Scenario: The placement error codes are registered

- **WHEN** the command error-code registry is inspected
- **THEN** it contains the nine placement error codes, and `insufficient_capacity` declares the arguments `required` and `available`

#### Scenario: A rejected placement carries machine-readable arguments

- **WHEN** a placement is rejected with `insufficient_capacity`
- **THEN** the emitted `CommandRejected` error carries `required` and `available` as safe integers
