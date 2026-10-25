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

### Requirement: Exploration scenario fixture and golden
A theme-free content fixture SHALL cover a home location with a package-producing source, a frontier location governed by an establishment definition, and two transport units; a scenario SHALL load the establishment cost at home with a route order, discover the frontier with an explore order, and establish the frontier with an establish order, running 40 ticks with invariants and a committed golden whose checkpoints match on every run. The run SHALL emit `LocationDiscovered` and `LocationEstablished` and report no invariant findings.

Source: VER-9.3, SCN-05, GDD-16

#### Scenario: The exploration golden matches
- **WHEN** `aesfw run` executes the exploration scenario and the committed hashes are compared
- **THEN** every checkpoint matches, the findings list is empty, and the event stream contains `LocationDiscovered` and `LocationEstablished`

#### Scenario: A repeat run is byte-identical
- **WHEN** the scenario runs twice
- **THEN** both runs produce byte-identical output

#### Scenario: Establishment pays from transported cargo
- **WHEN** the establish order arrives at the frontier
- **THEN** the unit's cargo is emptied by the establishment cost and the location ends owned, active, and established

### Requirement: SCN-06 exchange golden
The exchange scenario SHALL exist as a theme-free fixture with a committed golden: a transport unit buys from an exchange in repeated steps, sells in repeated steps whose prices fall by the elasticity rule, waits through the configured recovery intervals, and sells again at a price recovered toward the base. The scenario SHALL run with zero invariant findings, checkpoint hashes SHALL match the committed golden on every run, and repeat runs SHALL be byte-identical.

Source: VER-9.3, SCN-06, GDD-17.3

#### Scenario: Repeated sales lower the price, which then recovers
- **WHEN** the scenario runs its buy phase (four buys of `100` at base buy price `12000`), its sell phase (three sells of `100` at base sell price `8000`), and a final sell of the remaining cargo after the recovery intervals
- **THEN** the traded prices are `12000`, `13200`, `14400`, `15600`, `8000`, `7200`, `6400`, and `8000`, with zero invariant findings and hashes equal to the golden

#### Scenario: The golden is stable across runs
- **WHEN** the scenario executes twice
- **THEN** both runs produce byte-identical reports and match the committed checkpoint hashes
