# Design

## Context

Presentation packages (`ref.tier.presentation`) are YAML documents with top-level `presentation_mapping` entries, `localization` (locale + entries), `formatting`, and optionally `fallback` and per-mapping `controls`. They are not definition documents: `loadContent` rejects them at manifest or schema stages, so presentation validation is a separate pure function over parsed files, wired into the CLI only.

## Goals / Non-Goals

- Goals: PIC-19's six checks as a pure validator; CLI routing; the reference package passes.
- Non-Goals: a real `PresentationRegistry` (the `CompiledContent.presentation` placeholder stays until a client row needs it); asset-file resolution; simulation loader changes.

## Decisions

### D1 — Validator shape

`validatePresentationPackage(files: readonly ParsedFile[], options): readonly Diagnostic[]` with `options: { simulationIds?: ReadonlySet<string>; knownCommands?: ReadonlySet<string> }`. Missing inputs skip their checks (CONT-11.3's precedent: presentation references are optional and non-authoritative). Never throws; diagnostics name package, file, path, and mapping.

### D2 — Checks

- `presentation_modifies_simulation` (error): any top-level document key in `DEFINITION_COLLECTIONS` — a presentation package may never carry simulation definitions (PIC-6).
- `presentation_target_missing` (error): `presentation_mapping[].target_definition` not in `simulationIds` when supplied.
- `presentation_invalid_key` (error): localization entry keys or mapping keys violating the identifier rules (`isValidDefinitionId`) — dotted segments, no spaces.
- `presentation_key_missing` (warning): `name_key`/`description_key`/`model_key`/`icon_key` absent from the localization entries, when a localization document exists. Nonessential assets warn and fall back (PIC-19).
- `presentation_fallback_missing` (warning): no top-level `fallback` document anywhere in the package. The reference package gains one (`{ shape: box, locale: en }`).
- `presentation_invalid_command` (error): `controls[].command` not in `knownCommands` when supplied. The CLI does not wire a command set yet (v1 skip; 10.6 may).

### D3 — CLI routing and reference fix

`runValidate` parses each directory's `package.yaml` first: type `presentation` → presentation validator (with `--against <dir>` loading a simulation package for `simulationIds`); otherwise the existing `loadContent` path. The reference package's manifest type changes from `presentation_content` (never in the framework's `PackageType` union; it pre-dates 2.7's completion) to `presentation`, and it gains the global `fallback` document; its test asserts the validator reports no errors. This is a reference-content alignment owned here per 08 §7.4.

### D4 — Fixtures

Invalid fixtures for the six codes under `fixtures/content/invalid/` (presentation packages with `type: presentation` manifests). The catalogue cross-check gains a presentation branch: `loadContent` cannot run on them, so the test calls `validatePresentationPackage` directly (the `composition_schema_violation` precedent), passing a small simulation ID set for target checks. Severity expectations come from the catalogue (errors for modifies/target/key/command; warnings for key_missing/fallback).

## Golden-hash statement

No golden changes: presentation packages never enter world state or checksums. (06 §9.4)
