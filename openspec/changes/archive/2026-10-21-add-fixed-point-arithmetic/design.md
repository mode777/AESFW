# Design — add-fixed-point-arithmetic

## Context

`setup-workspace` (0.1) and `add-purity-and-boundary-guardrails` (0.2) are archived: the nine packages exist, the pure packages type-check with `"types": []` under ES2022, and lint/dependency-cruiser forbid floating-point authority and forbidden ambient APIs. `@aesfw/core` currently exports only the deep-freeze helper in `src/testing.ts`. What the arithmetic must do is fixed by TDS-6; this document records only the choices TDS leaves open.

## Goals / Non-Goals

**Goals:** one implementation of authoritative arithmetic with exact overflow detection; a complete, documented rounding vocabulary; `alloc-v1` exactly as TDS-6.3 states it, including the remainder and tie-break rules; the TDS-6.4 accumulator recurrence; the P-01–P-03 properties; `@aesfw/core` stays at zero runtime dependencies.

**Non-Goals:** canonical encoding, hashing, RNG, stable sort, string comparison, branded IDs, and `Result` (`add-deterministic-primitives`, 0.4); the world-resident `AccumulatorTable` keying by `(subject, purpose, resource)` and the `World` record (`add-world-state-model`, 0.5); the command error-code catalogue (`add-session-and-command-gateway`, 2.2); expression-level division-by-zero handling that yields `0` plus a diagnostic counter (TDS-14.1, owned by `add-condition-and-curve-compiler`, 1.6); callers of `alloc-v1` in capability allocation (1.9) and throughput (5.1).

## Decisions

### D1 — Module layout and public surface

`packages/core/src/fx/` holds `index.ts` (re-exports), `round.ts` (`Rounding`, the exact rational helpers), `alloc.ts` (`allocate`), and `accumulate.ts` (`accumulate`). The error types live in `packages/core/src/errors/invariant-violation.ts`: `InvariantViolation` (base, TDS-23) and `ArithmeticOverflow`. `index.ts` re-exports all of it. `Int` is a type alias for `number` by contract; it is not branded here (branded IDs arrive with 0.4). `fx` functions are exported as a namespace-like module surface (`add`, `sub`, …), matching the TDS-6.2 names.

### D2 — Exactness strategy: Number fast path with BigInt fallback

`add`, `sub`, and `mul` operate on `number` and check `Number.isSafeInteger` on the result, throwing `ArithmeticOverflow` otherwise. Every returned value is normalized so that `-0` becomes `+0`: `-0` is a valid safe integer and compares equal to `0`, but `Object.is` and some encoders distinguish them, which is a determinism hazard for authoritative state and hashes. `mulDiv` and `div` compute the exact quotient and remainder through `BigInt` so no precision is lost when `a × b` exceeds the safe range; the only Number fast paths are the trivial ones (`a` or `b` zero returns `0`; `c === 1` returns the checked product). Exactness is preferred over a micro-optimization here; if a benchmark (VER-14) ever shows `permille` dominating, a fast path can be added behind the same contract. `div(a, b, mode)` rounds the exact rational `a / b`; `permille(value, permille, mode)` is `mulDiv(value, permille, 1000, mode)`. The `BigInt` value never leaves the module; only a safe-integer `Int` is returned, and a non-safe result throws `ArithmeticOverflow`.

### D3 — Rounding vocabulary, and `half_up` defined as ties away from zero

`floor` is `Math.floor(q)`, `ceil` is `Math.ceil(q)`, `trunc` is `Math.trunc(q)`. For `half_up`, the exact quotient is `a/b` with remainder `r` (`0 ≤ r < |b|`); the result is the truncated quotient plus one unit away from zero when `2r ≥ |b|`. This is the Java `RoundingMode.HALF_UP` semantics (ties away from zero), chosen because it is symmetric for the signed quantities the framework allows (balances, deltas) and matches the most common fixed-point convention. `floor` remains the default for pool amounts and `ceil` for durations (TDS-6.2); the default is a call-site decision, so the module always requires an explicit `mode` argument.

### D4 — Division by zero is an invariant violation, distinct from expression handling

`div`/`mulDiv` throw `InvariantViolation('division_by_zero')` when the divisor is zero. TDS-14.1's "division by zero yields 0 plus a diagnostic counter" applies to the condition evaluator, which guards the call before reaching `fx`; making `fx` itself silently return 0 would hide framework defects. The two layers therefore have different, documented behaviors.

