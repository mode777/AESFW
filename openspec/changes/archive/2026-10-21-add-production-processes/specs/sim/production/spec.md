# Spec Delta

## Purpose

The production model: resource sources, the producer state machine, the machine-readable block reasons, and the tick phases that evaluate preconditions, reserve inputs and output capacity, advance processes, and commit production atomically (GDD-4.3, GDD-9.4, GDD-9.5, GDD-10.1–10.4, ARCH-5.2).

## ADDED Requirements

### Requirement: Resource sources
A `resourceSource` SHALL carry a policy of `infinite_rate` or `finite_deposit`, an output list of `(resource, rate, remaining)`, and an inventory. An `infinite_rate` source SHALL have `remaining: null` and deposit `rate` per tick. A `finite_deposit` source SHALL deposit `min(rate, remaining)` per tick and reduce `remaining` by the deposited amount, never below `0`.

Source: GDD-9.5, GDD-10.4

#### Scenario: An infinite source deposits its rate
- **WHEN** an infinite source with rate `1000` advances one tick
- **THEN** `1000` of its resource is deposited into its inventory

#### Scenario: A finite source depletes
- **WHEN** a finite source with rate `1000` and remaining `1500` advances two ticks
- **THEN** it deposits `1000` then `500`, and `remaining` is `0`

#### Scenario: An exhausted finite source deposits nothing
- **WHEN** a finite source with remaining `0` advances
- **THEN** it deposits nothing

### Requirement: Producer state
A `producer` SHALL carry its resolved recipe specifications, the selected recipe, its process-slot count, its input and output inventory references, its state (`idle`, `processing`, or `blocked`), its machine-readable block reasons, its progress, and its active input and capacity reservations. A recipe specification SHALL carry its mode, duration, inputs, outputs, capability requirements, and condition.

Source: GDD-9.4, GDD-10.1

#### Scenario: A producer carries its recipe specification
- **WHEN** a producer with one batch recipe of duration `10` is created
- **THEN** its state is `idle`, its progress is `0`, and its block reasons are empty

### Requirement: Production preconditions
Phase 07 SHALL set a producer's static block reasons in ascending entity-ID order: `entity_disabled` when disabled, `paused_by_deficit` when deficit-paused, `invalid_recipe` when the selected recipe is absent, `condition_false` when the recipe has a condition, `missing_inventory_access` when an input or output inventory is absent, and `location_inactive` when its location is inactive. A producer with any static reason SHALL be `blocked`; otherwise a previously blocked producer SHALL become `idle`.

Source: GDD-10.3, GDD-10.2

#### Scenario: A disabled producer is blocked
- **WHEN** a disabled producer is evaluated in phase 07
- **THEN** its block reasons are `['entity_disabled']` and its state is `blocked`

#### Scenario: A producer at an inactive location is blocked
- **WHEN** a producer at an inactive location is evaluated
- **THEN** its block reasons include `location_inactive`

### Requirement: All-or-nothing process start
Phase 11 SHALL attempt to start each idle producer whose static reasons are empty, in ascending entity-ID order. It SHALL block with `missing_capability` when the granted capability is below the recipe requirement, `missing_inventory_access` when an inventory is missing, and `missing_input` or `missing_output_capacity` when the atomic reservation fails. On success it SHALL set the state to `processing`, clear the block reasons, set progress to `0`, and record the input and capacity reservations. A partial start SHALL NOT occur (GDD-4.3, ARCH-6.2).

Source: GDD-4.3, GDD-10.2, ARCH-6.2, INV-15

#### Scenario: A producer with all inputs starts
- **WHEN** a producer whose inputs are fully available and whose capability is granted is started
- **THEN** its state is `processing`, its block reasons are empty, and it holds input and capacity reservations

#### Scenario: A missing input blocks the start
- **WHEN** a producer lacks one of its inputs
- **THEN** its state is `blocked` with `missing_input`, and no input or capacity reservation is held

#### Scenario: A missing capability blocks the start
- **WHEN** a producer's granted capability is below the recipe requirement
- **THEN** its state is `blocked` with `missing_capability`

### Requirement: Process advancement
Phase 12 SHALL increase the progress of every `processing` producer by one, and SHALL compute each source's pending output and reduce a finite source's remaining amount.

Source: GDD-10.2, GDD-10.4

#### Scenario: A processing producer advances
- **WHEN** a `processing` producer with progress `3` advances
- **THEN** its progress is `4`

### Requirement: Atomic production completion
Phase 13 SHALL, for a batch producer whose progress reached its duration and for a continuous producer each tick, atomically commit the reserved inputs, deposit the outputs, and release the capacity reservations; it SHALL set the producer to `idle` with progress `0`. It SHALL deposit a source's pending output. A completion SHALL commit all inputs and deposit all outputs, or neither (INV-15).

Source: GDD-10.4, ARCH-6.2, TDS-12.2, INV-15

#### Scenario: A batch producer completes
- **WHEN** a batch producer with duration `10` and progress `10` completes
- **THEN** its inputs are consumed, its outputs are deposited, its reservations are released, and its state is `idle`

#### Scenario: A continuous producer commits each tick
- **WHEN** a continuous producer advances one tick
- **THEN** it commits its per-tick inputs and deposits its per-tick outputs in the same tick

#### Scenario: A source's pending output is deposited
- **WHEN** a source has pending output from phase 12
- **THEN** phase 13 deposits it into the source's inventory

### Requirement: Block reasons are consistent with processing
A producer with a non-empty block-reason list SHALL NOT be `processing`, and a `processing` producer SHALL have no block reasons other than `throughput_throttled` (INV-22).

Source: GDD-10.3, INV-22

#### Scenario: A blocked producer is not processing
- **WHEN** a producer is `blocked` with `missing_input`
- **THEN** its state is not `processing`

#### Scenario: A processing producer has no block reasons
- **WHEN** a producer is `processing`
- **THEN** its block reasons are empty or `['throughput_throttled']`
