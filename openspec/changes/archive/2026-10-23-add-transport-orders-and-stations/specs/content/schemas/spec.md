# Spec Delta

## ADDED Requirements

### Requirement: Transport-order template schema
The transport-order template schema SHALL accept `id`, `mode` of `route`, `explore`, `establish`, or `trade`, optional `failure_policies` with keys `origin_unavailable`, `destination_unavailable`, `path_unavailable`, `cargo_cannot_unload`, `exchange_limit_not_met`, and `establishment_target_occupied`, each a policy of `skip`, `wait`, `retry`, `return`, `fail`, or `retain`, and optional `scheduling` with `repeat` and `retry_interval_ticks` ≥ 1. It SHALL reject unknown fields and unknown policies.

Source: CONT-9, GDD-15.7

#### Scenario: A route template validates
- **WHEN** a template declares `mode: route`, `path_unavailable: retry`, `cargo_cannot_unload: retain`, `repeat: true`, and `retry_interval_ticks: 20`
- **THEN** it validates with no diagnostics

#### Scenario: An unknown failure policy is rejected
- **WHEN** a template declares `path_unavailable: teleport`
- **THEN** validation reports `schema_invalid`
