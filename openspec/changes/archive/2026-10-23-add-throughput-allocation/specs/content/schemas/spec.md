# Spec Delta

## ADDED Requirements

### Requirement: Location internal-logistics schema
The location-template schema SHALL accept an optional `internal_logistics` object containing a `policy`, an optional non-negative integer `base_throughput`, and an optional `base_throughput_capability` definition reference, and SHALL reject unknown fields inside it.

Source: CONT-6.4

#### Scenario: A location template accepts internal logistics
- **WHEN** a location template declares `internal_logistics: { policy: framework.inventory.throughput_limited, base_throughput: 6000 }`
- **THEN** the schema accepts the template

#### Scenario: A negative base throughput is rejected
- **WHEN** a location template declares `internal_logistics.base_throughput: -1`
- **THEN** the schema rejects the template

#### Scenario: An unknown internal-logistics field is rejected
- **WHEN** a location template declares `internal_logistics: { policy: framework.inventory.throughput_limited, bonus: 1 }`
- **THEN** the schema rejects the template
