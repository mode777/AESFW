# content/registry Specification

## Purpose

Registry compilation (TDS-20.2 steps 6–12): resolve references, assign dense handles per definition type in ascending ID order, build indexes, normalize to a canonical representation, compute a checksum, and return a frozen `Registry`. `loadContent` orchestrates the implemented stages and returns a `ContentResult` (TDS-20.1).

## Requirements

### Requirement: Handle assignment
`buildRegistry` SHALL assign dense handles per core `DefinitionType`, starting at `0` and increasing in ascending code-unit order of the string ID, for every type present in the composed definitions. `stringIdOf(type, handle)` SHALL return the string ID for a known handle and `null` otherwise; `handleOf(type, id)` SHALL return the handle for a known ID and `null` otherwise. Handles SHALL NOT depend on file or package order.

Source: TDS-7, TDS-20.2

#### Scenario: Handles are dense and ascending by ID
- **WHEN** resources `test.resource.b` and `test.resource.a` are compiled
- **THEN** `handleOf('resource', 'test.resource.a')` is `0` and `handleOf('resource', 'test.resource.b')` is `1`

#### Scenario: Unknown lookups return null
- **WHEN** `stringIdOf('resource', 99)` and `handleOf('resource', 'test.resource.absent')` are evaluated
- **THEN** both return `null`

#### Scenario: Handles are independent of input order
- **WHEN** the same definitions are compiled in two different input orders
- **THEN** every handle is identical

### Requirement: Reference resolution
`resolveReferences` SHALL resolve each M1 reference kind to its expected definition type and report `unresolved_reference` when the ID is absent everywhere and `reference_type_mismatch` when the ID exists under a different type. It SHALL report `invalid_reference_scope` when a `capability_requirements` entry references a resource not tagged `capability`. Framework policy references (`spatial_policy`, `access_policy`) and local inventory references SHALL NOT be resolved.

Source: CONT-11.3

#### Scenario: A resolvable reference is accepted
- **WHEN** a recipe input references an existing resource
- **THEN** resolution reports no reference diagnostics

#### Scenario: An absent reference is reported
- **WHEN** a recipe input references `test.resource.absent`
- **THEN** resolution reports `unresolved_reference` naming `test.resource.absent`

#### Scenario: A wrong-type reference is reported
- **WHEN** a producer's `recipes` entry names a resource instead of a recipe
- **THEN** resolution reports `reference_type_mismatch`

#### Scenario: A capability requirement must be a capability
- **WHEN** a recipe's `capability_requirements` references a resource without the `capability` tag
- **THEN** resolution reports `invalid_reference_scope`

### Requirement: Indexes
`buildRegistry` SHALL build an index from definition ID to its compiled definition and a resource tag index mapping each tag to the resources that carry it. The compiled definition SHALL expose its `id`, `handle`, `type`, and canonical data.

Source: TDS-20.2

#### Scenario: The ID index finds a compiled definition
- **WHEN** a resource is compiled
- **THEN** the ID index returns its compiled definition with the assigned handle

#### Scenario: The tag index groups resources by tag
- **WHEN** two resources carry `storable` and one carries `capability`
- **THEN** the tag index maps `storable` to the two resources and `capability` to the one

### Requirement: Normalization and checksum
`normalize` SHALL produce a canonical representation of the compiled definitions with keys in sorted order and definitions ordered by type and ascending ID. `checksum` SHALL be `fnv1a64(canonicalStringify(normalize(...)))` and SHALL be independent of file order (P-12).

Source: TDS-19.3, TDS-20.2

#### Scenario: The checksum is independent of file order
- **WHEN** the same definitions are compiled from differently ordered files
- **THEN** both checksums are equal

#### Scenario: The checksum changes with definition data
- **WHEN** a resource's `transportable` flag changes
- **THEN** the checksum changes

### Requirement: Frozen registry
The registry SHALL implement the core `Registry` interface and SHALL be deeply frozen, as SHALL its compiled definitions. Mutating the registry or a compiled definition SHALL throw or have no effect.

Source: TDS-7, CONT-5

#### Scenario: The registry is frozen
- **WHEN** a compiled definition's `data` is mutated
- **THEN** the mutation throws or has no effect

### Requirement: Content load orchestration
`loadContent(sources, options)` SHALL run manifest resolution, strict parsing, schema validation, composition, registry compilation, and expression compilation in order, concatenating their diagnostics. When any diagnostic has error severity, `content` SHALL be `null`; otherwise `content` SHALL carry the frozen registry, the checksum, and the package list in ascending ID order.

Source: TDS-20.1, TDS-20.2

#### Scenario: Valid sources compile to content
- **WHEN** a source set defines a resource, a recipe, and a producer
- **THEN** `loadContent` returns non-null content with a checksum and the package list

#### Scenario: An error yields null content
- **WHEN** a source references an absent resource
- **THEN** `loadContent` returns `content: null` and an error-severity diagnostic

#### Scenario: An invalid condition fails the load
- **WHEN** a package defines a condition with an unknown operator
- **THEN** `loadContent` returns `null` content and an error-severity diagnostic

### Requirement: Default world plan
`defaultWorldPlan(registry)` SHALL derive a `WorldPlan` from compiled location templates with `activation.initial: true`, in ascending template-ID order, for a single default owner `0`, carrying each template's policy, total capacity, properties, and inventories, and SHALL report diagnostics for unresolved templates or an unsupported `total_capacity`.

Source: CONT-6.4, CONT-6.6

#### Scenario: An initially active template becomes a location plan
- **WHEN** a template with `activation.initial: true` is compiled and `defaultWorldPlan` is evaluated
- **THEN** the plan has one location with that template's policy, capacity, properties, and inventories

#### Scenario: An initially inactive template is omitted
- **WHEN** a template with `activation.initial: false` is compiled
- **THEN** the plan has no location for it

#### Scenario: Capacity modes map to caps
- **WHEN** a template declares an inventory with `capacity.mode: total, quantity: 1000` and another with `mode: per_resource, quantity: 500`
- **THEN** the plan's first inventory has a total cap of `1000` and no per-resource cap, and the second has a per-resource cap of `500` and no total cap

#### Scenario: A missing total capacity is reported
- **WHEN** an abstract-capacity template declares no `total_capacity`
- **THEN** `defaultWorldPlan` reports `unsupported_spatial_parameter`
