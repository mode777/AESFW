# Design — add-definition-composition

## Context

`add-core-definition-schemas` (1.2) is archived: `validateSchemas` produces `RawDefinitions` grouped by collection. CONT-5 fixes includes and the merge rules but leaves the syntax of the explicit `append`/`prepend`/`remove` operations open; this document records the interpretation (A-05) and the choices CONT-5 leaves open.

## Goals / Non-Goals

**Goals:** resolve same-collection includes; merge with the CONT-5 rules; support explicit list operations; detect cycles and unresolved includes; return immutable, include-free, canonically ordered resolved definitions; P-11 determinism.

**Non-Goals:** dedicated template collections and cross-collection includes; handle assignment, reference resolution, normalization, checksum, and `buildRegistry` (1.4); schema re-validation of composed results (1.4 validates references); graph and economic validation (10.1).

## Decisions

### D1 — Module layout

`packages/content/src/composition/` holds `merge.ts` (the merge algorithm and directive handling), `compose.ts` (`composeDefinitions`), and `index.ts`. `src/index.ts` re-exports the surface.

### D2 — Includes resolve within the same collection

A definition's `includes` entries name other definitions in the same collection; a dedicated template collection is out of scope for M1 and a cross-collection include is treated as `unresolved_include`. Bases are merged left to right, then the definition's own fields are merged over the accumulated base. The resolved definition drops `includes`.

### D3 — The merge algorithm

`merge(base, overlay)`:
- If `overlay` is a merge directive (D4), apply it to `base` and return the result.
- If both `base` and `overlay` are plain mappings, merge by key: for each key in `base`, keep it unless `overlay` has it; for each key in `overlay`, `merge(base[key], overlay[key])`; keys are visited in ascending code-unit order so the result's key order is canonical.
- Otherwise return `overlay` (scalars override; arrays replace).

This is associative: object merge and the directive operations are associative, so `((a ∘ b) ∘ c) == (a ∘ (b ∘ c))`, which P-11 requires.

### D4 — Merge-directive syntax (clarification A-05)

CONT-5 requires explicit `append`, `prepend`, and `remove` operations but does not give their syntax. This change defines a directive as a mapping with exactly one key among `append`, `prepend`, and `remove`, whose value is an array:
```yaml
components:
  producer:
    recipes:
      append: [test.recipe.b]
```
The directive applies to the inherited list (an absent base is an empty list). `remove` drops every entry deeply equal (by canonical JSON) to a listed entry. A mapping with more than one directive key, or a non-array directive value, reports `invalid_merge_directive`. A mapping with a single non-directive key is an ordinary mapping. Recorded as clarification **A-05** to CONT-5.

### D5 — Cycle and unresolved detection without throwing

Resolution is a depth-first walk with a `visiting` set and a memo of resolved definitions. Re-entering a definition in `visiting` reports `include_cycle`; an include with no definition reports `unresolved_include`. Both leave the definition unresolved (omitted from the output) and never throw. Each definition is resolved at most once (memoized), so the walk is linear.

### D6 — Resolved definitions are deeply frozen and never alias the input

Resolved definitions are deep-frozen with `Object.freeze` after a structural clone, so mutating them throws in strict mode (ES modules are strict) and the input is never mutated. `merge` always constructs new objects and arrays rather than mutating operands.

### D7 — Canonical output

Output collections follow `COLLECTION_ORDER`; within a collection, resolved definitions are sorted by ascending ID with `det.compareStrings`. Resolution does not depend on the order in which definitions are supplied, which gives file-order independence.

### D8 — Dependencies and versioned artifacts

No new dependency; `@aesfw/core` (`det`) is already available. No versioned algorithm, save format, protocol version, or golden hash changes.

## Amendments and clarifications to 01–07

- **A-05 (clarification, additive):** CONT-5 §5's "Merge rules" list gains the sentence: "An explicit list operation is written as a mapping with exactly one of the keys `append`, `prepend`, or `remove`, whose value is a list; it applies to the inherited list, and `remove` drops deeply equal entries." No conflict with 01–04 was found.

## Risks / Trade-offs

- [Directive syntax is an interpretation] → recorded as A-05 and confined to a mapping with exactly one reserved key, so ordinary content is unaffected.
- [Cross-collection includes are unsupported] → the M1 loop does not need them; a later row can add a template collection additively.
- [Deep freezing could surprise callers] → CONT-5 requires immutability; callers that need to edit clone first.

## Migration Plan

Additive source and test files. No state, save, protocol, or golden artifacts exist. Rollback is reverting the change.

## Open Questions

None blocking.
