# testkit/scenarios Specification

## Purpose

Deterministic scenario fixtures and committed goldens that prove milestone mechanics end to end, together with the intent tests that assert each scenario's design claim.

## Requirements

### Requirement: Progression scenario fixture and golden
A theme-free content fixture SHALL cover two tiers with an advancement transition, a decline transition, a coverage service and provider, breadth and depth need categories, and a construction-costing transition; a scenario SHALL run it for 60 ticks with invariants and a committed golden whose checkpoints match on every run.

Source: VER-9.3, GDD-13.1, GDD-13.4

#### Scenario: The golden matches on every run
- **WHEN** the progression scenario runs twice
- **THEN** its checkpoint sequence equals the committed golden and no invariant finding is reported

### Requirement: Progression intent coverage
The scenarios SHALL be covered by tests that assert: advancement and decline complete (SCN-03); primary production starves after the only tier-1 population advances (SCN-07); breadth and depth reach equal category fulfillment (SCN-08); a coverage need is satisfied while the higher tier is active (SCN-09); decline refunds nothing and clamps population (SCN-11); and a purpose lock paces advancement until cleared (SCN-12).

Source: VER-9.3, SCN-03, SCN-07, SCN-08, SCN-09, SCN-11, SCN-12

#### Scenario: Advancement starves primary production
- **WHEN** the only tier-1 residence advances to tier 2 and loses its capability output
- **THEN** a capability shortage is reported after the advancement tick

#### Scenario: A purpose lock blocks advancement
- **WHEN** the transition's construction resource is locked against `population_transition`
- **THEN** no advancement starts until the lock is cleared
