# Design — add-deterministic-primitives

## Context

`add-fixed-point-arithmetic` (0.3, archived) established `fx` and the `InvariantViolation`/`ArithmeticOverflow` error types. Nothing yet serializes, hashes, sorts, or randomizes. What these primitives must do is fixed by TDS-7, TDS-9.4, TDS-15, TDS-19.3, TDS-19.4, and TDS-23; this document records only the choices TDS leaves open.

## Goals / Non-Goals

**Goals:** one canonical encoding; one hash implementation with published vectors; one RNG with reproducible, independent streams; one ordering primitive; branded IDs; `Result`; properties P-04 and P-05; `@aesfw/core` stays at zero runtime dependencies.

**Non-Goals:** `World`, component stores, `encodeWorld`/`decodeWorld`/`cloneWorld`/`hashWorld` (0.5); tick pipeline (0.6); content checksum (1.4); expression evaluation (1.6); save/replay codecs (2.5); world generation (M3+).

## Decisions

### D1 — Module layout

`packages/core/src/det/` holds `canonical.ts` (`canonicalStringify`), `hash.ts` (`fnv1a32`, `fnv1a64`, `hashCanonical`, `utf8Bytes`), `rng.ts` (`Seed`, `RngStream`, `splitmix32`, `fnv1a32`-based `createStream`, `xoshiro128ssNext`, `nextInt`), `sort.ts` (`compareStrings`, `stableSort`), and `index.ts` re-exporting the `det` surface. `packages/core/src/ids/index.ts` holds the branded identifiers. `packages/core/src/result.ts` holds `Result`, `ok`, `err`. `src/index.ts` re-exports all three under `det`, `ids`, and a top-level `Result`.

### D2 — Canonical JSON: manual structure, `JSON.stringify` only for string scalars

`canonicalStringify` builds the output by recursion: `null`, booleans, and integers are emitted directly (with `-0` normalized to `0`), strings through `JSON.stringify(string)` (which emits exactly the required escapes and nothing else), arrays as `[...]` in order, and objects as `{...}` with keys sorted by `compareStrings` and each key emitted with `JSON.stringify`. Every other value — non-integer or non-safe numbers, `undefined`, functions, symbols, `BigInt`, class instances, `Map`, `Set` — throws `InvariantViolation('non_canonical_value', { path })`, carrying the JSON path of the offending value for diagnostics. `JSON.stringify` is never used on a composite value, so key order and whitespace are fully framework-controlled (TDS-19.3). The canonical domain is exactly the plain-data domain of TDS-8.2, so `encodeWorld` output is canonical by construction.

### D3 — FNV-1a 64 with 32-bit limbs and a pure UTF-8 encoder

`utf8Bytes(text)` encodes a JavaScript string to UTF-8 bytes without `TextEncoder` (forbidden ambient API and unavailable in pure packages), handling surrogate pairs and replacing lone surrogates with U+FFFD, matching the WHATWG encoding algorithm. `fnv1a64(text)` folds the bytes with the FNV-1a 64 offset basis `0xcbf29ce484222325` and prime `0x100000001b3`, representing the 64-bit state as two 32-bit limbs and multiplying limb-wise with `Math.imul`, then renders 16 lowercase hex characters. `fnv1a32(text)` is the same fold at 32 bits (offset `0x811c9dc5`, prime `0x01000193`). `hashCanonical(value)` is `fnv1a64(canonicalStringify(value))`. The published vectors (`'' → cbf29ce484222325`, `'a' → af63dc4c8601ec8c`) pin the implementation; the algorithm tag `fnv1a64-canonical-json-v1` is recorded with the hash (TDS-19.4).

### D4 — RNG: xoshiro128\*\* with an explicit splitmix32 derivation (`rng-xoshiro128ss-v1`)

