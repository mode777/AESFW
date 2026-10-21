# Tasks

## 1. Types and package wiring (design D1, D8, D9)

- [x] 1.1 Add the workspace dependency `@aesfw/core` to `packages/content/package.json` and run `pnpm install`. Verify: `pnpm --filter @aesfw/content type-check` green.
- [x] 1.2 Create `packages/content/src/types.ts` with `PackageType`, `LoadOptions`, `ContentResult`, `CompiledContent`, and the `PresentationRegistry` placeholder (design D8). Verify: `pnpm type-check` green.

## 2. Package source (design D2)

- [x] 2.1 Create `packages/content/src/package/source.ts` with the `PackageSource` interface and `createMemorySource` per design D2. Verify: `pnpm type-check` green.

## 3. Semantic versions (design D5)

- [x] 3.1 Create `packages/content/src/semver/semver.ts` with `parseVersion`, `compareVersions`, and `satisfies` per design D5. Verify: `pnpm type-check` green.
- [x] 3.2 Add `packages/content/src/semver/semver.test.ts` covering ordering, prerelease ordering, and each supported operator and alternative form.

## 4. Manifest schema and diagnostics (design D3, D7)

- [x] 4.1 Create `packages/content/src/diagnostics/diagnostics.ts` with the `diag` constructor and severity helpers per design D7. Verify: `pnpm type-check` green.
- [x] 4.2 Create `packages/content/src/package/manifest.ts` with the manifest types and the TypeBox `ManifestSchema` of CONT-3 per design D3. Verify: `pnpm type-check` green.

## 5. Manifest resolution (design D4)

- [x] 5.1 Create `packages/content/src/package/resolve.ts` with `resolveManifests` per design D4, emitting `missing_manifest`, `manifest_invalid`, `duplicate_package_id`, `missing_dependency`, and `dependency_version_mismatch`.
- [x] 5.2 Add `packages/content/src/package/resolve.test.ts` with one test per spec scenario: `[CONT-3] a valid manifest is parsed`, `[CONT-3] an invalid manifest reports manifest_invalid`, `[CONT-3] a source without a manifest reports missing_manifest`, `[CONT-11.1] manifests are resolved in ascending ID order`, `[CONT-11.1] duplicate package IDs are rejected`, `[CONT-13.1] a satisfied dependency range resolves`, `[CONT-11.1] a missing dependency reports missing_dependency`, `[CONT-13.1] a mismatched dependency version reports dependency_version_mismatch`, `[TDS-20.3] malformed input does not throw`, `[TDS-20.3] diagnostics carry package, file, and path`, `[CONT-11.2] options default to strict`.

## 6. Strict YAML parsing (design D6)

- [x] 6.1 Create `packages/content/src/package/parse.ts` with `parseFiles` per design D6, emitting `missing_file`, `yaml_parse_error`, `yaml_duplicate_key`, and `yaml_merge_key`.
- [x] 6.2 Add `packages/content/src/package/parse.test.ts` with one test per spec scenario: `[TDS-20.2] valid YAML files are parsed into documents`, `[TDS-20.2] a YAML syntax error reports yaml_parse_error`, `[TDS-20.2] duplicate mapping keys are rejected`, `[TDS-20.2] merge keys are rejected`, `[TDS-20.2] a declared file that is absent reports missing_file`.

## 7. Source tests and public surface (design D1, D2, D8)

- [x] 7.1 Add `packages/content/src/package/source.test.ts` with `[TDS-20.1] a source lists and reads package files` and `[TDS-20.1] reading an absent path returns null`.
- [x] 7.2 Add a `[TDS-20.1] a failed content result carries null content` test for the declared `ContentResult` type.
- [x] 7.3 Extend `packages/content/src/index.ts` to re-export the new surface and the core `Diagnostic` type. Verify: `pnpm type-check` green.

## 8. Documentation

- [x] 8.1 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive). Verify: rows 1.2–1.6 dependency columns still accurate.
- [x] 8.2 Confirm no amendment to 01–07 is required; record in design.md if one emerges. Verify: design.md "Amendments" section still says none.

## 9. Final verification

- [x] 9.1 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. [CONT-2, CONT-3, CONT-11.1, CONT-11.2, CONT-12, CONT-13.1, TDS-20.1, TDS-20.2, TDS-20.3]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 1.1 with "✓ archived <date>" in `docs/08` and confirm rows 1.2–1.6 dependency columns.
