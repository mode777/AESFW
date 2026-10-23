# Spec Delta

## Purpose

The `Registry` interface gains an optional enumeration accessor so core systems can apply content-defined global policies without importing `@aesfw/content` (TDS-7).

## ADDED Requirements

### Requirement: Definition handle enumeration
The core `Registry` interface SHALL offer an optional `handlesOf(type)` accessor returning the definition handles of a type in ascending handle order, or an empty list when the type is unknown. The compiled content registry SHALL implement it.

Source: TDS-7, TDS-20.2

#### Scenario: Enumerating compiled handles is ascending
- **WHEN** a package compiles three resources
- **THEN** `handlesOf('resource')` returns their three handles in ascending order

#### Scenario: An unknown type enumerates empty
- **WHEN** `handlesOf` is called for a type with no definitions
- **THEN** it returns an empty list
