# content/schemas — Spec Delta

## MODIFIED Requirements

### Requirement: Definition collection catalogue
`@aesfw/content` SHALL publish the collection catalogue mapping each top-level document key to a core `DefinitionType` — `resources` → `resource`, `location_templates` → `location`, `recipes` → `recipe`, `entity_definitions` → `entity`, `population_tiers` → `tier`, `needs` → `need`, `need_categories` → `needCategory`, `growth_policies` → `growthPolicy`, `conditions` → `condition`, `curves` → `curve` — in canonical order, for the registry compilation of roadmap 1.4 to consume.

Source: CONT-6, CONT-7, CONT-8, TDS-7

#### Scenario: The catalogue covers the M1 collections in canonical order
- **WHEN** the catalogue is read
- **THEN** its keys are exactly the ten M1 collections, each mapping to its core definition type
