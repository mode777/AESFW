# foundation/determinism Specification

## Purpose

The deterministic primitives that make the simulation reproducible and hashable across environments: canonical JSON encoding, FNV-1a hashing, seeded random streams, total-order sorting and string comparison, branded identifiers, and the `Result` type (TDS-7, TDS-9.4, TDS-15, TDS-19.3, TDS-19.4, TDS-23).

## Requirements

### Requirement: Canonical JSON encoding
`det.canonicalStringify` SHALL encode a value as canonical JSON: object keys sorted in code-unit order, array order preserved, no insignificant whitespace, and only safe integers, strings, booleans, `null`, arrays, and plain objects. It SHALL normalize `-0` to `0`, escape strings so the output round-trips through `JSON.parse`, and SHALL throw an `InvariantViolation` (code `non_canonical_value`) for any value outside that domain (non-integer or non-safe numbers, `undefined`, functions, symbols, `BigInt`, class instances).

Source: TDS-19.3, TDS-23

#### Scenario: Object keys are sorted in code-unit order
- **WHEN** `det.canonicalStringify({ b: 1, a: 2 })` is evaluated
- **THEN** the result is `{"a":2,"b":1}`

#### Scenario: Nested arrays keep their order and objects are sorted recursively
- **WHEN** `det.canonicalStringify({ a: [1, 2], b: { d: 4, c: 3 } })` is evaluated
- **THEN** the result is `{"a":[1,2],"b":{"c":3,"d":4}}` with no whitespace

#### Scenario: Non-integer numbers are rejected
- **WHEN** `det.canonicalStringify(1.5)` is evaluated
- **THEN** it throws an `InvariantViolation` whose code is `non_canonical_value`

#### Scenario: Values outside the canonical domain are rejected
- **WHEN** `det.canonicalStringify({ a: undefined })` or `det.canonicalStringify({ a: () => 1 })` is evaluated
- **THEN** each throws an `InvariantViolation` whose code is `non_canonical_value`

#### Scenario: Strings are escaped for round-trip
- **WHEN** `det.canonicalStringify('a"b')` is evaluated
- **THEN** the result is `"a\"b"`

#### Scenario: Negative zero is normalized
- **WHEN** `det.canonicalStringify(-0)` is evaluated
- **THEN** the result is `0`

### Requirement: FNV-1a 64 state hash
`det.fnv1a64` SHALL compute the 64-bit FNV-1a hash over the UTF-8 bytes of its string input using 32-bit limb arithmetic and SHALL return 16 lowercase hexadecimal characters. `det.hashCanonical` SHALL equal `fnv1a64(canonicalStringify(value))`. The algorithm is tagged `fnv1a64-canonical-json-v1`; changing it changes state hashes and requires a version bump.

Source: TDS-19.3, TDS-19.4

#### Scenario: Empty input hashes to the FNV-1a offset basis
- **WHEN** `det.fnv1a64('')` is evaluated
- **THEN** the result is `cbf29ce484222325`

#### Scenario: A single ASCII byte matches the FNV-1a vector
- **WHEN** `det.fnv1a64('a')` is evaluated
- **THEN** the result is `af63dc4c8601ec8c`

#### Scenario: Multi-byte input hashes over UTF-8 bytes
- **WHEN** `det.fnv1a64` is evaluated on strings containing non-ASCII code points
- **THEN** the result equals an independent `BigInt` reference over the UTF-8 byte sequence, rendered as 16 lowercase hex characters

#### Scenario: hashCanonical hashes the canonical encoding
- **WHEN** `det.hashCanonical({ a: 1 })` is evaluated
- **THEN** the result equals `det.fnv1a64('{"a":1}')`

### Requirement: Seeded random streams
`det.createStream(seed, name)` SHALL derive a `xoshiro128**` stream state from the two-word session seed and the stream name (hashed with `fnv1a32`) via `splitmix32` iterated four times; `det.xoshiro128ssNext` SHALL advance the stream and return a `uint32` value plus the next state; `det.nextInt(stream, boundExclusive)` SHALL return a value in `[0, boundExclusive)` using rejection sampling, and `boundExclusive` of `1` SHALL always return `0`. Streams SHALL be pure: the same seed and name reproduce the same sequence, distinct names produce distinct sequences, and drawing from one stream SHALL NOT change another stream's sequence. The algorithm is tagged `rng-xoshiro128ss-v1`.

