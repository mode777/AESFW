# Spec Delta

## MODIFIED Requirements

### Requirement: Reference content package
`reference/content/ref.tier` SHALL be a valid `simulation_content` package at the R3 prototype stage of 07 §5: six grid locations in two regions, the resource catalogue of Appendix B.0 (4 primary, 2 intermediate, 4 consumer, 2 construction, EP, credits), tiers `ref.tier.population.s1` and `s2`, one transport class, and the archetype templates of Appendix B.3. Every storable resource SHALL use the reference base scale `6000`. It SHALL produce no error-severity diagnostic under `aesfw validate --strict`, and its design-intent diagnostics SHALL be clean with strict promotion.

Source: REF-5, REF-7, GDD-23.5

#### Scenario: The reference content validates strictly
- **WHEN** `aesfw validate reference/content/ref.tier --strict` runs
- **THEN** it exits `0` with no error diagnostics

#### Scenario: The design-intent audit is clean
- **WHEN** `aesfw validate reference/content/ref.tier --strict --design-intent promote` runs
- **THEN** it reports no design-intent findings

#### Scenario: The catalogue matches its stage counts
- **WHEN** the content is loaded
- **THEN** it defines 6 locations (4 in region α, 2 in region β), 4 primary, 2 intermediate, 4 consumer, and 2 construction resources, 2 population tiers, and 1 transport unit class

#### Scenario: The reference content defines the closed loop
- **WHEN** the content is loaded
- **THEN** it defines a recipe producing `ref.tier.resource.h1` from `ref.tier.resource.p1`, a recipe producing `ref.tier.resource.c1` from `ref.tier.resource.h1` and `ref.tier.resource.p2`, and a need consuming `ref.tier.resource.c1`

#### Scenario: Every storable resource uses the reference base scale
- **WHEN** the content is loaded
- **THEN** each of `ref.tier.resource.p1`, `ref.tier.resource.p2`, `ref.tier.resource.h1`, `ref.tier.resource.c1`, and `ref.tier.resource.bm1` declares `quantity.scale` `6000`

### Requirement: Presentation skeleton
`reference/content/ref.tier.presentation` SHALL be a `presentation_content` package that depends on `ref.tier` and provides localization, mappings, and formatting files, with codes as display names (no thematic names). Its formatting SHALL declare the reference base scale `6000` and a `1000` ms tick duration. Its localization SHALL carry a name, a short description, and — for unlock-gated definitions — a static unlock hint for every definition of the R3 stage, and its mappings SHALL carry a display category per buildable entity and a sort order.

Source: REF-3, REF-6, PIC-5, PIC-6, PIC-7

#### Scenario: The presentation package declares its dependency
- **WHEN** the presentation manifest is read
- **THEN** it depends on `ref.tier` and lists localization, mappings, and formatting files

#### Scenario: The presentation formatting uses the reference base scale
- **WHEN** the presentation formatting is read
- **THEN** `base_scale` is `6000` and `tick_duration_ms` is `1000`

#### Scenario: Every R3 definition is localized
- **WHEN** the presentation package is validated against `ref.tier`
- **THEN** no definition of the R3 stage is missing its name entry

#### Scenario: Locked definitions carry an unlock hint
- **WHEN** a definition gated by a population-threshold unlock has no unlocked owner
- **THEN** its localization carries a `<id>.unlock_hint` entry naming the threshold

## ADDED Requirements

### Requirement: R3 world, regions, and start state
The reference content SHALL define an R3 world with six `framework.spatial.grid` locations (40×40, buildable ratio 400–700 permille): four in region α and two in region β, generated from the seeded `world_generation` stream for masks, slots (0–4 of types V-A to V-F), and suitability (0, 500, 1000 permille). The regions SHALL carry disjoint distribution rules over the suitability properties and slot types, so each region lacks at least one primary resource. Fog SHALL be enabled. The start state SHALL be one established α location whose owner additionally knows exactly one adjacent location and the α exchange, and its initial stock SHALL allow placing and operating the first S1 chain without trade.

Source: REF-5, REF-7, GDD-23.5, GDD-6.4, CONT-6.18

#### Scenario: Regions partition the locations disjointly
- **WHEN** the content is loaded
- **THEN** region α owns 4 and region β owns 2 locations and no primary-resource suitability or slot type is assigned to both regions by their distribution rules

#### Scenario: The start state knows one neighbour and the home exchange
- **WHEN** the R3 world is instantiated
- **THEN** exactly one α location is established, exactly one other location is known, and the α exchange is known

#### Scenario: The start state can build the first chain
- **WHEN** the R3 world runs for 600 ticks with no commands
- **THEN** the initial residences' satisfaction stays at or above the top band threshold or the initial stock suffices to place and supply the first S1 chain without any trade command

