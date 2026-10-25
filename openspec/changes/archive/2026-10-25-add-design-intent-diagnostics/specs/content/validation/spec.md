# Spec Delta

## ADDED Requirements

### Requirement: Design-intent stage and promotion
The validation stage SHALL implement the CONT-11.7 design-intent checks over the composed definition set, controlled by the loader option `design_intent: 'off' | 'warning' | 'error'` (default `'off'`). When enabled, every design-intent finding SHALL have warning severity, or error severity when the option is `'error'`; error-severity findings SHALL make `loadContent` return `content: null`. When the option is `'off'`, no design-intent diagnostic SHALL be emitted.

Source: CONT-11.7

#### Scenario: Disabled by default
- **WHEN** a package is loaded without loader options
- **THEN** no design-intent diagnostic is reported

#### Scenario: Warnings when enabled
- **WHEN** a package that omits a design idea is loaded with `design_intent: 'warning'`
- **THEN** the load succeeds and the findings have warning severity

#### Scenario: Promoted findings fail the load
- **WHEN** a package that omits a design idea is loaded with `design_intent: 'error'`
- **THEN** the findings have error severity and `loadContent` returns `content: null`

### Requirement: Scarcity coverage report
When design-intent checks are enabled, validation SHALL evaluate the seven scarcities of GDD-3.2 — finite space, finite source slots, disjoint source distribution, exact workforce-class binding, throughput limit, maintenance while idle, and asymmetric decline — against the composed definitions and SHALL report `inactive_scarcities` listing every inactive scarcity when at least one is inactive. A scarcity is active when: finite space — a location template declares a finite capacity; finite source slots — a source is slot- or area-dependent or a deposit depletes; disjoint distribution — a distribution rule is declared; exact binding — a recipe declares a capability requirement and no capability declares substitutes; throughput limit — a location template declares internal logistics; maintenance while idle — a maintenance charge policy is not `while_processing`; asymmetric decline — a declared decline transition refunds nothing.

Source: CONT-11.7, GDD-3.2

#### Scenario: A package missing scarcities is reported
- **WHEN** a package with design-intent enabled declares no distribution rules and no decline transitions
- **THEN** validation reports `inactive_scarcities` naming `disjoint_distribution` and `asymmetric_decline`

#### Scenario: A package with all scarcities active is clean
- **WHEN** a package activates all seven scarcities
- **THEN** validation reports no `inactive_scarcities` finding

### Requirement: Self-sufficiency and cross-region dependency
When design-intent checks are enabled, validation SHALL report `self_sufficient_region` when a single region (or single-location world) can produce every resource any need demands, and `cross_region_absent` when every demand resource of the highest tier can be produced within one region of a multi-region world, so that no inter-region transport is forced.

Source: CONT-11.7, GDD-3.3

#### Scenario: A self-sufficient region is reported
- **WHEN** one region of a world produces every demanded resource
- **THEN** validation reports `self_sufficient_region` naming the region

#### Scenario: A cross-region-dependent top tier passes
- **WHEN** the highest tier's demanded resources originate in more than one region
- **THEN** validation reports no `cross_region_absent` finding

#### Scenario: A top tier servable from one region is reported
- **WHEN** all of the highest tier's demand resources are produced within one region
- **THEN** validation reports `cross_region_absent` naming the tier and region

### Requirement: Pyramid, breadth, and coverage intent
When design-intent checks are enabled, validation SHALL report `pyramid_bypass` when a capability declares substitutes or no recipe declares a capability requirement; `breadth_depth_collapse` when a weighted-score category has a single member or all members carry equal weight; and `coverage_absent` when no need demands spatial coverage.

Source: CONT-11.7, GDD-3.4, GDD-3.5, GDD-3.6

#### Scenario: A substitute capability is reported
- **WHEN** a capability resource lists another capability in `substitutes`
- **THEN** validation reports `pyramid_bypass` naming the resource

#### Scenario: A collapsed weighted category is reported
- **WHEN** a weighted-score category has one member or equal member weights
- **THEN** validation reports `breadth_depth_collapse` naming the category

#### Scenario: A package without coverage needs is reported
- **WHEN** no need in the package demands spatial coverage
- **THEN** validation reports `coverage_absent`

#### Scenario: Intent-bearing content is clean
- **WHEN** exact capabilities with weighted multi-member categories and a coverage need are present
- **THEN** validation reports none of these diagnostics

### Requirement: Idle cost, decline symmetry, trade bounds, and ratio legibility
When design-intent checks are enabled, validation SHALL report `idle_cost_absent` when no maintenance charge policy differs from `while_processing`; `decline_symmetric` when a decline transition refunds its advancement costs or retains the population; `unbounded_trade` when an enabled exchange good has a zero step change; and `ratio_illegible` when a production stage's entity ratio exceeds the loader's configured threshold.

Source: CONT-11.7, GDD-3.7

#### Scenario: Idle-cost-free maintenance is reported
- **WHEN** every maintenance charge policy is `while_processing`
- **THEN** validation reports `idle_cost_absent`

#### Scenario: A symmetric decline is reported
- **WHEN** a decline transition refunds the advancement costs or retains the population
- **THEN** validation reports `decline_symmetric` naming the transition

#### Scenario: An unbounded good is reported
- **WHEN** an enabled exchange good declares a zero step change
- **THEN** validation reports `unbounded_trade` naming the exchange and good

#### Scenario: An illegible ratio is reported
- **WHEN** a production stage requires more entities than the configured threshold
- **THEN** validation reports `ratio_illegible` naming the stage

#### Scenario: Asymmetric bounded content is clean
- **WHEN** idle costs, unrefunded declines, stepped prices, and legible ratios are present
- **THEN** validation reports none of these diagnostics
