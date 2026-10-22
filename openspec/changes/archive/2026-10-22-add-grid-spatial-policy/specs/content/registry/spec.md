# Spec Delta

## MODIFIED Requirements

### Requirement: Default world plan
`defaultWorldPlan(registry)` SHALL derive a `WorldPlan` from compiled location templates with `activation.initial: true`, in ascending template-ID order, for a single default owner `0`, carrying each template's policy, its capacity (a total capacity for an abstract-capacity template, or width, height, and a fixed or seeded buildable mask for a grid template), properties, and inventories, and SHALL report diagnostics for unresolved templates or unsupported spatial parameters.

Source: CONT-6.4, CONT-6.6

#### Scenario: An initially active template becomes a location plan
- **WHEN** a template with `activation.initial: true` is compiled and `defaultWorldPlan` is evaluated
- **THEN** the plan has one location with that template's policy, capacity, properties, and inventories

#### Scenario: An initially inactive template is omitted
- **WHEN** a template with `activation.initial: false` is compiled
- **THEN** the plan has no location for it

#### Scenario: Capacity modes map to caps
- **WHEN** a template declares an inventory with `capacity.mode: total, quantity: 1000` and another with `mode: per_resource, quantity: 500`
- **THEN** the plan's first inventory has a total cap of `1000` and no per-resource cap, and the second has a per-resource cap of `500` and no total cap

#### Scenario: A missing total capacity is reported
- **WHEN** an abstract-capacity template declares no `total_capacity`
- **THEN** `defaultWorldPlan` reports `unsupported_spatial_parameter`

#### Scenario: Grid spatial parameters map to a grid plan
- **WHEN** a `framework.spatial.grid` template declares width `4`, height `4`, and `buildable_ratio` of `min: 400, max: 700`
- **THEN** the plan location carries width `4`, height `4`, and a seeded buildable ratio of `400` to `700`