### Requirement: R3 resource catalogue
The reference content SHALL define, with role tags and the 6000 base scale: the primary resources P1–P4 (two per region), the intermediates H1–H2, the consumer resources C1–C4 with complexity 1–3, the construction resources BM1–BM2, the establishment resource EP (storable, transportable, combined expensively), and the owner-scoped balance resource credits with `allow_negative: true`.

Source: REF-5, REF-7 (07 §7 B.2)

#### Scenario: Every catalogue resource carries its role tag
- **WHEN** the content is loaded
- **THEN** each resource P1–P4, H1–H2, C1–C4, BM1–BM2, and EP carries one `ref.tier.role.*` tag and scale `6000`

#### Scenario: EP is an establishment resource
- **WHEN** the content is loaded
- **THEN** `ref.tier.resource.ep` is storable and transportable and the establishment cost of a location is expressed in EP

### Requirement: R3 tiers, needs, and coverage
The tiers `ref.tier.population.s1` and `s2` SHALL each output their capability (1 AK1 / 1 AK2 per inhabitant, exact matching, no substitutes) at their location and credits income at `10` / `25` per population per tick with the satisfaction curve, and SHALL declare consumption factors `1000` / `1500` permille. The need categories SHALL be B1 and B2 as `weighted_score` categories (weights equal resource complexity, required score by tier) and B3 as a `spatial_coverage` category over the coverage service, with S1 active in B1 and S2 active in B1–B3.

Source: REF-5, REF-7 (07 §7 B.4, B.5), GDD-14, CONT-6.13

#### Scenario: The tiers provide distinct capabilities
- **WHEN** the content is loaded
- **THEN** `ref.tier.population.s1` outputs `ref.tier.capability.ak1` and `s2` outputs `ref.tier.capability.ak2`, each 1 per inhabitant

#### Scenario: B3 is a coverage category
- **WHEN** the content is loaded
- **THEN** `ref.tier.need_category.b3` is satisfied by spatial coverage from the coverage-service entity, whose placement declares its coverage radius

### Requirement: R3 bands and transitions
The satisfaction bands SHALL implement Appendix B.6: growth +1 per 8 ticks in the top band, decline after a 60-tick grace below the second band, emigration −1 per 4 ticks in the bottom band, income multipliers 1000/700/400 permille by band, and residence decay at zero population. The transitions SHALL implement B.7: a new-S1-residence advancement costing 6 BM1 from the location inventory, an S1→S2 advancement costing 10 BM1 + 6 BM2 under purpose `population_transition` with full occupancy and Z ≥ 800 sustained 60 ticks, unlocked at 150 S1 population and triggered automatically when eligible, and a decline that refunds nothing and clamps to the target capacity.

Source: REF-5, REF-7 (07 §7 B.6, B.7), GDD-13, CONT-6.15, GDD-8.5

#### Scenario: The S1→S2 advancement triggers automatically
- **WHEN** an S1 residence is full, its Z stays at or above 800 for 60 ticks, the unlock is met, and the costs are available and not purpose-locked
- **THEN** the transition starts without any player command

#### Scenario: A purpose lock gates the advancement
- **WHEN** the same residence's owner locks BM1 for the `population_transition` purpose
- **THEN** the transition does not start while the lock holds

#### Scenario: Decline refunds nothing and clamps
- **WHEN** an S2 residence declines to S1
- **THEN** no cost is refunded and the population is clamped to the S1 capacity of 10

### Requirement: R3 economy, transport, and exchanges
The reference content SHALL charge `while_enabled` maintenance at Appendix B.3 rates (converted per 07 §4) on the production, service, storage, and transport definitions, and the owner deficit policy SHALL pause entities by highest maintenance first until the net rate is ≥ 0 with automatic reverse resume. Transport SHALL define class T1 (2 typed slots of 50 units, `speed_permille: 1000`, cost 40 BM1 + 20 BM2, maintenance 25/min). Each region SHALL host exactly one exchange with the 07 §4 elasticity parameters (`window_ticks: 600`, `step_quantity: 600000`, `step_change_permille: 20`, `recovery_permille_per_interval: 50`, `recovery_interval_ticks: 60`).

Source: REF-5, REF-7 (07 §7 B.8, B.9), GDD-20, GDD-17, CONT-6.21

#### Scenario: Maintenance is charged while enabled
- **WHEN** an idle but enabled refiner is inspected in content terms
- **THEN** its maintenance component charges the B.3 quantity per 60-tick interval

#### Scenario: Each region has one exchange
- **WHEN** the content is loaded
- **THEN** exactly two exchange definitions exist, one located in region α and one in region β, each with elasticity bounds and spread validated by CONT-6.21, and each lists the P, H, and BM goods of its own sourcing direction

#### Scenario: T1 declares typed cargo
- **WHEN** `ref.tier.transport.t1` is inspected
- **THEN** it declares two typed slots of `300000` base units and `speed_permille` `1000`
