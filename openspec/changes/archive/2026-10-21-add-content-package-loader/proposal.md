# Proposal

## Why

Roadmap 08, M1 item 1.1 (`add-content-package-loader`, capability `content/package-loading`, size M). The simulation can only become data-driven once content packages can be discovered, their manifests resolved, and their YAML files read strictly and deterministically. This is the first content-pipeline stage and the foundation the schema (1.2), composition (1.3), and registry (1.4) rows build on. It retires R-05 (the content pipeline stalls progress) by delivering the loading substrate in small, tested pieces. Depends on: `add-deterministic-primitives` (0.4) — archived 2026-10-21.

## What Changes

- Add the `PackageSource` abstraction of TDS-20.1 to `@aesfw/content`: a pure, read-only view over a package directory (`packageRoot`, `list()`, `read(path)`), so the content package performs no I/O itself.
- Add the package manifest model and schema of CONT-3 (`package.yaml`): `id`, `version`, `schema_version`, `type`, `dependencies`, `files`, `migrations`.
- Add `resolveManifests(sources, options)`: parse each package's manifest, reject duplicate package IDs, and verify that every declared dependency is present and satisfies its semantic-version range (CONT-11.1, CONT-13.1).
- Add a small, dependency-free semantic-version module (parse, compare, range check) so `@aesfw/content` needs no new runtime dependency (05 §27).
- Add `parseFiles(manifests, sources, options)`: read each declared file and parse it as YAML in strict mode (no custom tags, no merge keys, duplicate-key rejection), returning raw documents keyed by package and file, with diagnostics rather than exceptions (TDS-20.2 stage 3, A7).
- Add the `LoadOptions` strictness model and the `ContentResult`/`CompiledContent` types of TDS-20.1, and re-export the core `Diagnostic` shape (A-04).
- Add L1/L2 unit tests for manifest resolution, dependency-version checks, strict YAML parsing, and every diagnostic code introduced.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts (no goldens exist yet).

## Capabilities

### New Capabilities

- `content/package-loading`: the pure `PackageSource` abstraction, the package manifest model and schema, semantic-version dependency resolution, and strict YAML file parsing with a diagnostics-based result — the entry stages of the content pipeline.

### Modified Capabilities

- None. `foundation/determinism` and the `kernel/*` capabilities are unchanged.

## Impact

- **Packages:** `@aesfw/content` gains `src/package/**` (source abstraction, manifest schema and resolution, strict YAML parsing), `src/semver/**`, `src/diagnostics/**`, and `src/result.ts` re-exports; `src/index.ts` re-exports the new surface. No new runtime dependency is added (the `yaml` and `@sinclair/typebox` dependencies already exist).
- **Tick phases:** none (content loading is a host/build-time concern, not a tick system). **Store kinds:** none. **Commands/events/error codes:** none.
- **Diagnostic codes:** `missing_manifest`, `manifest_invalid`, `duplicate_package_id`, `missing_dependency`, `dependency_version_mismatch`, `missing_file`, `yaml_parse_error`, `yaml_duplicate_key`, `yaml_merge_key`.
- **Out of scope:** the definition schemas and ID/primitive validation (`add-core-definition-schemas`, 1.2); includes and merge operations (`add-definition-composition`, 1.3); reference resolution, indexes, normalization, checksum, and `buildRegistry` (`add-registry-compilation`, 1.4); condition/curve compilation (`add-condition-and-curve-compiler`, 1.6); graph and economic validation (`add-graph-validation`, 10.1); migrations and data transforms (`add-save-migrations`, 12.1).
- **Verification impact:** `pnpm test` gains content-package-loading unit tests; the new diagnostic codes get fixtures in this change.
