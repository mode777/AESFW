# Proposal

## Why

Roadmap 08, M1 item 1.2 (`add-core-definition-schemas`, capability `content/schemas`, size L). The loader (1.1) can read raw YAML but nothing yet defines what valid content looks like. This row adds the TypeBox schemas for the definitions the basic loop needs, the stable-ID rules, and the published JSON Schema artifact. It retires R-05 (the content pipeline stalls progress) by making content authorable and machine-checkable, and is the input the composition (1.3), registry (1.4), condition compiler (1.6), and every simulation row consume. Depends on: `add-content-package-loader` (1.1) — archived 2026-10-21.

## What Changes

- Add TypeBox schemas under `packages/content/src/schemas/` for the M1 definition set of CONT-6: resource (including capability), abstract location template, recipe, entity definition with the source, producer, residence, and storage-access components, population tier, need (resource-consumption and resource-availability demands), need category, and growth policy.
- Add the stable-ID rules of CONT-4 (`isValidDefinitionId`) with the `invalid_id` diagnostic.
- Add `validateSchemas(files, options)` (TDS-20.2 step 4): map each parsed document's top-level keys to a definition collection, reject unknown collections in strict mode, validate every item against its schema, and validate every definition ID; return validated raw definitions plus diagnostics.
- Add the collection catalogue that later stages iterate: `DEFINITION_COLLECTIONS`, the collection-key ↔ definition-type mapping, and the compiled `Registry` handle space it feeds (TDS-7, used by 1.4).
- Export the schemas as JSON Schema files under `packages/content/schemas/*.json` (TDS-20.4) through a build script, and add a test that the committed files match the schemas.
- Add L1/L2 unit tests for every schema (nominal, boundary, and each rejection), the ID rules, and the JSON Schema export.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts (no goldens exist yet).

## Capabilities

### New Capabilities

- `content/schemas`: the TypeBox definition schemas for the M1 content set, the stable-ID rules, raw-document schema validation, and the published JSON Schema artifact.

### Modified Capabilities

- None. `content/package-loading` is unchanged.

## Impact

- **Packages:** `@aesfw/content` gains `src/schemas/**` (schema modules, ID rules, validation, collection catalogue) and `schemas/*.json` build artifacts plus an export script. No new runtime dependency is added.
- **Tick phases:** none. **Store kinds:** none. **Commands/events/error codes:** none.
- **Diagnostic codes:** `invalid_id`, `schema_invalid`, `unknown_definition_type`, `invalid_definition_document`.
- **Out of scope:** includes and merge operations (`add-definition-composition`, 1.3); handle assignment, reference resolution, normalization, and checksum (`add-registry-compilation`, 1.4); condition and curve compilation (`add-condition-and-curve-compiler`, 1.6); slot/area source policies and placement components (`add-slot-and-area-sources`, 3.5, and `add-placement-predicates-and-commands`, 3.3); connection, world, transport, and region schemas (`add-world-definition-and-connections`, 6.1, and `add-regions-and-distribution-rules`, 8.1); service and coverage-need schemas (`add-services-and-coverage-needs`, 7.6); transition, satisfaction-band, unlock, exchange, deficit, and module schemas (7.3, 7.2, 7.5, 9.1, 4.3, 13.1); the balance resource (`add-balance-resources-and-income`, 4.1); graph and economic validation (10.1–10.3).
- **Verification impact:** `pnpm test` gains schema, ID-rule, and JSON-Schema-export tests; the new diagnostic codes get fixtures in this change.
