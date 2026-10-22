# reference/content Specification

## Purpose

The R0 reference content seed and the presentation-package skeleton (07 §5, REF-3–6).

## Requirements

### Requirement: Reference content package
`reference/content/ref.tier` SHALL be a valid `simulation_content` package at the R1 builder stage (part 1) of 07 §5: one grid location, the population tier `ref.tier.population.s1`, the primary resources `ref.tier.resource.p1` and `ref.tier.resource.p2`, the intermediate `ref.tier.resource.h1`, the consumer `ref.tier.resource.c1`, the construction resource `ref.tier.resource.bm1`, the need category `ref.tier.need_category.b1`, and residences. Every storable resource SHALL use the reference base scale `6000`. It SHALL produce no error-severity diagnostic under `aesfw validate --strict`.

Source: REF-3, REF-4, REF-5, REF-6, REF-7

#### Scenario: The reference content validates strictly
- **WHEN** `aesfw validate reference/content/ref.tier --strict` runs
- **THEN** it exits `0` with no error diagnostics

#### Scenario: The reference content defines the closed loop
- **WHEN** the content is loaded
- **THEN** it defines a recipe producing `ref.tier.resource.h1` from `ref.tier.resource.p1` and `ref.tier.resource.p2`, a recipe producing `ref.tier.resource.c1` from `ref.tier.resource.h1`, and a need consuming `ref.tier.resource.c1`

#### Scenario: Every storable resource uses the reference base scale
- **WHEN** the content is loaded
- **THEN** each of `ref.tier.resource.p1`, `ref.tier.resource.p2`, `ref.tier.resource.h1`, `ref.tier.resource.c1`, and `ref.tier.resource.bm1` declares `quantity.scale` `6000`

### Requirement: Reference chain content
The reference content SHALL define the R1 extraction and refining chain of 07 §5: a slot extractor producing `ref.tier.resource.p2`, an area extractor producing `ref.tier.resource.p1` scaled by the location suitability, a refiner producing `ref.tier.resource.h1` from `ref.tier.resource.p1` and `ref.tier.resource.p2`, and a connector providing the location connectivity network. Running the content headlessly SHALL complete without an error diagnostic.

Source: REF-5, REF-7, GDD-9.5, GDD-9.11

#### Scenario: The reference content runs
- **WHEN** the reference content runs for `100` ticks through the scenario runner
- **THEN** the run completes with no findings

### Requirement: Presentation skeleton
`reference/content/ref.tier.presentation` SHALL be a `presentation_content` package that depends on `ref.tier` and provides localization, mappings, and formatting files, with codes as display names (no thematic names). Its formatting SHALL declare the reference base scale `6000` and a `1000` ms tick duration, and its localization SHALL carry entries for the R1 location, resources, and entity definitions.

Source: REF-3, REF-6, PIC-5

#### Scenario: The presentation package declares its dependency
- **WHEN** the presentation manifest is read
- **THEN** it depends on `ref.tier` and lists localization, mappings, and formatting files

#### Scenario: The presentation formatting uses the reference base scale
- **WHEN** the presentation formatting is read
- **THEN** `base_scale` is `6000` and `tick_duration_ms` is `1000`

### Requirement: R1 grid location template
The reference content SHALL define one grid location template `ref.tier.location.a` on `framework.spatial.grid` with width `40`, height `40`, a buildable ratio of `400` to `700` permille, the suitability property `ref.tier.property.suitability_p1` set to `1000` permille, a source slot of type `ref.tier.slot.v_a` with count `2`, one shared inventory, and `activation.initial: true`.

Source: REF-5, REF-7, CONT-6.4, GDD-6.1

#### Scenario: The grid location declares its geometry
- **WHEN** the content is loaded
- **THEN** `ref.tier.location.a` uses `framework.spatial.grid` with width `40` and height `40` and a buildable ratio of `400` to `700`

