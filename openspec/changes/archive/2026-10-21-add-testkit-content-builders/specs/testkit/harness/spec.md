# testkit/harness — Spec Delta

## Purpose

The shared test harness of the framework: a store-level world builder, the `checkInvariants` framework over the M0 subset of the invariant catalogue, and the double-run, clone-run, and save-continue determinism harnesses that every later system and scenario test uses (VER-5.2, VER-6, VER-8.1). This delta adds the content builder and its query and assertion helpers.

## ADDED Requirements

### Requirement: Content builder
`content()` SHALL return a fluent builder that accumulates definitions per definition collection, sets the package id and version, and compiles them through `loadContent` from an in-memory `PackageSource`. `build()` SHALL return a `ContentBuildResult` carrying the compiled content (or `null`), the registry (or `null`), the checksum (or `null`), and the diagnostics. The builder SHALL NOT bypass the real content pipeline.

Source: VER-5.2

#### Scenario: The builder compiles definitions through the pipeline
- **WHEN** `content().define('resources', resource).define('recipes', recipe).build()` is evaluated
- **THEN** the result has non-null content, a registry containing the resource, and a checksum

#### Scenario: The builder surfaces pipeline diagnostics
- **WHEN** a defined recipe references an absent resource
- **THEN** the result has `null` content and an error-severity diagnostic

### Requirement: Content query helpers
`definitionsOf(registry, type)` SHALL return the compiled definitions of a type, and `definitionById(registry, type, id)` SHALL return the compiled definition for an id or `null`.

Source: VER-5.2

#### Scenario: A definition is found by id
- **WHEN** `definitionById` is called for a resource defined through the builder
- **THEN** it returns the compiled definition with that id

#### Scenario: An absent definition returns null
- **WHEN** `definitionById` is called for an unknown id
- **THEN** it returns `null`

### Requirement: Content assertion helpers
`expectContentOk(result)` SHALL return the compiled content and throw an `InvariantViolation` carrying the diagnostics when content is `null`. `expectNoDiagnostics(result)` SHALL throw when the result has any diagnostic. `diagnosticCodes(result)` SHALL return the diagnostic codes in order.

Source: VER-5.2

#### Scenario: A successful build passes the assertion
- **WHEN** `expectContentOk` is called on a successful build
- **THEN** it returns the compiled content

#### Scenario: A failed build throws
- **WHEN** `expectContentOk` is called on a build whose content is `null`
- **THEN** it throws an `InvariantViolation`

#### Scenario: Diagnostics are summarised as codes
- **WHEN** `diagnosticCodes` is called on a result with diagnostics
- **THEN** it returns their codes in order
