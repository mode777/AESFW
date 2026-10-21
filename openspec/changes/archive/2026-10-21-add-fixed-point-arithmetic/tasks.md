# Tasks

## 1. Error types (design D1)

- [x] 1.1 Create `packages/core/src/errors/invariant-violation.ts` with `InvariantViolation` (base class carrying `code` and `args`, extending `Error`, TDS-23) and `ArithmeticOverflow` (code `arithmetic_overflow`); re-export both from `packages/core/src/index.ts`. Verify: `pnpm type-check` green; lint accepts the error-only class (TDS-25).
- [x] 1.2 Add `packages/core/src/errors/invariant-violation.test.ts` with `[TDS-23]` unit tests: an `InvariantViolation` exposes its `code` and `args`, and an `ArithmeticOverflow` reports code `arithmetic_overflow`. Verify: `pnpm --filter @aesfw/core test` green.

## 2. Rounding and exact rational division (design D2, D3, D4)

- [x] 2.1 Create `packages/core/src/fx/round.ts` with the `Rounding` union, `Int`, the safe-integer predicate, the exact quotient/remainder helper (Number fast path, BigInt fallback), and the four rounding modes per design D3. Verify: `pnpm type-check` green.
- [x] 2.2 Create `packages/core/src/fx/index.ts` with `add`, `sub`, `mul`, `mulDiv`, `div`, `permille`, `clamp`, `min`, `max`, `sum` per design D1/D2, each carrying TSDoc naming TDS-6.1/6.2 and TDS-23. Verify: `pnpm type-check` green.
- [x] 2.3 Add `packages/core/src/fx/arithmetic.test.ts` with one test per spec scenario: `[TDS-6.1][TDS-6.2] addition and subtraction are exact for safe integers`, `[TDS-6.2] addition overflow throws ArithmeticOverflow`, `[TDS-6.2] subtraction underflow throws ArithmeticOverflow`, `[TDS-6.2] multiplication overflow throws ArithmeticOverflow`, `[TDS-6.2] clamp bounds a value`, `[TDS-6.2] min, max, and sum aggregate in a documented order`, `[TDS-6.2] negative zero is normalized to zero`. Verify: green under `pnpm --filter @aesfw/core test`.
- [x] 2.4 Add `packages/core/src/fx/rounding.test.ts` with one test per spec scenario: `[TDS-6.2] mulDiv is exact when the intermediate product exceeds the safe range`, `[TDS-6.2] each rounding mode rounds positive and negative quotients`, `[TDS-6.2] half_up rounds a tie away from zero`, `[TDS-6.2] permille divides by one thousand with the chosen rounding`, `[TDS-6.2][TDS-23] division by zero is an invariant violation`, `[TDS-6.2] mulDiv overflow throws ArithmeticOverflow`. Verify: green under `pnpm --filter @aesfw/core test`.

## 3. alloc-v1 (design D5)

- [x] 3.1 Create `packages/core/src/fx/alloc.ts` implementing `allocate(capacity, requests)` exactly per TDS-6.3 and design D5, tagged `alloc-v1` in its TSDoc, returning grants and `throttle_permille`. Verify: `pnpm type-check` green.
- [x] 3.2 Add `packages/core/src/fx/alloc.test.ts` with one test per spec scenario: `[TDS-6.3] under-capacity grants every request in full`, `[TDS-6.3] over-capacity allocates proportionally with remainder to the largest remainders`, `[TDS-6.3] equal remainders break by ascending requester order`, `[TDS-6.3] throttle permille reflects a partial grant`, `[TDS-6.3] zero request receives full throttle`, `[TDS-6.3] zero capacity grants nothing`, `[TDS-6.3] empty requests allocate nothing`. Verify: green under `pnpm --filter @aesfw/core test`.

## 4. Rate accumulators (design D6)

- [x] 4.1 Create `packages/core/src/fx/accumulate.ts` implementing `accumulate(baseRate, multiplierPermille, carry)` per TDS-6.4 and design D6. Verify: `pnpm type-check` green.
- [x] 4.2 Add `packages/core/src/fx/accumulate.test.ts` with one test per spec scenario: `[TDS-6.4] a fractional rate carries its remainder to the next tick`, `[TDS-6.4] a whole rate delivers every tick`, `[TDS-6.4] long-run total is within one unit of the exact rational total`. Verify: green under `pnpm --filter @aesfw/core test`.

## 5. Properties P-01 to P-03 (design D7, D8)

- [x] 5.1 Add `fast-check` to `packages/core` `devDependencies` at the pinned version used by `@aesfw/testkit`; run `pnpm install`. Verify: `@aesfw/core` still declares zero `dependencies`; `pnpm install` clean.
- [x] 5.2 Generalize the ambient-API traps in `tools/vitest.purity-setup.ts` so `Math.random` and `Date.now` discriminate by immediate caller (pass through for tooling under `node_modules`, throw otherwise), matching the existing `performance.now` handling, because fast-check reads them for its default seed (design D7). Verify: the `[TDS-5.5]` trap-assertion tests in `@aesfw/core`, `@aesfw/content`, `@aesfw/app`, and `@aesfw/protocol` still throw for direct calls; `pnpm test` green.
- [x] 5.3 Add `packages/core/src/fx/fx.prop.test.ts` with one test per spec scenario: `[VER-7.1] P-01 operations match the BigInt reference`, `[VER-7.1] P-02 alloc-v1 satisfies its grant contract`, `[VER-7.1] P-03 accumulators track the exact rational total`, each at `numRuns: 100` (VER-7.3). Verify: green under `pnpm --filter @aesfw/core test`.
- [x] 5.4 Activate the property-test placeholder in `.github/workflows/ci.yml` (owned by 0.3/0.4) so the L5 stage runs the property files, and note the nightly extension owner. Verify: `[VER-15.3]` CI-order test in `@aesfw/testkit` stays green.

## 6. Documentation

- [x] 6.1 Apply amendment A-02 from design.md: add the `half_up` and division-by-zero bullets to the TDS-6.2 rules list in `docs/05_Technical_Design_Specification.md`. Verify: the two bullets are present with the roadmap-0.3 provenance note.
- [x] 6.2 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes discovered during implementation; expected: none (mark the row done only at archive). Verify: roadmap rows 0.4–0.9 dependency column still accurate.

## 7. Final verification

- [x] 7.1 Run `pnpm verify` on a clean checkout; all green, including the new L0 and property tests and the `@aesfw/core` coverage thresholds (VER-15.1). `pnpm trace` is introduced by `add-traceability-tool` (0.8) and is not runnable yet — note its absence instead of substituting an ad-hoc check; no new requirement IDs beyond A-02 were claimed. [TDS-6, VER-7.1, VER-15.3]

## Workflow follow-up

- Run `/opsx-verify` on this change, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 0.3 with "✓ archived <date>" in `docs/08` and confirm rows 0.5–0.9 dependencies (0.4 depends on 0.2 and is unblocked by 0.2, not 0.3) remain accurate.