Source: TDS-15

#### Scenario: The same seed and name reproduce the same sequence
- **WHEN** `det.createStream([1, 2], 'demo')` is drawn from twice in two independent evaluations
- **THEN** both sequences are identical

#### Scenario: Distinct stream names produce distinct sequences
- **WHEN** `det.createStream([1, 2], 'demo.a')` and `det.createStream([1, 2], 'demo.b')` are drawn from
- **THEN** their value sequences differ

#### Scenario: Drawing from one stream does not affect another
- **WHEN** a stream `demo.a` is advanced between two draws from `demo.b`
- **THEN** the `demo.b` values equal the values obtained without the intervening draws

#### Scenario: nextInt stays within the requested bound
- **WHEN** `det.nextInt(stream, 6)` is drawn many times
- **THEN** every value is an integer in `[0, 6)`, and a bound of `1` always yields `0`

#### Scenario: xoshiro values are unsigned 32-bit
- **WHEN** `det.xoshiro128ssNext(stream)` is evaluated
- **THEN** the value is an integer in `[0, 2^32)`

### Requirement: Ordering and stable sort
`det.compareStrings` SHALL compare two strings in UTF-16 code-unit order and return a negative number, zero, or a positive number. `det.stableSort(items, compare)` SHALL sort a copy of the input by an explicit total-order comparator and SHALL preserve the relative order of elements the comparator reports as equal.

Source: TDS-9.4

#### Scenario: compareStrings uses code-unit order
- **WHEN** `det.compareStrings('a', 'b')`, `det.compareStrings('b', 'a')`, and `det.compareStrings('Z', 'a')` are evaluated
- **THEN** the results are negative, positive, and negative respectively, and equal strings compare to zero

#### Scenario: stableSort preserves the order of equal elements
- **WHEN** `det.stableSort([{ k: 1, i: 0 }, { k: 0, i: 1 }, { k: 1, i: 2 }], by k)` is evaluated
- **THEN** the result is `[{ k: 0, i: 1 }, { k: 1, i: 0 }, { k: 1, i: 2 }]`

### Requirement: Branded identifiers
`@aesfw/core` SHALL export the branded identifier types `EntityId`, `DefinitionHandle`, `OwnerHandle`, `ReservationId`, `Tick`, and `StringId` with constructors that produce a value identical to the input at runtime, so that a plain number or string cannot be used where a specific identifier type is expected.

Source: TDS-7

#### Scenario: Branded constructors preserve the runtime value
- **WHEN** `entityId(5)`, `tick(7)`, and `stringId('test.r.a')` are evaluated
- **THEN** their runtime values are `5`, `7`, and `'test.r.a'`

### Requirement: Result type
`@aesfw/core` SHALL export `Result<T, E>` as the union of `{ ok: true; value: T }` and `{ ok: false; error: E }`, with `ok(value)` and `err(error)` helpers, so expected failures are returned as data rather than thrown (TDS-23).

Source: TDS-23

#### Scenario: ok and err build the two Result branches
- **WHEN** `ok(1)` and `err('demo_failure')` are evaluated
- **THEN** `ok(1)` is `{ ok: true, value: 1 }` and `err('demo_failure')` is `{ ok: false, error: 'demo_failure' }`

### Requirement: Determinism properties P-04 and P-05
The `det` module SHALL satisfy the property-based tests P-04 and P-05 of VER-7.1: P-04, `canonicalStringify` is invariant under object key insertion order and round-trips through `JSON.parse`; P-05, RNG streams are reproducible from seed and stream name and are independent of each other's consumption.

Source: VER-7.1

#### Scenario: P-04 canonical encoding is key-order invariant and round-trips
- **WHEN** the P-04 property test runs over generated JSON-safe values
- **THEN** reordering object keys does not change the encoding and `JSON.parse(canonicalStringify(value))` equals the value

#### Scenario: P-05 streams are reproducible and independent
- **WHEN** the P-05 property test runs over generated seeds, stream names, and draw sequences
- **THEN** each stream reproduces its sequence from the seed and name, and interleaving draws from other streams does not change it
