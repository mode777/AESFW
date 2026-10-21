# content/package-loading Specification

## Purpose

The entry stages of the content pipeline (TDS-20.2 steps 1 and 3): a pure `PackageSource` view over package directories, the package manifest of CONT-3, semantic-version dependency resolution, and strict YAML file parsing. Everything is a pure function returning diagnostics rather than throwing, so hosts and the CLI can localize and report errors (TDS-20.1, TDS-20.3).

## Requirements

### Requirement: Package source abstraction
`PackageSource` SHALL be a read-only view over one package directory with `packageRoot`, `list(): readonly string[]` returning relative paths, and `read(path): string | null` returning UTF-8 text or `null` when absent. `@aesfw/content` SHALL perform no file-system or network access itself; hosts supply sources (TDS-20.1).

Source: TDS-20.1, CONT-2

#### Scenario: A source lists and reads package files
- **WHEN** a source whose root contains `package.yaml` and `resources.yaml` is queried
- **THEN** `list()` returns those relative paths and `read('package.yaml')` returns the manifest text

#### Scenario: Reading an absent path returns null
- **WHEN** `read('absent.yaml')` is called on a source
- **THEN** it returns `null`

### Requirement: Package manifest schema
A manifest SHALL carry `package.id`, `package.version`, `package.schema_version`, `package.type` (`simulation_content`, `optional_module`, or `presentation`), optional `package.dependencies` (each with `package` and `version`), optional `package.files` (relative paths), and optional `package.migrations` (each with `from` and `file`). `resolveManifests` SHALL report `manifest_invalid` for a manifest that is not valid YAML mapping data satisfying this schema, and SHALL report `missing_manifest` for a source with no readable `package.yaml`.

Source: CONT-3, TDS-20.2

#### Scenario: A valid manifest is parsed
- **WHEN** a source provides a well-formed `package.yaml` with `id: test.game`, `version: 1.0.0`, `schema_version: 1`, and `type: simulation_content`
- **THEN** resolution yields one manifest whose fields match, with no diagnostics

#### Scenario: An invalid manifest reports manifest_invalid
- **WHEN** a `package.yaml` is missing the required `package.type` field
- **THEN** resolution reports a `manifest_invalid` diagnostic and no manifest for that source

#### Scenario: A source without a manifest reports missing_manifest
- **WHEN** a source has no `package.yaml`
- **THEN** resolution reports a `missing_manifest` diagnostic

### Requirement: Manifest resolution
`resolveManifests(sources, options)` SHALL return the resolved manifests in ascending package-ID order together with diagnostics, without throwing. When two sources declare the same package ID, it SHALL report `duplicate_package_id` and retain only the first in source order.

Source: CONT-3, CONT-11.1, CONT-12, TDS-20.2

#### Scenario: Manifests are resolved in ascending ID order
- **WHEN** two sources declare `test.b` and `test.a`
- **THEN** the resolved manifests are ordered `test.a`, `test.b`

#### Scenario: Duplicate package IDs are rejected
- **WHEN** two sources both declare package `test.a`
- **THEN** resolution reports `duplicate_package_id` and retains only the first source's manifest

### Requirement: Semantic-version dependency resolution
`resolveManifests` SHALL verify that every declared dependency names a resolved package and that its version satisfies the declared range. It SHALL report `missing_dependency` when no package with that ID is present, and `dependency_version_mismatch` when the version does not satisfy the range. A version range SHALL be a space- or comma-separated conjunction of comparators (`=`, `>`, `>=`, `<`, `<=`, `^`, `~`, or `*`), optionally combined with `||` alternatives (CONT-13.1).

Source: CONT-3, CONT-13.1, CONT-11.1

#### Scenario: A satisfied dependency range resolves
- **WHEN** package `test.game` depends on `test.core` with range `>=1.0.0 <2.0.0` and `test.core` resolves to `1.4.0`
- **THEN** resolution reports no dependency diagnostics

