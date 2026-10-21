# Design — add-content-package-loader

## Context

`add-deterministic-primitives` (0.4) is archived: `@aesfw/core` provides canonical JSON, hashing, RNG, sorting, branded IDs, and `Result`, plus the `Diagnostic` shape (A-04). `@aesfw/content` is still an empty package stub. TDS-20 fixes the loader contract (a pure `PackageSource` plus stage functions), CONT-2/3/12 fix the package structure, manifest, and loading order, and A7 fixes YAML as the only authoring format. This document records only the choices those documents leave open.

## Goals / Non-Goals

**Goals:** a pure `PackageSource` view; the manifest model and its schema; deterministic manifest resolution with semantic-version dependency checks; strict YAML parsing with diagnostics instead of exceptions; the `LoadOptions`, `ContentResult`, and `CompiledContent` types later stages fill in; `@aesfw/content` gains only its existing runtime dependencies plus the workspace `@aesfw/core`.

**Non-Goals:** definition schemas and ID/primitive validation (1.2); includes and merge operations (1.3); reference resolution, indexes, normalization, checksum, and `buildRegistry` (1.4); condition/curve compilation (1.6); graph and economic validation (10.1); migrations and data transforms (12.1); the CLI and file-system sources (`add-scenario-runner-and-cli`, 1.14, and `host-node`).

## Decisions

### D1 — Module layout

`packages/content/src/package/` holds `source.ts` (`PackageSource`, `createMemorySource`), `manifest.ts` (manifest types and the TypeBox schema), `resolve.ts` (`resolveManifests`), and `parse.ts` (`parseFiles`). `packages/content/src/semver/semver.ts` holds the version model. `packages/content/src/diagnostics/diagnostics.ts` holds the diagnostic constructor and severity helpers. `packages/content/src/types.ts` holds `LoadOptions`, `ContentResult`, `CompiledContent`, and the package-type union. `packages/content/src/index.ts` re-exports the surface and the core `Diagnostic`.

### D2 — `PackageSource` is an interface; `createMemorySource` is a pure helper

TDS-20.1 makes the source a plain interface so hosts own I/O. `list()` returns relative paths in ascending code-unit order and `read()` returns `null` for absent paths. `createMemorySource(files)` builds a source from a plain string record for tests and fixtures; it sorts keys and is theme-free. It performs no I/O and is not authoritative state, so its use of a record as a lookup is not the forbidden "plain object as map" case of TDS-9.4.

### D3 — Manifest schema is TypeBox, validated through `@sinclair/typebox/value`

`ManifestSchema` mirrors CONT-3 with `additionalProperties: false` on every object, and `schema_version` constrained to the supported integer (`1`). Validation uses `Value.Check`/`Value.Errors` from `@sinclair/typebox/value`; each error becomes a `manifest_invalid` diagnostic whose `path` is the JSON-pointer path of the offending field. Unknown fields therefore fail the manifest in both strictness modes; `strictness` governs later stages' handling of unknown definition fields (CONT-11.2), which this change does not yet reach.

### D4 — Manifest resolution is deterministic and source-ordered

`resolveManifests(sources, options)` visits sources in the given order, reads and parses `package.yaml`, validates the schema, then sorts the successful manifests by ascending package ID for dependency checking and output. A duplicate ID is an error and only the first occurrence in source order is retained, so the outcome does not depend on which duplicate a map would keep. Dependency checks run after all manifests are known, in ascending package-ID order, and iterate each manifest's declared dependencies in declaration order.

### D5 — A dependency-free semantic-version module

CONT-13.1 needs semantic-version compatibility and 05 §27 discourages new dependencies in pure packages, so `semver.ts` implements the needed subset: `parseVersion` (`major.minor.patch` with optional `-prerelease` and `+build`), `compareVersions` (prerelease sorts below the release), and `satisfies(version, range)`. A range is `||`-separated alternatives; each alternative is a conjunction of whitespace- or comma-separated comparators with operators `=`, `>`, `>=`, `<`, `<=`, `^`, `~`, or `*`. No dependency is added. Only the subset the manifest examples and CONT-13 use is guaranteed; unsupported syntax yields a `manifest_invalid` diagnostic rather than a thrown error.

### D6 — Strict YAML parsing with a merge-key guard

`parseFiles` uses `yaml`'s `parseDocument` with `{ merge: false, uniqueKeys: true, customTags: [] }`. `uniqueKeys` makes duplicate keys surface as document errors, mapped to `yaml_duplicate_key`; any other document error (including a disallowed custom tag) becomes `yaml_parse_error`; because `merge: false` leaves `<<` as an ordinary key, a recursive walk of the parsed value reports `yaml_merge_key`. Conversion uses `doc.toJS({ maxAliasCount: 100 })`, the library default, so alias expansion is bounded. A listed file that `read()` returns `null` for reports `missing_file`. Parsed files are ordered by ascending `(package, path)`.

### D7 — Diagnostics are data; nothing throws

Both stages return `{ manifests | files, diagnostics }`; no function throws for malformed input. The `diag` constructor fills `package`, `file`, `path`, `definition`, and `args`, leaving unknown fields `null`. Severity is `'error'` for every code in this change.

### D8 — Result types are declared now, produced later

`ContentResult` (`content: CompiledContent | null`, `diagnostics`) and `CompiledContent` (`registry`, `checksum`, `packages`, `presentation`) are declared so later rows can return them without a breaking signature change. `CompiledContent.registry` is the core `Registry`; `presentation` is a `PresentationRegistry` placeholder alias refined by `add-reference-content-seed` (2.7). This change never constructs a `CompiledContent`.

### D9 — Package dependency and versioned algorithms

`@aesfw/content` adds the workspace dependency `@aesfw/core` (already permitted by TDS-4.3; not a new external runtime dependency, so no 05 §27 entry is required). No versioned algorithm, save format, protocol version, or golden hash changes.

## Amendments and clarifications to 01–07

- None. A-04 (the `Diagnostic` definition site) was recorded by `add-world-state-model` (0.5) and is reused here.

## Risks / Trade-offs

- [The semantic-version subset may be narrower than an author's range] → unsupported ranges are rejected with `manifest_invalid`, never silently mis-evaluated; the module can be widened additively when a real range needs it.
- [`Value.Errors` paths are library-shaped] → they are stable JSON-pointer-like paths; if they drift, the diagnostics are still actionable because they carry package and file.
- [`merge: false` leaves `<<` as a key] → the explicit recursive guard reports `yaml_merge_key`, so merge keys are rejected rather than silently accepted.
- [Content now depends on core] → this is the TDS-4.3 direction (content → core); core remains dependency-free and cannot import content.

## Migration Plan

Additive source, schema, and test files in `@aesfw/content`; a workspace dependency is added. No state, save, protocol, or golden artifacts exist. Rollback is reverting the change.

## Open Questions

None blocking.
