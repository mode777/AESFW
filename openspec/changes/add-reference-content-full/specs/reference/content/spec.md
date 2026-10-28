# Spec Delta

## MODIFIED Requirements

### Requirement: Reference content package
`reference/content/ref.tier` SHALL be a valid `simulation_content` package at the R4 full stage of 07 §5: six grid locations in two regions, the complete Appendix B resource catalogue (8 primary, 6 intermediate, 12 consumer with complexity 1–4, 4 construction, EP, credits, capabilities AK1–AK4), tiers `ref.tier.population.s1` to `s4`, transport classes T1–T3, and the archetype templates of Appendix B.3. Every storable resource SHALL use the reference base scale `6000`. It SHALL produce no error-severity diagnostic under `aesfw validate --strict`, and its design-intent diagnostics SHALL be clean with strict promotion.

Source: REF-5, REF-7, GDD-23.4

#### Scenario: The reference content validates strictly
- **WHEN** `aesfw validate reference/content/ref.tier --strict` runs
- **THEN** it exits `0` with no error diagnostics

#### Scenario: The design-intent audit is clean
- **WHEN** `aesfw validate reference/content/ref.tier --strict --design-intent promote` runs on the R4 catalogue
- **THEN** it reports no design-intent findings

#### Scenario: The catalogue matches its stage counts
- **WHEN** the content is loaded
- **THEN** it defines 8 primary, 6 intermediate, 12 consumer, and 4 construction resources, 4 population tiers, and 3 transport classes

#### Scenario: The reference content defines the closed loop
- **WHEN** the content is loaded
- **THEN** it defines a recipe producing `ref.tier.resource.h1` from `ref.tier.resource.p1` and `ref.tier.resource.p2`, a recipe producing `ref.tier.resource.c1` from `ref.tier.resource.h1`, and a need consuming `ref.tier.resource.c1`

#### Scenario: Every storable resource uses the reference base scale
- **WHEN** the content is loaded
- **THEN** each of `ref.tier.resource.p1`, `ref.tier.resource.p2`, `ref.tier.resource.h1`, `ref.tier.resource.c1`, and `ref.tier.resource.bm1` declares `quantity.scale` `6000`

## ADDED Requirements

### Requirement: R4 tiers and transitions
The tiers S3 and S4 SHALL provide 1 AK3 / 1 AK4 per inhabitant (exact matching), credits income at `55` / `120` per population per tick, consumption factors `2250` / `3400` permille, and active categories B1–B3 / B1–B4 with required scores per B.5. The transitions S2→S3 (cost 14 BM2 + 8 BM3, unlock 400 S2 population) and S3→S4 (cost 18 BM3 + 10 BM4, unlock 900 S3) SHALL require full occupancy and Z ≥ 800 sustained 60 ticks, trigger automatically when eligible, and decline unrefunded with clamping, exactly like the R3 transitions.

Source: REF-5, REF-7 (07 §7 B.4, B.7), GDD-13

#### Scenario: S3 provides AK3 with its income
- **WHEN** the content is loaded
- **THEN** `ref.tier.population.s3` outputs `ref.tier.capability.ak3` per inhabitant and credits at `55` per population per tick with factor `2250`

#### Scenario: The S3→S4 advancement follows the same rules
- **WHEN** an S3 residence is full, sustained-eligible, unlocked at 900 S3, and can pay 18 BM3 + 10 BM4
- **THEN** the transition starts automatically and its decline refunds nothing

### Requirement: B4 and cross-region pressure
The category B4 SHALL be a `weighted_score` category whose members are consumer resources of complexity 3–4 whose recipes require at least one cross-region input, required score 2 at S4. The advanced combiner SHALL consume 3 inputs including at least one cross-region resource, produce 1 C/min, require 30 AK3, and unlock at 400 S2 population. The distribution rules SHALL keep at least one B4 member's cross-region input unavailable in each region, so B4 fulfillment requires inter-region transport.

Source: REF-5, REF-7 (07 §7 B.5, B.3), GDD-3.3, GDD-6.4

#### Scenario: B4 members need cross-region inputs
- **WHEN** the content is loaded
- **THEN** every B4 member's recipe consumes at least one resource whose region differs from the consuming location's region

#### Scenario: The advanced combiner is unlock-gated
- **WHEN** a definition of the advanced combiner is inspected for an owner below 400 S2
- **THEN** its metadata carries `locked: true` and its unlock hint names the threshold

### Requirement: R4 transport and exchanges
The transport classes T2 (4 typed slots of 100 units, `speed_permille: 800`, cost 80 BM2 + 40 BM3, maintenance 60/min) and T3 (6 typed slots of 150 units, `speed_permille: 700`, cost 120 BM3 + 60 BM4, maintenance 120/min) SHALL be defined with construction costs and maintenance per B.8. The exchanges SHALL list the full R4 good set for their region with the 07 §4 elasticity parameters.

Source: REF-5, REF-7 (07 §7 B.8, B.9), CONT-6.16, CONT-6.21

#### Scenario: T2 and T3 declare their cargo and speed
- **WHEN** the transport definitions are inspected
- **THEN** T2 declares four slots of `600000` base units at speed `800` and T3 six slots of `900000` at speed `700`

#### Scenario: The region exchanges cover the R4 goods
- **WHEN** the exchange definitions are loaded
- **THEN** each region's exchange quotes every tradeable good its region produces or consumes at R4

### Requirement: R4 presentation completeness
The presentation package SHALL localize every R4 definition with a name and short description, map buildable definitions to tier3/tier4 display categories with sort order, and carry an unlock hint for every unlock-gated definition. The strict presentation validation `--against ref.tier` SHALL pass.

Source: REF-3, REF-6, PIC-6, PIC-19

#### Scenario: Every R4 definition is localized
- **WHEN** the presentation package is validated against `ref.tier`
- **THEN** no definition is missing its name entry and the tier3/tier4 categories exist

#### Scenario: Build tabs cover four tiers
- **WHEN** the build-menu entries are computed from the mappings
- **THEN** four tier tabs exist in tier order
