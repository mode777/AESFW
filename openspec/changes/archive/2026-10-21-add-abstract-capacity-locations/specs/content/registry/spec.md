# Spec Delta

## ADDED Requirements

### Requirement: Default world plan
`defaultWorldPlan(registry)` SHALL derive a `WorldPlan` from compiled location templates with `activation.initial: true`, in ascending template-ID order, for a single default owner `0`, carrying each template's policy, total capacity, properties, and inventories, and SHALL report diagnostics for unresolved templates or an unsupported `total_capacity`.

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
