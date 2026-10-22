# Spec Delta

## MODIFIED Requirements

### Requirement: Production preconditions
Phase 07 SHALL set a producer's static block reasons in ascending entity-ID order: `entity_disabled` when disabled, `paused_by_deficit` when deficit-paused, `invalid_recipe` when the selected recipe is absent, `condition_false` when the recipe has a condition, `missing_inventory_access` when an input or output inventory is absent or when the producer carries a connectivity requirement but is not connected, and `location_inactive` when its location is inactive. A producer with any static reason SHALL be `blocked`; otherwise a previously blocked producer SHALL become `idle`.

Source: GDD-10.3, GDD-10.2

#### Scenario: A disabled producer is blocked
- **WHEN** a disabled producer is evaluated in phase 07
- **THEN** its block reasons are `['entity_disabled']` and its state is `blocked`

#### Scenario: A producer at an inactive location is blocked
- **WHEN** a producer at an inactive location is evaluated
- **THEN** its block reasons include `location_inactive`

#### Scenario: A disconnected requiring producer is blocked
- **WHEN** a producer carries a connectivity requirement and its location has no connectivity provider
- **THEN** its block reasons include `missing_inventory_access`
