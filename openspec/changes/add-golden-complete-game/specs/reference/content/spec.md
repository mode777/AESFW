# Spec Delta

## ADDED Requirements

### Requirement: SCN-14 complete-game golden
`reference/content/test/scenarios/complete_game.yaml` SHALL run the R3 content for `7200` ticks with the opening strategy's scheduled commands, `run.invariants: all`, and expectations asserting that the first S1→S2 advancement transition occurred and tier S2 population is present at the final tick. The scenario SHALL have a committed golden hash file, and the run SHALL report zero invariant findings and zero failed expectations.

Source: VER-9.3 (SCN-14), GDD-23.4, GDD-23.5

#### Scenario: The complete game runs 7,200 ticks
- **WHEN** the host-node test executes `complete_game.yaml`
- **THEN** the run completes 7200 ticks with no invariant findings and all expectations pass

#### Scenario: Tier 2 is reached by the scripted strategy
- **WHEN** the run's events and metrics are inspected
- **THEN** a `PopulationTransitioned` advancement to S2 is observed and the final population includes S2

#### Scenario: The golden hash file is committed and matches
- **WHEN** the scenario runs twice from a clean checkout
- **THEN** both runs produce every golden checkpoint hash unchanged

### Requirement: SCN-14 determinism harnesses
The SCN-14 test SHALL also run the double-run harness (two fresh runs compare every checkpoint hash) and the save-continue harness (save at tick 3600, load, continue to 7200, compare with the uninterrupted run).

Source: VER-8.1, VER-9.3

#### Scenario: A double-run is byte-identical
- **WHEN** the scenario runs twice in fresh contexts
- **THEN** all checkpoint hashes are equal

#### Scenario: Save-continue matches the uninterrupted run
- **WHEN** the scenario saves at tick `3600`, reloads, and continues to `7200`
- **THEN** the checkpoint hashes from `3600` onward equal the uninterrupted run's

### Requirement: SCN-18 reference half
A reference test SHALL build the Appendix B.3 reference chain on `ref.tier` definitions (2 area extractors P1, 2 refiners H1, 1 slot extractor P2, 1 combiner C1) and assert the planning read model reports supported population `200` for S1 and `133` for S2 on the consumed resource of the chain.

Source: VER-9.3 (SCN-18), GDD-3.8, PIC-10.5, REF-4

#### Scenario: The reference chain supports 200 S1
- **WHEN** the planning metrics are computed for the chain's consumed resource at S1 demand
- **THEN** supported population for `ref.tier.population.s1` is `200`

#### Scenario: The reference chain supports 133 S2
- **WHEN** the planning metrics are computed at S2 demand
- **THEN** supported population for `ref.tier.population.s2` is `133`
