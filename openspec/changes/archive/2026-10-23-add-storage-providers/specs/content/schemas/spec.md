# Spec Delta

## ADDED Requirements

### Requirement: Storage provider component schema
The entity-definition schema SHALL accept an optional `storage_provider` component containing an `inventory` reference, an optional `capacity` object with non-negative integer `total` and `per_resource` bonuses, and an optional non-negative integer `throughput`. It SHALL reject unknown fields.

Source: CONT-6.8, GDD-9.7

#### Scenario: A storage provider validates
- **WHEN** an entity declares `storage_provider: { inventory: location.shared, capacity: { total: 1800000 }, throughput: 2000 }`
- **THEN** the schema accepts the definition

#### Scenario: A negative throughput is rejected
- **WHEN** an entity declares `storage_provider.throughput: -1`
- **THEN** the schema rejects the definition

#### Scenario: An unknown storage-provider field is rejected
- **WHEN** an entity declares `storage_provider: { inventory: location.shared, accepts: [] }`
- **THEN** the schema rejects the definition
