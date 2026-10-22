# Spec Delta

## Purpose

Content validation for balance resources: `allow_negative` is only legal on owner- or global-scoped storage (CONT-6.3).

## ADDED Requirements

### Requirement: Balance resource scope validation
Content validation SHALL report a diagnostic when a resource sets `allow_negative: true` while its storage scope is neither `owner` nor `global`.

Source: CONT-6.3

#### Scenario: allow_negative on an inventory-scoped resource is rejected
- **WHEN** a package defines a resource with `storage.scope: inventory` and `allow_negative: true`
- **THEN** validation fails with the scope diagnostic

#### Scenario: allow_negative on an owner-scoped resource is accepted
- **WHEN** a package defines a resource with `storage.scope: owner` and `allow_negative: true`
- **THEN** validation passes
