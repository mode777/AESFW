# Spec Delta

## Purpose

Satisfaction bands (GDD-12.6, CONT-6.19) map ranges of satisfaction Z to effects — growth policy, income multiplier, advancement enablement, and decline with a grace period — and every residence with a band table is in exactly one band.

## ADDED Requirements

### Requirement: Satisfaction-band tables
A `satisfaction_bands` definition SHALL carry `id` and `bands`, each band with `min` in `[0, 1000]` and a list of effects (`growth { policy }`, `output_multiplier { resource, value }`, `enable_advancement`, `trigger_decline { transition?, grace_ticks }`). The band minima SHALL start at `0` and be strictly ascending; a violation SHALL report `invalid_satisfaction_bands`.

Source: CONT-6.19, GDD-12.6

#### Scenario: A well-formed table validates
- **WHEN** a table lists bands at minima `0`, `500`, and `800`
- **THEN** it validates without diagnostics

#### Scenario: A table not starting at zero is rejected
- **WHEN** a table's only band has `min: 100`
- **THEN** the load reports `invalid_satisfaction_bands`

#### Scenario: Overlapping or unsorted minima are rejected
- **WHEN** a table lists minima `800`, `500`, `0`
- **THEN** the load reports `invalid_satisfaction_bands`

### Requirement: Band selection and state
Phase 22 SHALL select for every residence with a band table and a satisfaction value the band with the highest `min` at or below Z, and SHALL write `bandState` with the band table handle, the band index, the resolved effects, and the decline grace counter, in ascending entity ID.

Source: GDD-12.6, CONT-6.19

#### Scenario: Z selects the highest band at or below it
- **WHEN** a table has minima `0`, `500`, `800` and a residence's Z is `900`
- **THEN** its `bandState.bandIndex` is `2`

#### Scenario: A residence without a band table gets no band state
- **WHEN** a residence's tier declares no `satisfaction.bands`
- **THEN** phase 22 writes no `bandState` for it

### Requirement: Band effects
The `growth` effect's policy SHALL replace the residence's growth policy while it is in that band; the `output_multiplier` effect SHALL scale the residence's normal-storage income for its resource by `value / 1000`; `enable_advancement` and `trigger_decline` SHALL be recorded in `bandState` for the transition engine.

Source: GDD-12.6, GDD-11.4, GDD-20.2

#### Scenario: A band multiplier scales income
- **WHEN** a residence of `10` population produces `100` credits per population per tick in a band with `output_multiplier { value: 400 }`
- **THEN** phase 26 credits `400` credits

#### Scenario: A growth effect resolves the override policy
- **WHEN** a residence is in a band whose growth effect names a policy with a decrease step
- **THEN** its `bandState.growthOverride` carries that policy's resolved steps

### Requirement: Decline grace timer
The decline grace counter SHALL start at `1` on entering a `trigger_decline` band, advance by one each tick the residence remains in that band, and reset to `0` when the band changes or when the band carries no `trigger_decline`.

Source: GDD-12.6, GDD-13.2

#### Scenario: The grace counter advances while the band holds
- **WHEN** a residence stays in a `trigger_decline { grace_ticks: 2 }` band for two phase-22 runs
- **THEN** the counter reads `2`

#### Scenario: A band change resets the counter
- **WHEN** the residence moves to a band without `trigger_decline`
- **THEN** the counter reads `0`

### Requirement: Band invariant
`checkInvariants` SHALL report INV-09 when a residence with a band table and a satisfaction value has no band state, or when its recorded band does not contain its Z.

Source: INV-09, GDD-12.6

#### Scenario: Missing band state is reported
- **WHEN** a residence has a band table and a satisfaction value but no `bandState`
- **THEN** the invariant checker reports `INV-09`
