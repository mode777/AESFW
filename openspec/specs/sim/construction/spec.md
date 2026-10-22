# sim/construction Specification

## Purpose

The generic entity lifecycle and construction mechanism (GDD-9.1, GDD-18.1, GDD-18.3): lifecycle states, construction plans and progress, atomic cost reservation, the `start`/`continuous`/`completion` commit policies, cancellation, deconstruction policies, and the phase-03/phase-30 finalization of lifecycle and expired reservations. It is theme-free framework behavior; the placement predicates and the placement/construction commands are owned by roadmap 3.3, which extends this capability.

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

A construction plan SHALL declare a duration in ticks, a resolved cost list, a commit policy, and a target inventory. A plan whose cost list is empty SHALL construct without reservations. Phase 03 SHALL process plans in ascending entity ID.

Source: GDD-18.1, ARCH-6.2, TDS-11.1

#### Scenario: A plan with no costs starts without reservations

- **WHEN** a plan with an empty cost list starts in phase 03
- **THEN** its lifecycle is `constructing` and it has no reservations

#### Scenario: Competing plans reserve in ascending entity ID order

- **WHEN** two plans at entities `3` and `4` each cost `1000` and the inventory stores `1000`
- **THEN** entity `3` is `constructing` and entity `4` is `awaiting_resources`

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
