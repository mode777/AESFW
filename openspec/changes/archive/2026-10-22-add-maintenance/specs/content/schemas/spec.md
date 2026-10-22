# Spec Delta

## Purpose

The entity `maintenance` component schema (CONT-6.8): interval, inputs, charge policy, and shortage policy.

## ADDED Requirements

### Requirement: Entity maintenance component schema
The entity `components` object SHALL accept an optional `maintenance` component with required `interval_ticks` (integer ≥ 1), required non-empty `inputs` (each `{ resource, quantity }` with integer `quantity ≥ 1`), required `charge_policy` (`while_exists`, `while_enabled`, `while_active`, or `while_processing`), and required `shortage_policy` (`deactivate_entity`, `scale`, `accumulate_debt`, `ignore`, `trigger_transition`, or `owner_deficit_policy`). The schema SHALL reject unknown fields.

Source: CONT-6.8, GDD-20.1

#### Scenario: A maintenance component validates
- **WHEN** an entity definition declares `maintenance` with `interval_ticks: 60`, one input of quantity `30000`, `charge_policy: while_enabled`, and `shortage_policy: owner_deficit_policy`
- **THEN** it validates with no diagnostics

#### Scenario: A maintenance component with an unknown field is rejected
- **WHEN** a `maintenance` component carries a field outside the schema
- **THEN** validation reports `schema_invalid`

#### Scenario: A maintenance component with an empty inputs list is rejected
- **WHEN** a `maintenance` component declares `inputs: []`
- **THEN** validation reports `schema_invalid`
