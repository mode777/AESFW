# Spec Delta

## Purpose

The `PlanningDto` wire shapes and the `decodePlanning` codec (PIC-10.5, TDS-22).

## ADDED Requirements

### Requirement: Planning wire shapes
`@aesfw/protocol` SHALL define `PlanningDto`, `PlanningScopeDto`, `PlanningTierDto`, `PlanningChainDto`, and `PlanningChainStageDto` carrying the PIC-10.5 planning read model: per-resource scope entries (`scope`, optional `location_id`, floored `net_per_tick`, tier entries with `tier_id`, `per_capita_permille`, `supported`, `consuming_population`, `coverage_permille`) and chains (`resource_id`, `output_per_tick`, stages with `definition_id`, `count`, `ratio`, `output_per_tick`, `footprint`, `maintenance_per_interval`, and a capability-demand record).

Source: PIC-10.5, TDS-22

#### Scenario: The planning DTO types are exported
- **WHEN** the protocol package index is inspected
- **THEN** the five planning DTO types are exported
