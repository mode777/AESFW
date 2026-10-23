# Spec Delta

## ADDED Requirements

### Requirement: R2 cross-location content
The reference content SHALL define an R2 world with two locations connected by a bidirectional connection, a transport unit, and an order template. A resource source SHALL start at the second location while the production chain starts at the first.

Source: REF-7, REF-14.3, CONT-6.6

#### Scenario: The R2 world has two connected locations
- **WHEN** the reference content is loaded
- **THEN** `ref.tier.world.r2` has two locations and one connection from `ref.tier.loc.a` to `ref.tier.loc.b`

#### Scenario: The transport unit declares typed cargo
- **WHEN** `ref.tier.transport.basic` is inspected
- **THEN** it declares two typed slots of capacity `50000` and loading/unloading rates of `10000`
