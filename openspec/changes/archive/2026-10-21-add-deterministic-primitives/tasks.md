# Tasks

## 1. Branded identifiers and Result (design D6, D7)

- [x] 1.1 Create `packages/core/src/ids/index.ts` with `Brand`, the six branded types of TDS-7, and their constructors per design D6. Verify: `pnpm type-check` green.
- [x] 1.2 Create `packages/core/src/result.ts` with `Result`, `ok`, and `err` (TDS-23). Verify: `pnpm type-check` green.
- [x] 1.3 Add `packages/core/src/ids/ids.test.ts` and `packages/core/src/result.test.ts` with one test per spec scenario: `[TDS-7] branded constructors preserve the runtime value`, `[TDS-23] ok and err build the two Result branches`. Verify: green under `pnpm --filter @aesfw/core test`.

## 2. Ordering (design D5)

- [x] 2.1 Create `packages/core/src/det/sort.ts` with `compareStrings` and `stableSort` per design D5. Verify: `pnpm type-check` green.
- [x] 2.2 Add `packages/core/src/det/sort.test.ts` with one test per spec scenario: `[TDS-9.4] compareStrings uses code-unit order`, `[TDS-9.4] stableSort preserves the order of equal elements`. Verify: green under `pnpm --filter @aesfw/core test`.

## 3. Canonical JSON (design D2)

- [x] 3.1 Create `packages/core/src/det/canonical.ts` with `canonicalStringify` per design D2, throwing `InvariantViolation` code `non_canonical_value` with the offending JSON path. Verify: `pnpm type-check` green.
- [x] 3.2 Add `packages/core/src/det/canonical.test.ts` with one test per spec scenario: `[TDS-19.3] object keys are sorted in code-unit order`, `[TDS-19.3] nested arrays keep their order and objects are sorted recursively`, `[TDS-19.3] non-integer numbers are rejected`, `[TDS-19.3] values outside the canonical domain are rejected`, `[TDS-19.3] strings are escaped for round-trip`, `[TDS-19.3] negative zero is normalized`. Verify: green under `pnpm --filter @aesfw/core test`.

## 4. Hashing (design D3)

- [x] 4.1 Create `packages/core/src/det/hash.ts` with the pure UTF-8 encoder, `fnv1a32`, `fnv1a64`, and `hashCanonical` per design D3, tagged `fnv1a64-canonical-json-v1` in TSDoc. Verify: `pnpm type-check` green.
- [x] 4.2 Add `packages/core/src/det/hash.test.ts` with one test per spec scenario: `[TDS-19.4] empty input hashes to the FNV-1a offset basis`, `[TDS-19.4] a single ASCII byte matches the FNV-1a vector`, `[TDS-19.4] multi-byte input hashes over UTF-8 bytes` (against an in-test `BigInt` reference), `[TDS-19.4] hashCanonical hashes the canonical encoding`. Verify: green under `pnpm --filter @aesfw/core test`.

## 5. Random streams (design D4)

- [x] 5.1 Create `packages/core/src/det/rng.ts` with `Seed`, `RngStream`, `splitmix32`, `createStream`, `xoshiro128ssNext`, and `nextInt` per design D4, tagged `rng-xoshiro128ss-v1` in TSDoc. Verify: `pnpm type-check` green.
- [x] 5.2 Add `packages/core/src/det/rng.test.ts` with one test per spec scenario: `[TDS-15] the same seed and name reproduce the same sequence`, `[TDS-15] distinct stream names produce distinct sequences`, `[TDS-15] drawing from one stream does not affect another`, `[TDS-15] nextInt stays within the requested bound`, `[TDS-15] xoshiro values are unsigned 32-bit`. Verify: green under `pnpm --filter @aesfw/core test`.

## 6. Public surface and properties (design D1, D8)

- [x] 6.1 Create `packages/core/src/det/index.ts` re-exporting the `det` surface; extend `packages/core/src/index.ts` to re-export `det`, `ids`, and `Result`/`ok`/`err`. Verify: `pnpm type-check` green; the `[TDS-4.2][TDS-4.3] core declares zero runtime dependencies` test still passes.
- [x] 6.2 Add `packages/core/src/det/det.prop.test.ts` with one test per spec scenario: `[VER-7.1] P-04 canonical encoding is key-order invariant and round-trips`, `[VER-7.1] P-05 streams are reproducible and independent`, each at `numRuns: 100` (VER-7.3). Verify: green under `pnpm --filter @aesfw/core test`.

## 7. Documentation

- [x] 7.1 Apply amendment A-03 from design.md to the TDS-15 stream-derivation sentence in `docs/05_Technical_Design_Specification.md`. Verify: the folded-seed clause is present with roadmap-0.4 provenance.
- [x] 7.2 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive). Verify: rows 0.5–0.9 dependency columns still accurate.

## 8. Final verification

- [x] 8.1 Run `pnpm verify` on a clean checkout; all green, including the new L0 tests, properties P-04/P-05, and the `@aesfw/core` coverage thresholds. `pnpm trace` is introduced by `add-traceability-tool` (0.8) and is not runnable yet — note its absence. [TDS-7, TDS-9.4, TDS-15, TDS-19.3, TDS-19.4, TDS-23, VER-7.1]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 0.4 with "✓ archived <date>" in `docs/08` and confirm row 0.5 becomes unblocked.
