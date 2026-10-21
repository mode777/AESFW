# Proposal

## Why

Roadmap 08, M0 item 0.3 (`add-fixed-point-arithmetic`, capability `foundation/fixed-point`, size M). Determinism is the framework's first design property, and it rests on one rule: every authoritative number is a checked safe integer, never a floating-point value (TDS-6). Nothing in the kernel may do arithmetic until that rule has a single implementation with an exact-overflow contract, an explicit rounding vocabulary, a versioned proportional-allocation algorithm, and rate accumulators that keep long-run totals exact. This row retires R-01 (determinism breaks in JavaScript through floating point and overflow) at its root, before any world state or system exists. Depends on: `add-purity-and-boundary-guardrails` (0.2) — archived 2026-10-21.

## What Changes

- Add the `fx` module to `@aesfw/core` (`packages/core/src/fx/`), the only sanctioned arithmetic on authoritative values (TDS-6.2): `add`, `sub`, `mul`, `mulDiv`, `div`, `permille`, `clamp`, `min`, `max`, `sum`, all safe-integer checked, with `mulDiv`/`div` using an exact (BigInt) intermediate so no product can silently lose precision.
- Add the `Rounding` vocabulary (`floor`, `ceil`, `trunc`, `half_up`) with documented semantics for positive and negative operands; `floor` is the default for pool amounts, `ceil` for durations, and every other choice is named at the call site (TDS-6.2).
- Add the core error types: `InvariantViolation` (the defect-signalling base class of TDS-23) and `ArithmeticOverflow`, thrown when a result leaves the safe-integer range, plus a `division_by_zero` invariant for `div`/`mulDiv`.
- Add `alloc-v1`, the versioned proportional-allocation algorithm (TDS-6.3): grants sum to `min(C, R)`, each grant never exceeds its request, remainder units go to the largest remainders with ties broken by ascending requester order, and each requester gets a `throttle_permille`.
- Add the rate-accumulator primitive (TDS-6.4): given a per-tick base rate, a permille multiplier, and a carried remainder, return the whole amount to deliver this tick and the new carry, so N ticks deliver the exact rational total to within one base unit.
- Add property tests P-01, P-02, P-03 (VER-7.1) with fast-check, plus L0 unit tests covering boundaries, every rounding mode, and every overflow/division error. This activates the property-test CI stage placeholders left by 0.1 (VER-15.3).
- No **BREAKING** changes; no **HASH-CHANGING** artifacts (no world state, save format, or goldens exist yet). `alloc-v1` and the rounding vocabulary are introduced at their first version; no existing algorithm changes.

## Capabilities

### New Capabilities

- `foundation/fixed-point`: the checked integer arithmetic, rounding modes, versioned proportional allocation (`alloc-v1`), and rate accumulators that every authoritative quantity computation goes through — observable as pure functions with exact overflow, ordering, and long-run-total contracts.

### Modified Capabilities

- None. `foundation/purity` and `foundation/workspace` requirements are unchanged; this change adds behavior inside the existing package boundaries.

## Impact

- **Packages:** `@aesfw/core` gains `src/fx/**` and `src/errors/invariant-violation.ts`. No runtime dependency is added (05 §27 satisfied — `@aesfw/core` stays at zero); `fast-check` is added as a **devDependency** for the L0 property tests.
- **Tooling/CI:** the property-test stage placeholder in `.github/workflows/ci.yml` (owned by 0.3/0.4) is activated; `pnpm test` continues to cover every project.
- **Tick phases:** none (no system module yet). **Store kinds:** none. **Commands/events/error codes:** none (error codes of TDS-16.3 are command-rejection codes and arrive with the gateway; `ArithmeticOverflow` and `division_by_zero` are `InvariantViolation` codes, not command codes). **Diagnostic codes:** none.
- **Out of scope:** `add-deterministic-primitives` (0.4) owns canonical encoding, hashing, RNG, stable sort, string comparison, branded IDs, and `Result`; `add-world-state-model` (0.5) owns the `AccumulatorTable` keying; `add-inventory-transactions` (1.7), `add-capability-allocation` (1.9), and `add-throughput-allocation` (5.1) own the callers of `alloc-v1` and the accumulator table; expression-level division-by-zero handling (TDS-14.1) belongs to `add-condition-and-curve-compiler` (1.6).
- **Verification impact:** `pnpm test` gains L0 arithmetic tests and property tests P-01–P-03; coverage thresholds for `@aesfw/core` (VER-15.1) now apply to `fx` and the error module.
