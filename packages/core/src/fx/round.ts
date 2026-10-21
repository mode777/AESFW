/**
 * Rounding vocabulary and exact rational helpers of the `fx` module
 * (TDS-6.2). Authoritative arithmetic never relies on a floating-point
 * quotient: the quotient and remainder are computed exactly, then rounded
 * according to an explicit `Rounding` mode.
 *
 * Source: TDS-6.1, TDS-6.2
 */
import { ArithmeticOverflow, InvariantViolation } from '../errors/invariant-violation.js';

/** An authoritative integer: a JavaScript `number` constrained to the safe-integer range. */
export type Int = number;

/**
 * Rounding mode for a rational result.
 *
 * - `floor`: toward negative infinity
 * - `ceil`: toward positive infinity
 * - `trunc`: toward zero
 * - `half_up`: to the nearest integer, ties away from zero (Java `RoundingMode.HALF_UP`)
 */
export type Rounding = 'floor' | 'ceil' | 'trunc' | 'half_up';

/** Largest safe integer (`2^53 - 1`). */
export const MAX_SAFE_INT = Number.MAX_SAFE_INTEGER;

/** Smallest safe integer (`-(2^53 - 1)`). */
export const MIN_SAFE_INT = Number.MIN_SAFE_INTEGER;

/** Returns true when `value` is a safe integer (TDS-6.1). */
export function isSafeInt(value: number): boolean {
  return Number.isSafeInteger(value);
}

/** Returns true when `value` is a non-negative safe integer. */
export function isNonNegativeSafeInt(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

/**
 * Converts an exact `BigInt` result to an `Int`, throwing `ArithmeticOverflow`
 * when it leaves the safe-integer range (TDS-6.2). A zero result is
 * normalized to `+0` so authoritative values are canonical (`-0` and `0` must
 * not be distinguishable in state or hashes).
 *
 * Source: TDS-6.2
 */
export function toSafeInt(
  value: bigint,
  operation: string,
  args: Readonly<Record<string, unknown>>,
): Int {
  if (value > BigInt(MAX_SAFE_INT) || value < BigInt(MIN_SAFE_INT)) {
    throw new ArithmeticOverflow(operation, { ...args, result: value.toString() });
  }
  const result = Number(value);
  return result === 0 ? 0 : result;
}

/**
 * Throws `ArithmeticOverflow` when a `number` result is not a safe integer,
 * and normalizes `-0` to `+0`.
 *
 * Source: TDS-6.2
 */
export function checkSafeInt(
  value: number,
  operation: string,
  args: Readonly<Record<string, unknown>>,
): Int {
  if (!Number.isSafeInteger(value)) {
    throw new ArithmeticOverflow(operation, { ...args, result: String(value) });
  }
  return value === 0 ? 0 : value;
}

/**
 * Rounds the exact rational `a / b` according to `mode`. The divisor must be
 * non-zero; a zero divisor is an invariant violation (design D4).
 *
 * Source: TDS-6.2, TDS-23
 */
export function roundRational(a: bigint, b: bigint, mode: Rounding): bigint {
  if (b === 0n) {
    throw new InvariantViolation('division_by_zero', { a: a.toString(), b: '0' });
  }
  if (a === 0n) return 0n;

  const quotient = a / b; // BigInt division truncates toward zero
  const remainder = a % b; // sign follows the dividend
  if (remainder === 0n) return quotient;

  const negative = a < 0n !== b < 0n;

  switch (mode) {
    case 'trunc':
      return quotient;
    case 'floor':
      return negative ? quotient - 1n : quotient;
    case 'ceil':
      return negative ? quotient : quotient + 1n;
    case 'half_up': {
      const twiceRemainder = 2n * (remainder < 0n ? -remainder : remainder);
      const divisor = b < 0n ? -b : b;
      if (twiceRemainder < divisor) return quotient;
      return negative ? quotient - 1n : quotient + 1n;
    }
    default: {
      const exhaustive: never = mode;
      throw new InvariantViolation('unknown_rounding_mode', { mode: String(exhaustive) });
    }
  }
}
