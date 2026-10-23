# Spec Delta

## Purpose

The `deficit_policy` content definition (CONT-6.22) and entity-definition `tags` (CONT-6.8).

## ADDED Requirements

### Requirement: Deficit policy schema
The schema SHALL accept a `deficit_policy` definition with `id`, `resource`, `trigger` (an object with `operator` of `less`, `less_equal`, `greater`, `greater_equal`, or `equal` and an integer `value`), `action: pause_entities`, `order` (a non-empty array of `maintenance_desc` and/or `entity_id_asc`), `stop_when: net_rate_non_negative`, optional `exclude_tags` (an array of non-empty strings), and `resume` (`policy` of `automatic_reverse_order`, `manual`, or `disabled`, and a `when` comparison). The schema SHALL reject unknown fields.

Source: CONT-6.22, GDD-20.3

#### Scenario: A deficit policy validates
- **WHEN** a package defines a deficit policy with `trigger: { operator: less, value: 0 }`, `order: [maintenance_desc, entity_id_asc]`, and `resume.policy: automatic_reverse_order`
- **THEN** it validates with no diagnostics

#### Scenario: An unknown action is rejected
- **WHEN** a deficit policy declares `action: bankrupt`
- **THEN** validation reports `schema_invalid`

#### Scenario: An empty order list is rejected
- **WHEN** a deficit policy declares `order: []`
- **THEN** validation reports `schema_invalid`

### Requirement: Entity definition tags
The entity-definition schema SHALL accept an optional `tags` array of non-empty strings.

Source: CONT-6.8

#### Scenario: An entity definition with tags validates
- **WHEN** an entity definition declares `tags: [test.tag.hub]`
- **THEN** it validates with no diagnostics

## MODIFIED Requirements

### Requirement: Definition collection catalogue
`@aesfw/content` SHALL publish the collection catalogue mapping each top-level document key to a core `DefinitionType` — `resources` → `resource`, `location_templates` → `location`, `recipes` → `recipe`, `entity_definitions` → `entity`, `population_tiers` → `tier`, `needs` → `need`, `need_categories` → `needCategory`, `growth_policies` → `growthPolicy`, `conditions` → `condition`, `curves` → `curve`, `deficit_policies` → `deficitPolicy` — in canonical order, for the registry compilation of roadmap 1.4 to consume.

Source: CONT-6, CONT-7, CONT-8, CONT-6.22, TDS-7

#### Scenario: The catalogue covers the M1 collections in canonical order
- **WHEN** the catalogue is read
- **THEN** its keys are the ten M1 collections plus `deficit_policies`, each mapping to its core definition type
