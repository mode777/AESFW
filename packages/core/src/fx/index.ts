/**
 * `fx` — checked fixed-point arithmetic (TDS-6). This is the only sanctioned
 * arithmetic on authoritative values: every result is a safe integer and every
 * overflow or zero divisor is an invariant violation, never a silent
 * floating-point approximation.
 *
 * Source: TDS-6.1, TDS-6.2, TDS-6.3, TDS-6.4, TDS-23
 */
import { ArithmeticOverflow, InvariantViolation } from '../errors/invariant-violation.js';
import { allocate } from './alloc.js';
import { accumulate } from './accumulate.js';
import { evaluateCompiledCurve } from './curve.js';
import { checkSafeInt, isSafeInt, roundRational, toSafeInt } from './round.js';
import type { Int, Rounding } from './round.js';

export { allocate };
export { accumulate };
export { evaluateCompiledCurve };
export type { AllocationResult } from './alloc.js';
export type { AccumulatorResult } from './accumulate.js';
export type { CompiledCurvePoints, CurveType, CurveExtrapolation } from './curve.js';
export {
  isSafeInt,
  isNonNegativeSafeInt,
  MAX_SAFE_INT,
  MIN_SAFE_INT,
  toSafeInt,
  checkSafeInt,
  roundRational,
} from './round.js';
export type { Int, Rounding } from './round.js';

const assertInt = (value: number, operation: string, name: string): void => {
  if (!isSafeInt(value)) {
    throw new ArithmeticOverflow(operation, { operand: name, value: String(value) });
  }
};

/**
 * Checked addition of two safe integers; throws `ArithmeticOverflow` when the
 * result is not safe.
 *
 * Source: TDS-6.2
 */
export function add(a: Int, b: Int): Int {
  assertInt(a, 'add', 'a');
  assertInt(b, 'add', 'b');
  return checkSafeInt(a + b, 'add', { a, b });
}

/**
 * Checked subtraction of two safe integers; throws `ArithmeticOverflow` when
 * the result is not safe.
 *
 * Source: TDS-6.2
 */
export function sub(a: Int, b: Int): Int {
  assertInt(a, 'sub', 'a');
  assertInt(b, 'sub', 'b');
  return checkSafeInt(a - b, 'sub', { a, b });
}

/**
 * Checked multiplication of two safe integers; throws `ArithmeticOverflow`
 * when the result is not safe.
 *
 * Source: TDS-6.2
 */
export function mul(a: Int, b: Int): Int {
  assertInt(a, 'mul', 'a');
  assertInt(b, 'mul', 'b');
  return checkSafeInt(a * b, 'mul', { a, b });
}

/**
 * Exact `a × b / c` rounded by `mode` (TDS-6.2). The product is computed with
 * an exact `BigInt` intermediate so no precision is lost when it exceeds the
 * safe range. A zero divisor throws `InvariantViolation` code
 * `division_by_zero`; a non-safe rounded result throws `ArithmeticOverflow`.
 *
 * Source: TDS-6.2, TDS-23
 */
export function mulDiv(a: Int, b: Int, c: Int, mode: Rounding): Int {
  assertInt(a, 'mulDiv', 'a');
  assertInt(b, 'mulDiv', 'b');
  assertInt(c, 'mulDiv', 'c');
  if (c === 0) {
    throw new InvariantViolation('division_by_zero', { a, b, c });
  }
  if (a === 0 || b === 0) return 0;
  if (c === 1) return checkSafeInt(a * b, 'mulDiv', { a, b, c });
  const rounded = roundRational(BigInt(a) * BigInt(b), BigInt(c), mode);
  return toSafeInt(rounded, 'mulDiv', { a, b, c, mode });
}

/**
 * Exact `a / b` rounded by `mode` (TDS-6.2). A zero divisor throws
 * `InvariantViolation` code `division_by_zero`.
 *
 * Source: TDS-6.2, TDS-23
 */
export function div(a: Int, b: Int, mode: Rounding): Int {
  assertInt(a, 'div', 'a');
  assertInt(b, 'div', 'b');
  if (b === 0) {
    throw new InvariantViolation('division_by_zero', { a, b });
  }
  if (a === 0) return 0;
  const rounded = roundRational(BigInt(a), BigInt(b), mode);
  return toSafeInt(rounded, 'div', { a, b, mode });
}

/**
 * `value × permille / 1000` rounded by `mode` (TDS-6.2).
 *
 * Source: TDS-6.2
 */
export function permille(value: Int, permille: Int, mode: Rounding): Int {
  return mulDiv(value, permille, 1000, mode);
}

/** Clamps `v` into `[lo, hi]` (TDS-6.2). */
export function clamp(v: Int, lo: Int, hi: Int): Int {
  assertInt(v, 'clamp', 'v');
  assertInt(lo, 'clamp', 'lo');
  assertInt(hi, 'clamp', 'hi');
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v === 0 ? 0 : v;
}

/** Minimum of a non-empty list of safe integers; empty input is an invariant violation. */
export function min(values: readonly Int[]): Int {
  if (values.length === 0) {
    throw new InvariantViolation('empty_aggregate', { operation: 'min' });
  }
  let result = Number.POSITIVE_INFINITY;
  for (const value of values) {
    assertInt(value, 'min', 'value');
    if (value < result) result = value;
  }
  return result === 0 ? 0 : result;
}

/** Maximum of a non-empty list of safe integers; empty input is an invariant violation. */
export function max(values: readonly Int[]): Int {
  if (values.length === 0) {
    throw new InvariantViolation('empty_aggregate', { operation: 'max' });
  }
  let result = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    assertInt(value, 'max', 'value');
    if (value > result) result = value;
  }
  return result === 0 ? 0 : result;
}

/** Checked sum of safe integers; `sum([])` is `0`. */
export function sum(values: readonly Int[]): Int {
  let total = 0;
  for (const value of values) {
    total = add(total, value);
  }
  return total;
}
