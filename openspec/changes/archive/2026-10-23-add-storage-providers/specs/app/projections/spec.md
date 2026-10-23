# Spec Delta

## ADDED Requirements

### Requirement: Inventory effective capacity in projections
An inventory DTO SHALL report the effective capacity of each resource: the inventory's declared per-resource or total capacity plus the bonuses of active storage providers that target the inventory. When neither a per-resource nor a total capacity is declared, the DTO SHALL omit the capacity.

Source: PIC-9.1, GDD-8.1, GDD-9.7

#### Scenario: The DTO includes a storage-provider bonus
- **WHEN** an inventory has base per-resource capacity `1000` and an active provider adds `500`
- **THEN** the inventory DTO reports capacity `1500` for that resource

#### Scenario: An unlimited inventory omits capacity
- **WHEN** an inventory declares no total and no per-resource capacity
- **THEN** its DTO entries omit `capacity`