#### Scenario: The grid location declares a suitability property and a source slot
- **WHEN** the content is loaded
- **THEN** `ref.tier.location.a` carries `ref.tier.property.suitability_p1` `1000` and one `ref.tier.slot.v_a` slot with count `2`

### Requirement: R1 construction resource BM1
The reference content SHALL define the construction resource `ref.tier.resource.bm1` as a storable, transportable resource with quantity precision `fixed`, scale `6000`, normal inventory storage, and the tag `ref.tier.role.construction`.

Source: REF-5, REF-7, CONT-6.1

#### Scenario: BM1 is a construction resource
- **WHEN** the content is loaded
- **THEN** `ref.tier.resource.bm1` is storable and transportable, has `quantity.scale` `6000`, and carries the tag `ref.tier.role.construction`

### Requirement: R1 slot extractor definition
The reference content SHALL define the entity `ref.tier.entity.slot_extractor_p2` with a `resource_source` of policy `slot_dependent` and `depletion: none` producing `ref.tier.resource.p2` at `400` per tick, a `placement` of footprint `[3, 3]` requiring the source slot `ref.tier.slot.v_a`, and a `connectivity` requirement on `ref.tier.connectivity.hub_network`.

Source: REF-5, REF-7, GDD-9.5, CONT-6.8

#### Scenario: The slot extractor declares a slot-dependent source
- **WHEN** the content is loaded
- **THEN** `ref.tier.entity.slot_extractor_p2` has a `resource_source` with policy `slot_dependent`, output `ref.tier.resource.p2` at `400` per tick, and `placement.requires_slot` `ref.tier.slot.v_a`

### Requirement: R1 area extractor definition
The reference content SHALL define the entity `ref.tier.entity.area_extractor_p1` with a `resource_source` of policy `area_dependent` producing `ref.tier.resource.p1` at `400` per tick and `scale_by_property` `ref.tier.property.suitability_p1`, a `placement` of footprint `[3, 3]` with a working area of `12` cells marked exclusive, and a `connectivity` requirement on `ref.tier.connectivity.hub_network`.

Source: REF-5, REF-7, GDD-6.5, GDD-9.5, CONT-6.8

#### Scenario: The area extractor declares a property-scaled source
- **WHEN** the content is loaded
- **THEN** `ref.tier.entity.area_extractor_p1` has a `resource_source` with policy `area_dependent`, `scale_by_property` `ref.tier.property.suitability_p1`, and a working area of `12` exclusive cells

### Requirement: R1 refiner definition
The reference content SHALL define the entity `ref.tier.entity.refiner` with a `producer` selecting `ref.tier.recipe.refine`, a `placement` of footprint `[3, 3]`, and a `connectivity` requirement on `ref.tier.connectivity.hub_network`. `ref.tier.recipe.refine` SHALL be a batch recipe of `30` ticks consuming `6000` `ref.tier.resource.p1` and `6000` `ref.tier.resource.p2` and producing `6000` `ref.tier.resource.h1`, requiring `1` `ref.tier.capability.s1`.

Source: REF-5, REF-7, CONT-6.7, CONT-6.8

#### Scenario: The refiner declares the refining recipe
- **WHEN** the content is loaded
- **THEN** `ref.tier.entity.refiner` selects `ref.tier.recipe.refine`, which consumes `6000` `ref.tier.resource.p1` and `6000` `ref.tier.resource.p2` and produces `6000` `ref.tier.resource.h1` over `30` ticks

### Requirement: R1 connector definition
The reference content SHALL define the entity `ref.tier.entity.connector` with a `placement` of footprint `[1, 1]` and a `connectivity` provider node on `ref.tier.connectivity.hub_network`, and no producer, residence, or resource source.

Source: REF-5, REF-7, GDD-9.11, CONT-6.8

#### Scenario: The connector provides the hub network
- **WHEN** the content is loaded
- **THEN** `ref.tier.entity.connector` carries a `connectivity` component with `provides` `ref.tier.connectivity.hub_network` and no producer component
