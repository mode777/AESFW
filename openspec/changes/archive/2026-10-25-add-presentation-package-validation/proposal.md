# Proposal

## Why

Roadmap 08, M10 item 10.5 (`add-presentation-package-validation`), size S. Presentation packages are the presentation contract's data surface (PIC-6, PIC-19), but nothing validates them: the CLI rejects `ref.tier.presentation` outright (its manifest type predates the `presentation` union member), and no check enforces PIC-19's six rules. M11's reference prototype ships a complete presentation package, so the validator must exist and pass on it.

Dependencies on archived changes: 2.7 `add-reference-content-seed` (archived 2026-10-22). Archived.

## What Changes

- A new `@aesfw/content` presentation validator `validatePresentationPackage(files, options)` implementing PIC-19: unknown presentation collections (a disguised simulation-definition attempt) are errors; mapping `target_definition` references must resolve against the simulation package when one is supplied (`--against`); localization keys must be syntactically valid; mapping localization and visual keys must exist in the package's localization entries (missing keys warn with fallbacks, per PIC-19's last line); a global `fallback` document must exist (warns); `controls[].command` must name a known command type when a command set is supplied.
- The CLI `aesfw validate` routes packages whose manifest type is `presentation` to the presentation validator and accepts `--against <dir>` to supply the simulation package for target and key checks.
- Reference content: `ref.tier.presentation` aligns its manifest type to `presentation` and gains the global `fallback` document; its package test asserts the presentation validation passes.
- Diagnostic catalogue grows by six codes; one invalid fixture per code plus the validated reference package as the valid case.

## Capabilities

### Modified Capabilities

- `content/validation`: the presentation-package validation requirements extend the validation stage capability (PIC-19).
- `host/cli`: `aesfw validate` handles presentation packages (`--against`).

## Impact

- **Packages:** `@aesfw/content` (new `presentation/` validator, catalogue entries); `@aesfw/host-node` (CLI routing); `@aesfw-ref/content` (manifest type + fallback fix, test). No client, protocol, or kernel change.
- **Tick phases:** none. **Store kinds:** none. **Commands/events/error codes:** none new.
- **Diagnostic codes (new):** errors `presentation_modifies_simulation`, `presentation_target_missing`, `presentation_invalid_key`, `presentation_invalid_command`; warnings `presentation_key_missing`, `presentation_fallback_missing`.
- **HASH-CHANGING:** no golden changes (presentation packages never enter world state).
- **Traceability:** PIC-19 moves from untraced to traced.

## Out of Scope

- 10.6 `add-validation-report-cli` (report formats); presentation *loading* into `CompiledContent.presentation` (the placeholder shape stays; a real presentation registry is client work); asset-file existence checks (assets are client bundles, not package data).
