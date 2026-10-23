# Spec Delta

## ADDED Requirements

### Requirement: R1 storage module
The reference content SHALL declare a storage-module entity with a `storage_provider` component that adds `1800000` total capacity and `2000` throughput per tick, plus maintenance, placement, and connectivity, and the reference location SHALL declare a base throughput of `6000` per tick.

Source: REF-12.2, GDD-9.7, REF-4

#### Scenario: The storage module validates
- **WHEN** the reference content package is validated strictly
- **THEN** it reports no diagnostics

#### Scenario: The storage module expands the reference location
- **WHEN** the storage module is active at the reference location
- **THEN** the location's effective capacity increases by `1800000` and its throughput capacity by `2000`
