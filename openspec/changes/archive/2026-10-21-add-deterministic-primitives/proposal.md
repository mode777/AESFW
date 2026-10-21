# Proposal

## Why

Roadmap 08, M0 item 0.4 (`add-deterministic-primitives`, capability `foundation/determinism`, size M). The arithmetic contract of 0.3 makes quantities exact, but a deterministic simulation also needs canonical serialization, a stable state hash, reproducible random streams, engine-independent ordering, and branded identifiers so that a value's meaning cannot be confused across boundaries (TDS-7, TDS-9.4, TDS-15, TDS-19.3, TDS-19.4, TDS-23). Without these, the world model of 0.5 could not encode, clone, or hash state identically in Node and the browser. This row retires R-01 (determinism breaks through iteration order, hashing, and engine differences). Depends on: `add-purity-and-boundary-guardrails` (0.2) — archived 2026-10-21 (the roadmap row lists 0.2; 0.3 is also archived and unblocked this work).

## What Changes

- Add the `det` module to `@aesfw/core` (`packages/core/src/det/`):
  - **Canonical JSON** (TDS-19.3): `canonicalStringify`, which sorts object keys in code-unit order, keeps array order, accepts only safe integers, strings, booleans, `null`, arrays, and plain objects, emits no insignificant whitespace, and never relies on `JSON.stringify` for canonical structure.
  - **State hash** (TDS-19.4): `fnv1a64` over UTF-8 bytes implemented with 32-bit limbs and rendered as 16 lowercase hex characters, plus `fnv1a32` for stream derivation, and `hashCanonical` combining canonical JSON with `fnv1a64`; algorithm tag `fnv1a64-canonical-json-v1`.
  - **Random streams** (TDS-15): `xoshiro128**` (algorithm tag `rng-xoshiro128ss-v1`) as pure state-transforming functions, `splitmix32` stream derivation from a two-word seed and a stream name hashed with `fnv1a32`, and `nextInt(stream, boundExclusive)` using rejection sampling to avoid modulo bias.
  - **Ordering** (TDS-9.4): `compareStrings` (code-unit order) and `stableSort` requiring an explicit total-order comparator.
- Add branded identifiers (TDS-7): `Brand`, `EntityId`, `DefinitionHandle`, `OwnerHandle`, `ReservationId`, `Tick`, `StringId`, and their constructors, in `packages/core/src/ids/`.
- Add the `Result<T, E>` type with `ok`/`err` helpers (TDS-23) in `packages/core/src/result.ts`.
- Add property tests P-04 and P-05 (VER-7.1) and L0 unit tests with fixed FNV vectors and RNG range/bias checks.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts (no world state or goldens exist yet). The algorithm tags `fnv1a64-canonical-json-v1` and `rng-xoshiro128ss-v1` are introduced at their first version.

## Capabilities

### New Capabilities

- `foundation/determinism`: canonical JSON encoding, FNV-1a hashing, seeded random streams, total-order sorting and string comparison, branded identifiers, and the `Result` type — the deterministic primitives that make world state reproducible and hashable across environments.

### Modified Capabilities

- None. `foundation/fixed-point` and `foundation/purity` are unchanged.

## Impact

- **Packages:** `@aesfw/core` gains `src/det/**`, `src/ids/**`, and `src/result.ts`. No runtime dependency is added; `fast-check` is already a core devDependency (from 0.3).
- **Tooling/CI:** no new stage; the property files are picked up by the existing `pnpm test` and `pnpm test:property` commands.
- **Tick phases:** none. **Store kinds:** none. **Commands/events/error codes:** none. **Diagnostic codes:** none (`canonicalStringify` rejects non-canonical values with `InvariantViolation`, a defect signal, not a diagnostic).
- **Out of scope:** the `World` record, component stores, and `encodeWorld`/`decodeWorld`/`cloneWorld`/`hashWorld` (`add-world-state-model`, 0.5); the tick pipeline and `runPhases` (0.6); content checksum computation (1.4); expression evaluation (1.6); save/replay codecs (2.5).
- **Verification impact:** `pnpm test` gains L0 tests for `det`, `ids`, and `result`, plus properties P-04 and P-05.