#### Scenario: A missing dependency reports missing_dependency
- **WHEN** package `test.game` depends on `test.absent` which is not resolved
- **THEN** resolution reports `missing_dependency` naming `test.absent`

#### Scenario: A mismatched dependency version reports dependency_version_mismatch
- **WHEN** package `test.game` depends on `test.core` with range `^2.0.0` and `test.core` resolves to `1.4.0`
- **THEN** resolution reports `dependency_version_mismatch`

### Requirement: Strict YAML parsing
`parseFiles(manifests, options)` SHALL read every file listed in a manifest and parse it as YAML in strict mode: no custom tags, no merge keys, and no duplicate mapping keys. It SHALL return parsed documents in ascending `(package, path)` order with diagnostics rather than throwing. It SHALL report `missing_file` for a listed file that cannot be read, `yaml_parse_error` for invalid YAML or a disallowed custom tag, `yaml_duplicate_key` for a duplicate mapping key, and `yaml_merge_key` for a merge key.

Source: TDS-20.2, A7, CONT-3

#### Scenario: Valid YAML files are parsed into documents
- **WHEN** a manifest lists `resources.yaml` containing a top-level `resources` sequence
- **THEN** the parsed document carries that sequence and there are no diagnostics

#### Scenario: A YAML syntax error reports yaml_parse_error
- **WHEN** a listed file contains malformed YAML
- **THEN** `parseFiles` reports `yaml_parse_error` naming the package and file

#### Scenario: Duplicate mapping keys are rejected
- **WHEN** a listed file maps the same key twice
- **THEN** `parseFiles` reports `yaml_duplicate_key`

#### Scenario: Custom tags are rejected
- **WHEN** a listed file uses a `!custom` tag
- **THEN** `parseFiles` reports `yaml_parse_error`

#### Scenario: Merge keys are rejected
- **WHEN** a listed file uses a `<<` merge key
- **THEN** `parseFiles` reports `yaml_merge_key`

#### Scenario: A declared file that is absent reports missing_file
- **WHEN** a manifest lists `resources.yaml` but the source cannot read it
- **THEN** `parseFiles` reports `missing_file`

### Requirement: Diagnostics are returned, never thrown
`resolveManifests` and `parseFiles` SHALL return every failure as a `Diagnostic` of the core shape (code, severity, package, file, path, definition, args) and SHALL NOT throw for malformed input. Error-severity diagnostics SHALL be present whenever resolution or parsing fails.

Source: TDS-20.3, TDS-23, A-04

#### Scenario: Malformed input does not throw
- **WHEN** a source provides a manifest that is valid YAML but not a mapping
- **THEN** `resolveManifests` returns diagnostics and does not throw

#### Scenario: Diagnostics carry package, file, and path
- **WHEN** a manifest field fails validation
- **THEN** the diagnostic names the package and file and carries a `path`

### Requirement: Loading options
`LoadOptions` SHALL carry a `strictness` field of `'strict'` or `'lenient'`, defaulting to `'strict'`. `resolveManifests` and `parseFiles` SHALL accept it and SHALL behave identically for the behaviors defined in this change regardless of mode; later stages consume the mode for unknown-field handling (CONT-11.2).

Source: CONT-11.2, TDS-20.1

#### Scenario: Options default to strict
- **WHEN** `resolveManifests` is called without explicit options
- **THEN** it behaves as `strictness: 'strict'`

### Requirement: Content result types
`@aesfw/content` SHALL declare the `ContentResult` and `CompiledContent` types of TDS-20.1 (`content`, `diagnostics`; `registry`, `checksum`, `packages`, `presentation`) for later pipeline stages to fill in, and SHALL re-export the core `Diagnostic` type.

Source: TDS-20.1, TDS-20.3

#### Scenario: A failed content result carries null content
- **WHEN** a `ContentResult` is constructed from a diagnostic list containing an error
- **THEN** its `content` is `null`
