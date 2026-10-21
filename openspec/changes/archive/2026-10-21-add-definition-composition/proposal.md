# Proposal

## Why

Roadmap 08, M1 item 1.3 (`add-definition-composition`, capability `content/composition`, size S). Authors need to express shared content once and specialise it, and the registry compilation (1.4) needs fully resolved, immutable definitions. This row implements the include-and-merge model of CONT-5 and retires R-05 by keeping authoring DRY without inheritance. Depends on: `add-core-definition-schemas` (1.2) — archived 2026-10-21.

## What Changes

- Add `composeDefinitions(definitions, options)` to `@aesfw/content`: resolve each definition's `includes` within its collection, merge bases in include order, then merge the definition's own fields over them.
- Implement the CONT-5 merge rules: scalars override, maps merge by key, lists replace by default, and explicit `append`, `prepend`, and `remove` operations are supported through a documented merge directive.
- Detect include cycles (`include_cycle`) and unresolved includes (`unresolved_include`), and report invalid merge directives (`invalid_merge_directive`), without throwing.
- Return resolved definitions that carry no `includes` and are deeply frozen (CONT-5: resolved definitions are immutable), ordered by ascending ID per collection.
- Add unit tests for each merge rule, each diagnostic, immutability, and a property test for P-11 (include associativity and file-order independence).
- Record clarification A-05 to CONT-5 for the merge-directive syntax the document leaves open.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts (no goldens exist yet).

## Capabilities

### New Capabilities

- `content/composition`: definition includes, the merge rules, explicit list operations, cycle detection, and immutable resolved definitions.

### Modified Capabilities

- None. `content/schemas` and `content/package-loading` are unchanged.

## Impact

- **Packages:** `@aesfw/content` gains `src/composition/**`; `src/index.ts` re-exports it. No new runtime dependency is added.
- **Tick phases:** none. **Store kinds:** none. **Commands/events/error codes:** none.
- **Diagnostic codes:** `unresolved_include`, `include_cycle`, `invalid_merge_directive`.
- **Out of scope:** handle assignment, reference resolution, normalization, checksum, and `buildRegistry` (`add-registry-compilation`, 1.4); dedicated template collections and cross-collection includes (not required by the M1 loop); reference and graph validation (10.1); migration transforms (`add-save-migrations`, 12.1).
- **Verification impact:** `pnpm test` gains composition unit and property tests; the new diagnostic codes get fixtures in this change.

## Documentation impact

- Clarification A-05 to CONT-5 §5 specifies the merge-directive syntax (see design.md).