### D5 — `alloc-v1` remainder computed exactly, ties by ascending requester index

The algorithm is implemented literally from TDS-6.3 and tagged `alloc-v1` in its TSDoc. Requests are taken in the caller's order, which the contract fixes as ascending requester (entity) ID; the function does not sort. `C × r_i` can exceed the safe range even when the final grant is safe, so the share and remainder are computed with the same BigInt fallback as D2. Remainder units are assigned by descending remainder, ties by ascending index, never raising a grant above its request. `throttle_permille` is `1000` for a zero request, else `floor(1000 × g_i / r_i)`. Changing this function changes hashes and requires an algorithm version bump (TDS-6.3, TDS-19.4).

### D6 — Accumulator recurrence and carry domain

`accumulate(baseRate, multiplierPermille, carry)` returns `{ amount, carry }` with `numerator = baseRate × multiplierPermille + carry`, `amount = floor(numerator / 1000)`, and `carry = numerator mod 1000`. The numerator is computed through the BigInt fallback (the product can exceed the safe range). The carry is kept in `[0, 1000)`: `baseRate` and `multiplierPermille` are non-negative rates by content rules, but the implementation uses mathematical modulo so a negative numerator still yields a non-negative carry. The world-resident table that keys these carries arrives with 0.5.

### D7 — Property tests live in `@aesfw/core` with `fast-check` as a devDependency

P-01–P-03 are L0 properties over `fx` (VER-4, VER-7.1). They live next to the sources as `*.prop.test.ts` and use `fast-check` added as a **devDependency** of `@aesfw/core` (zero runtime dependencies preserved). The PR budget is `numRuns: 100` (VER-7.3); the nightly extension is owned by the CI change that wires the property stage, not by this row. fast-check reads `Math.random` and `Date.now` for its default seed, so the ambient-API traps of 0.2 (design D4 there) are generalized: `Math.random` and `Date.now` join `performance.now` in discriminating by immediate caller, passing through only when the caller frame is tooling under `node_modules`. Calls from package or test source still throw, so the TDS-5.5 trap-assertion tests are unaffected.

### D8 — CI property-stage placeholder activated

`.github/workflows/ci.yml` carries a commented placeholder for the L5 property stage owned by 0.3/0.4. This change adds a root script `test:property` (`vitest run "**/*.prop.test.ts"`, so the file-name convention selects the property files) and a CI step `pnpm test:property` after the unit-test stage, in VER-15.3 order. `pnpm test` already includes the property files through the existing `src/**/*.test.ts` project glob, so the dedicated stage is a labelled, independently runnable slice rather than a second source of truth. The nightly extension (extended `numRuns`) stays owned by the change that wires nightly property runs. No new dependency or command beyond `fast-check`.

## Amendments and clarifications to 01–07

- **A-02 (clarification, additive):** TDS-6.2's rules list gains two bullets: "`half_up` rounds to the nearest integer and rounds a tie away from zero (Java `RoundingMode.HALF_UP`)." and "`fx.div`/`fx.mulDiv` throw `InvariantViolation` code `division_by_zero` on a zero divisor; the condition evaluator of Section 14.1 guards this case and yields 0 plus a diagnostic counter instead." No conflict with 01–04 was found.

## Risks / Trade-offs

- [BigInt in a hot path (permille, allocation)] → the Number fast path of D2 covers products that fit; only genuinely large intermediates take the BigInt branch. Revisit only if bench budgets (VER-14) say otherwise.
- [`half_up` semantics diverge from a reader's expectation] → resolved by D3 and amendment A-02, and pinned by the tie-away-from-zero scenario.
- [`alloc-v1` results depend on caller-supplied order] → the contract fixes ascending requester order; the function documents it and the ordering scenario pins the tie-break. Callers that group by location must order by location then entity (TDS-9.1), owned by later rows.
- [Remainder distribution could give more than `L` units when requests are exhausted] → the implementation caps each grant at its request; the P-02 property checks the invariant.

## Migration Plan

Additive source and test files inside `@aesfw/core`; no state, save, protocol, or golden artifacts exist. Rollback is reverting the change. Ordering constraint: none beyond `pnpm install` picking up the new devDependency.

## Open Questions

None blocking.