TDS-15 fixes the algorithm and the `splitmix32(seed ⊕ fnv1a32(streamName))` derivation but leaves the seed folding and the iteration exact. This change pins them as v1: `base = (seed[0] ⊕ seed[1] ⊕ fnv1a32(name)) >>> 0`; four consecutive `splitmix32` outputs starting at `base` become the four state words `s0..s3`; if all four are zero the state is set to the splitmix32 outputs of `base + 1` (xoshiro requires a non-zero state). `xoshiro128ssNext` is the reference `xoshiro128**` step using `Math.imul`, `>>> 0`, and a 7-bit rotate-left, returning `{ value, stream }` with `value` a `uint32`. `nextInt(stream, boundExclusive)` computes `bound` as the largest multiple of `boundExclusive` at or below `2^32`, draws until `value < bound`, and returns `value % boundExclusive`, eliminating modulo bias (TDS-15). Streams are immutable values; every draw returns a new stream, so streams are independent and reproducible. Changing this derivation changes hashes and requires a version bump.

### D5 — Ordering: code-unit comparison and a stable sort over a copy

`compareStrings` returns `-1`, `0`, or `1` by code-unit comparison (`a < b`, `a > b`), never locale-aware. `stableSort(items, compare)` copies the input and sorts it with the explicit comparator. ECMAScript `Array.prototype.sort` is specified to be stable, and the caller's total-order comparator makes the result deterministic across engines; the copy keeps the input untouched. The comparator-less form is rejected by lint (0.2), so the total-order contract is also a build-time rule.

### D6 — Branded identifiers as zero-cost intersections

`Brand<T, B extends string>` is `T & { readonly __brand: B }` (TDS-7). The constructors (`entityId`, `definitionHandle`, `ownerHandle`, `reservationId`, `tick`, `stringId`) are identity casts that document intent and produce a value identical to the input at runtime. Validation of ranges (for example `EntityId ≥ 1`) belongs to the allocators of 0.5, not to the brand. `Tick` and `EntityId` are numeric brands; `StringId` is a string brand.

### D7 — Result helpers

`Result<T, E>` is the union of TDS-23; `ok(value)` and `err(error)` build the two branches. No methods and no class: expected failures stay plain data.

### D8 — Properties in `@aesfw/core` with a recursive JSON-safe generator

P-04 and P-05 live in `packages/core/src/det/det.prop.test.ts` and use the `fast-check` devDependency added by 0.3. The JSON-safe arbitrary is built with `fc.letrec` so leaf numbers are safe integers (the canonical domain), with bounded depth and object sizes; P-04 also re-inserts object keys in reverse order to prove order invariance. The PR budget is `numRuns: 100` (VER-7.3).

## Amendments and clarifications to 01–07

- **A-03 (clarification, additive):** TDS-15's stream-derivation sentence gains a subordinate clause: "with the two seed words folded as `seed[0] ⊕ seed[1]` and the four state words taken as four consecutive `splitmix32` outputs starting from that value (the v1 derivation)." No conflict with 01–04 was found.

## Risks / Trade-offs

- [A wrong UTF-8 or limb implementation silently changes hashes] → the published FNV vectors and a `BigInt` reference test pin both ASCII and multi-byte inputs; goldens from M1 onward add a second net.
- [The pinned v1 derivation may not be the "expected" one] → it is documented in D4 and amendment A-03; it is the definition of `rng-xoshiro128ss-v1` until a reviewed version bump.
- [`JSON.stringify` used on string scalars] → TDS-19.3 forbids it for canonical *output* structure; using it for a single string's escaping is exact and keeps the escape rules correct. Composite structure is framework-controlled (D2).
- [Sort stability assumed from the engine] → ECMAScript guarantees stable sort; the copy and the required total-order comparator remove the remaining variability.

## Migration Plan

Additive source and test files inside `@aesfw/core`; no state, save, protocol, or golden artifacts exist. Rollback is reverting the change.

## Open Questions

None blocking. The exact v1 RNG derivation is a recorded decision, not an open question.
