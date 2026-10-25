# Spec Delta

## MODIFIED Requirements

### Requirement: Content load orchestration
`loadContent(sources, options)` SHALL run manifest resolution, strict parsing, schema validation, composition, graph validation, registry compilation, and expression compilation in order, concatenating their diagnostics. Graph validation runs over the composed definition set before registry compilation (CONT-12). When any diagnostic has error severity, `content` SHALL be `null`; otherwise `content` SHALL carry the frozen registry, the checksum, and the package list in ascending ID order.

Source: TDS-20.1, TDS-20.2, CONT-12

#### Scenario: Valid sources compile to content
- **WHEN** a source set defines a resource, a recipe, and a producer
- **THEN** `loadContent` returns non-null content with a checksum and the package list

#### Scenario: An error yields null content
- **WHEN** a source references an absent resource
- **THEN** `loadContent` returns `content: null` and an error-severity diagnostic

#### Scenario: An invalid condition fails the load
- **WHEN** a package defines a condition with an unknown operator
- **THEN** `loadContent` returns `null` content and an error-severity diagnostic

#### Scenario: A graph error fails the load before registry compilation
- **WHEN** a package contains a resource with no source
- **THEN** `loadContent` returns `content: null` with the graph-stage diagnostic
