# Design — add-testkit-content-builders

## Context

`add-registry-compilation` (1.4) is archived: `@aesfw/content` exposes `loadContent`, `createMemorySource`, `ContentRegistry`, and the collection catalogue. `@aesfw/testkit` already has the store-level `world()` builder and depends on `@aesfw/content`. This document records the builder choices.

## Goals / Non-Goals

**Goals:** a fluent `content()` builder that compiles through the real pipeline; a `ContentBuildResult`; query and assertion helpers; no new dependency.

**Non-Goals:** the scenario runner and CLI (1.14); goldens (1.15); benchmarks (1.16); world instantiation (1.8).

## Decisions

### D1 — Module layout

`packages/testkit/src/harness/content-builder.ts` holds `content()`, `ContentBuilder`, `ContentBuildResult`, and the query and assertion helpers. `harness/index.ts` and `src/index.ts` re-export them.

### D2 — Definitions are serialised as JSON, which is valid YAML

The builder accumulates definitions per `DefinitionCollection` and serialises them with `JSON.stringify` into a `content.yaml` file. JSON is a subset of YAML 1.2, so the strict YAML parser reads it without testkit taking a `yaml` dependency (05 §27). The package manifest is emitted as YAML text by the builder. The package id defaults to `test.content`, the version to `1.0.0`, and the type to `simulation_content`.

### D3 — Build runs the real pipeline

`build()` creates one `PackageSource` with `createMemorySource` and calls `loadContent([source], options)`. Nothing in the builder re-implements loading, parsing, validation, composition, or compilation, so a builder test exercises the same path as a host.

### D4 — Result shape

`ContentBuildResult` mirrors `ContentResult` and adds the registry and checksum for convenience. When content is `null`, registry and checksum are `null`.

### D5 — Query and assertion helpers

`definitionsOf` and `definitionById` delegate to the registry's `definitionsOf`/`handleOf`/`definitionOf`. `expectContentOk` throws an `InvariantViolation` (`content_build_failed`) carrying the diagnostic codes and count when content is `null`; `expectNoDiagnostics` throws when any diagnostic is present; `diagnosticCodes` returns the codes in order.

### D6 — Dependencies and versioned artifacts

No new dependency; `@aesfw/content` and `@aesfw/core` are already `@aesfw/testkit` dependencies. No versioned algorithm, save format, protocol version, or golden hash changes.

## Amendments and clarifications to 01–07

- None.

## Risks / Trade-offs

- [JSON-in-YAML is unusual for authors] → the builder is test infrastructure, not authoring content; hand-written packages still use YAML.
- [A single package limits multi-package tests] → multi-package loading is tested by the content rows directly; the builder targets the common single-package test.

## Migration Plan

Additive source and test files. No state, save, protocol, or golden artifacts exist. Rollback is reverting the change.

## Open Questions

None blocking.
