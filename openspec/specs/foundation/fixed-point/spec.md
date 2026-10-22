# foundation/fixed-point Specification

## Purpose

The checked integer arithmetic that every authoritative quantity computation in the framework goes through: safe-integer operations with exact overflow detection, a rounding vocabulary, the versioned proportional-allocation algorithm `alloc-v1`, and rate accumulators that keep long-run totals exact. It is the single numeric contract that makes determinism possible in JavaScript (TDS-6).

## Requirements

### Requirement: Checked safe-integer arithmetic
`fx.add`, `fx.sub`, `fx.mul`, `fx.clamp`, `fx.min`, `fx.max`, and `fx.sum` SHALL compute exact results for safe-integer operands and SHALL throw `ArithmeticOverflow` (an `InvariantViolation` with code `arithmetic_overflow`) whenever a result is not a safe integer. `fx.clamp(v, lo, hi)` SHALL return `lo` when `v < lo`, `hi` when `v > hi`, and `v` otherwise. `fx.sum([])` SHALL return `0`, and `fx.min`/`fx.max` SHALL throw `InvariantViolation` on an empty input.

Source: TDS-6.1, TDS-6.2, TDS-23

#### Scenario: Addition and subtraction are exact for safe integers
- **WHEN** `fx.add(2, 3)` and `fx.sub(2, 3)` are evaluated
- **THEN** the results are `5` and `-1`

#### Scenario: Addition overflow throws ArithmeticOverflow
- **WHEN** `fx.add(9007199254740991, 1)` is evaluated
- **THEN** it throws an `InvariantViolation` whose code is `arithmetic_overflow`

#### Scenario: Subtraction underflow throws ArithmeticOverflow
- **WHEN** `fx.sub(-9007199254740991, 1)` is evaluated
- **THEN** it throws an `InvariantViolation` whose code is `arithmetic_overflow`

#### Scenario: Multiplication overflow throws ArithmeticOverflow
- **WHEN** `fx.mul(3037000499, 3037000499)` is evaluated
- **THEN** it throws an `InvariantViolation` whose code is `arithmetic_overflow`, while `fx.mul(1000, 1000)` returns `1000000`

#### Scenario: clamp bounds a value
- **WHEN** `fx.clamp(5, 0, 10)`, `fx.clamp(-1, 0, 10)`, and `fx.clamp(11, 0, 10)` are evaluated
- **THEN** the results are `5`, `0`, and `10`

#### Scenario: min, max, and sum aggregate in a documented order
- **WHEN** `fx.min([3, 1, 2])`, `fx.max([3, 1, 2])`, and `fx.sum([3, 1, 2])` are evaluated
- **THEN** the results are `1`, `3`, and `6`, and `fx.sum([])` is `0`

#### Scenario: Negative zero is normalized to zero
- **WHEN** `fx.mul(-1, 0)` is evaluated
- **THEN** the result is `+0`, so `Object.is(result, -0)` is `false`

### Requirement: Exact rational division and rounding
`fx.mulDiv(a, b, c, mode)`, `fx.div(a, b, mode)`, and `fx.permille(value, permille, mode)` SHALL round the exact rational result according to `mode`, where `floor` rounds toward negative infinity, `ceil` toward positive infinity, `trunc` toward zero, and `half_up` to the nearest integer with ties away from zero. They SHALL compute the intermediate product exactly (no floating-point product), SHALL throw `ArithmeticOverflow` when the rounded result is not a safe integer, and SHALL throw an `InvariantViolation` with code `division_by_zero` when a divisor is zero.

Source: TDS-6.1, TDS-6.2, TDS-23

#### Scenario: mulDiv is exact when the intermediate product exceeds the safe range
- **WHEN** `fx.mulDiv(1099511627776, 1099511627776, 1099511627776, 'floor')` is evaluated
- **THEN** the result is `1099511627776`

#### Scenario: Each rounding mode rounds positive and negative quotients
- **WHEN** `fx.div(7, 2, mode)` and `fx.div(-7, 2, mode)` are evaluated for each mode
- **THEN** the results are `3` and `-4` for `floor`, `4` and `-3` for `ceil`, `3` and `-3` for `trunc`, and `4` and `-4` for `half_up`

#### Scenario: half_up rounds a tie away from zero
- **WHEN** `fx.div(5, 2, 'half_up')` and `fx.div(-5, 2, 'half_up')` are evaluated
- **THEN** the results are `3` and `-3`

#### Scenario: permille divides by one thousand with the chosen rounding
- **WHEN** `fx.permille(3, 500, 'floor')`, `fx.permille(1, 500, 'ceil')`, and `fx.permille(-1, 500, 'half_up')` are evaluated
- **THEN** the results are `1`, `1`, and `-1`

#### Scenario: Division by zero is an invariant violation
- **WHEN** `fx.div(1, 0, 'floor')` or `fx.mulDiv(1, 2, 0, 'floor')` is evaluated
- **THEN** it throws an `InvariantViolation` whose code is `division_by_zero`

#### Scenario: mulDiv overflow throws ArithmeticOverflow
- **WHEN** `fx.mulDiv(9007199254740991, 2, 1, 'floor')` is evaluated
- **THEN** it throws an `InvariantViolation` whose code is `arithmetic_overflow`

### Requirement: alloc-v1 proportional allocation
`fx.allocate(capacity, requests)` SHALL implement algorithm `alloc-v1` (TDS-6.3) with the requests taken in ascending requester order: when the sum of requests `R` is at most `capacity C`, every grant equals its request; otherwise each grant is the floor of the exact proportional share `C × request / R` and the remaining `C − Σgrants` units are given one each to the requesters with the largest exact remainders, ties broken by ascending requester order, never exceeding a request. It SHALL return a grant and a `throttle_permille` per requester, where `throttle_permille` is `1000` when the request is zero and `floor(1000 × grant / request)` otherwise. Grants SHALL sum to `min(C, R)` and no grant SHALL exceed its request. `alloc-v1` is a versioned algorithm; changing it changes state hashes.

