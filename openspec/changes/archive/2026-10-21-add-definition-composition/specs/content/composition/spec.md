# content/composition — Spec Delta

## Purpose

Definition composition (CONT-5): resolve `includes` within a collection, merge bases in include order and then the definition's own fields under the CONT-5 merge rules, support explicit list operations, detect cycles, and produce immutable resolved definitions that are independent of file order (P-11).

## ADDED Requirements

### Requirement: Include resolution
`composeDefinitions(definitions, options)` SHALL resolve each definition's `includes` array, whose entries name other definitions in the same collection. It SHALL merge the included definitions in array order into a base and then merge the definition's own fields over that base. A resolved definition SHALL NOT carry an `includes` field.

Source: CONT-5

#### Scenario: A definition inherits a base
- **WHEN** definition `test.entity.b` includes `test.entity.a`, which carries `components.producer.process_slots: 2`, and `b` adds no conflicting field
- **THEN** the resolved `test.entity.b` has `components.producer.process_slots: 2`

#### Scenario: Own fields override included fields
- **WHEN** definition `test.entity.b` includes `test.entity.a` with `components.producer.process_slots: 2` and sets `process_slots: 3` itself
- **THEN** the resolved `test.entity.b` has `components.producer.process_slots: 3`

### Requirement: Merge rules
Composition SHALL merge scalars by overriding the base, mappings by merging recursively by key, and arrays by replacing the base array unless a merge directive says otherwise. A field absent from the overlay SHALL keep its base value.

Source: CONT-5

#### Scenario: Maps merge by key
- **WHEN** the base has `components.producer.process_slots: 2` and the overlay has `components.producer.recipes: [test.recipe.a]`
- **THEN** the resolved definition has both fields

#### Scenario: Lists replace by default
- **WHEN** the base has `components.producer.recipes: [test.recipe.a]` and the overlay has `recipes: [test.recipe.b]`
- **THEN** the resolved definition has `recipes: [test.recipe.b]`

### Requirement: Explicit list operations
A list-valued field SHALL accept a merge directive: a mapping with exactly one key among `append`, `prepend`, and `remove`, each an array, applied to the inherited list. `append` adds to the end, `prepend` adds to the front, and `remove` drops every deeply equal entry. A mapping with more than one such key, or a non-array directive value, SHALL report `invalid_merge_directive`.

Source: CONT-5

#### Scenario: Append adds to the end
- **WHEN** the base has `recipes: [test.recipe.a]` and the overlay has `recipes: { append: [test.recipe.b] }`
- **THEN** the resolved definition has `recipes: [test.recipe.a, test.recipe.b]`

#### Scenario: Prepend adds to the front
- **WHEN** the base has `recipes: [test.recipe.b]` and the overlay has `recipes: { prepend: [test.recipe.a] }`
- **THEN** the resolved definition has `recipes: [test.recipe.a, test.recipe.b]`

#### Scenario: Remove drops matching entries
- **WHEN** the base has `recipes: [test.recipe.a, test.recipe.b]` and the overlay has `recipes: { remove: [test.recipe.a] }`
- **THEN** the resolved definition has `recipes: [test.recipe.b]`

#### Scenario: An invalid directive is rejected
- **WHEN** a field carries `{ append: [test.recipe.a], remove: [test.recipe.b] }`
- **THEN** composition reports `invalid_merge_directive`

### Requirement: Include cycle detection
Composition SHALL report `include_cycle` when following `includes` revisits a definition, and SHALL leave that definition unresolved rather than recursing without bound.

Source: CONT-5

#### Scenario: A cycle is rejected
- **WHEN** `test.entity.a` includes `test.entity.b` and `test.entity.b` includes `test.entity.a`
- **THEN** composition reports `include_cycle` and does not loop forever

### Requirement: Unresolved includes
Composition SHALL report `unresolved_include` when an `includes` entry names no definition in the same collection, and SHALL leave that definition unresolved.

Source: CONT-5

#### Scenario: A missing include is reported
- **WHEN** `test.entity.a` includes `test.entity.absent`, which does not exist
- **THEN** composition reports `unresolved_include` naming `test.entity.absent`

### Requirement: Immutable resolved definitions
Composition SHALL return resolved definitions deeply frozen, grouped by collection in canonical order, and ordered by ascending ID. Mutating a resolved definition SHALL throw or have no effect, and composition SHALL NOT mutate its input.

Source: CONT-5, TDS-5.2

#### Scenario: Resolved definitions are frozen
- **WHEN** a resolved definition is mutated
- **THEN** the mutation throws or has no effect

#### Scenario: The input is not mutated
- **WHEN** composition runs over a definition set
- **THEN** the input definitions are unchanged

### Requirement: Composition determinism
Composition SHALL be associative for includes and independent of the order in which definitions are supplied (P-11). Resolved definitions SHALL be ordered by ascending ID regardless of input order.

Source: CONT-5, VER-6

#### Scenario: Resolved definitions are independent of input order
- **WHEN** the same definition set is composed in two different input orders
- **THEN** the resolved definitions are deeply equal

#### Scenario: Include composition is associative
- **WHEN** three definitions are composed with includes grouped as `(a then b) then c` versus `a then (b then c)`
- **THEN** the resolved result is deeply equal
