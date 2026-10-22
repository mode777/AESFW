# Spec Delta

## Purpose

The R0 reference content seed and the presentation-package skeleton (07 §5, REF-3–6).

## ADDED Requirements

### Requirement: R0 reference content package
`reference/content/ref.tier` SHALL be a valid `simulation_content` package with the R0 seed of 07 §5: one abstract location, one population tier `ref.tier.population.s1`, two primary resources `ref.tier.resource.p1` and `ref.tier.resource.p2`, one intermediate `ref.tier.resource.h1`, one consumer `ref.tier.resource.c1`, one need category `ref.tier.need_category.b1`, and residences. It SHALL produce no error-severity diagnostic under `aesfw validate --strict`.

Source: REF-3, REF-4, REF-5, REF-6

#### Scenario: The R0 content validates strictly
- **WHEN** `aesfw validate reference/content/ref.tier --strict` runs
- **THEN** it exits `0` with no error diagnostics

#### Scenario: The R0 content defines the closed loop
- **WHEN** the content is loaded
- **THEN** it defines recipes producing `ref.tier.resource.h1` from `ref.tier.resource.p1` and `ref.tier.resource.p2`, and `ref.tier.resource.c1` from `ref.tier.resource.h1`, and a need consuming `ref.tier.resource.c1`

### Requirement: R0 closed loop runs
Running the R0 content headlessly SHALL advance the loop without an error diagnostic: the sources feed the refiner, the refiner feeds the combiner, the combiner produces `ref.tier.resource.c1`, and the residence satisfies its need.

Source: REF-5, GDD-23.1

#### Scenario: The R0 loop advances
- **WHEN** the R0 content runs for `100` ticks through the scenario runner
- **THEN** the run completes with no findings

### Requirement: Presentation skeleton
`reference/content/ref.tier.presentation` SHALL be a `presentation_content` package that depends on `ref.tier` and provides localization, mappings, and formatting files, with codes as display names (no thematic names).

Source: REF-3, REF-6, PIC-5

#### Scenario: The presentation package declares its dependency
- **WHEN** the presentation manifest is read
- **THEN** it depends on `ref.tier` and lists localization, mappings, and formatting files