Source: TDS-6.3

#### Scenario: Under-capacity grants every request in full
- **WHEN** `fx.allocate(10, [2, 3, 4])` is evaluated
- **THEN** the grants are `[2, 3, 4]`, their sum is `9`, and every `throttle_permille` is `1000`

#### Scenario: Over-capacity allocates proportionally with remainder to the largest remainders
- **WHEN** `fx.allocate(10, [6, 4, 1])` is evaluated
- **THEN** the grants are `[5, 4, 1]` and their sum is `10`

#### Scenario: Equal remainders break by ascending requester order
- **WHEN** `fx.allocate(5, [3, 3, 3])` is evaluated
- **THEN** the grants are `[2, 2, 1]`

#### Scenario: Throttle permille reflects a partial grant
- **WHEN** `fx.allocate(5, [3, 3, 3])` is evaluated
- **THEN** the throttle values are `[666, 666, 333]`

#### Scenario: Zero request receives full throttle
- **WHEN** `fx.allocate(3, [0, 3])` is evaluated
- **THEN** the grants are `[0, 3]` and the throttle values are `[1000, 1000]`

#### Scenario: Zero capacity grants nothing
- **WHEN** `fx.allocate(0, [3, 3])` is evaluated
- **THEN** the grants are `[0, 0]` and the throttle values are `[0, 0]`

#### Scenario: Empty requests allocate nothing
- **WHEN** `fx.allocate(5, [])` is evaluated
- **THEN** the grants and throttle values are both empty

### Requirement: Rate accumulators
`fx.accumulate(baseRate, multiplierPermille, carry)` SHALL return the whole base-unit amount to deliver in the current tick and the carry for the next tick by the TDS-6.4 recurrence: `numerator = baseRate × multiplierPermille + carry`, `amount = floor(numerator / 1000)`, `carry = numerator mod 1000`. The returned carry SHALL satisfy `0 ≤ carry < 1000`. Over any number of ticks, the accumulated amount SHALL differ from the exact rational total by less than one base unit.

Source: TDS-6.4

#### Scenario: A fractional rate carries its remainder to the next tick
- **WHEN** `fx.accumulate(1, 500, 0)` is evaluated and then `fx.accumulate(1, 500, 500)` is evaluated
- **THEN** the first result is amount `0` with carry `500` and the second is amount `1` with carry `0`

#### Scenario: A whole rate delivers every tick
- **WHEN** `fx.accumulate(1, 1000, 0)` is evaluated
- **THEN** the amount is `1` and the carry is `0`

#### Scenario: Long-run total is within one unit of the exact rational total
- **WHEN** `fx.accumulate(1, 7, carry)` is iterated `999` times
- **THEN** the delivered total is `6`, which is within one base unit of the exact rational total `6.993`

### Requirement: Arithmetic properties P-01 to P-03
The `fx` module SHALL satisfy the property-based tests P-01, P-02, and P-03 of VER-7.1: P-01, every operation matches a `BigInt` reference implementation or throws `ArithmeticOverflow` exactly when the reference result is outside the safe range; P-02, `alloc-v1` grants sum to `min(C, R)`, each grant is at most its request, the result is independent of input order once requests are ordered by requester, and it is deterministic; P-03, rate accumulators deliver totals within one base unit of the exact rational total over any number of ticks.

Source: VER-7.1

#### Scenario: P-01 operations match the BigInt reference
- **WHEN** the P-01 property test runs over generated safe integers near the boundaries
- **THEN** every `fx` result equals the `BigInt` reference result, and an overflow is thrown exactly when the reference result is outside the safe range

#### Scenario: P-02 alloc-v1 satisfies its grant contract
- **WHEN** the P-02 property test runs over generated capacities and request vectors
- **THEN** the grants sum to `min(C, R)`, no grant exceeds its request, and repeated evaluation is deterministic

#### Scenario: P-03 accumulators track the exact rational total
- **WHEN** the P-03 property test runs over generated rates, multipliers, and tick counts
- **THEN** the accumulated total is within one base unit of the exact rational total

### Requirement: Curve evaluation
The fixed-point module SHALL evaluate a compiled curve — `constant`, `piecewise_linear`, `step`, or `lookup` over sorted integer points, with `clamp`, `linear`, or `error` extrapolation — at an integer input, returning an integer. Piecewise-linear interpolation SHALL floor through `fx.mulDiv`; evaluation SHALL be pure and identical for identical inputs. Under the `error` policy an out-of-domain input SHALL clamp to the boundary value.

Source: CONT-8, TDS-14.4

#### Scenario: Piecewise-linear interpolation floors
- **WHEN** a piecewise-linear curve over points `(0, 0)` and `(3, 1000)` is evaluated at `1`
- **THEN** the result is `333`

#### Scenario: Step curves hold the left point
- **WHEN** a step curve over points `(0, 100)` and `(10, 500)` is evaluated at `10`
- **THEN** the result is `500`, and at `9` the result is `100`

#### Scenario: Clamp extrapolation holds the boundary
- **WHEN** a piecewise-linear curve over points `(0, 0)` and `(3, 1000)` is evaluated at `-5` and at `9`
- **THEN** the results are `0` and `1000`

#### Scenario: Linear extrapolation extends the last segment
- **WHEN** a curve with `linear` extrapolation over points `(0, 0)` and `(3, 1000)` is evaluated at `6`
- **THEN** the result is `2000`
