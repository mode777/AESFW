/**
 * Rate accumulators (TDS-6.4). A recurring fractional rate is delivered as a
 * whole base-unit amount per tick plus a remainder carry, so that over N ticks
 * the delivered total differs from the exact rational total by less than one
 * base unit. The carry is authoritative state; the world-resident table that
 * keys it by `(subject, purpose, resource)` arrives with the world-state model.
 *
 * Source: TDS-6.4
 */
import { InvariantViolation } from '../errors/invariant-violation.js';
import { isSafeInt, toSafeInt } from './round.js';
import type { Int } from './round.js';

/** The amount to deliver this tick and the carry to pass to the next tick. */
export interface AccumulatorResult {
  readonly amount: Int;
  readonly carry: Int;
}

const invalidInput = (field: string, value: number): never => {
  throw new InvariantViolation('invalid_accumulator_input', { field, value: String(value) });
};

/**
 * Advances one rate accumulator by one tick (TDS-6.4):
 * `numerator = baseRate × multiplierPermille + carry`,
 * `amount = floor(numerator / 1000)`, `carry = numerator mod 1000`.
 * The returned carry is always in `[0, 1000)`.
 *
 * Source: TDS-6.4
 */
export function accumulate(baseRate: Int, multiplierPermille: Int, carry: Int): AccumulatorResult {
  if (!isSafeInt(baseRate)) invalidInput('baseRate', baseRate);
  if (!isSafeInt(multiplierPermille)) invalidInput('multiplierPermille', multiplierPermille);
  if (!isSafeInt(carry) || carry < 0 || carry >= 1000) invalidInput('carry', carry);

  const thousand = 1000n;
  const numerator = BigInt(baseRate) * BigInt(multiplierPermille) + BigInt(carry);
  let amount = numerator / thousand;
  let remainder = numerator % thousand;
  if (remainder < 0n) {
    amount -= 1n;
    remainder += thousand;
  }

  return {
    amount: toSafeInt(amount, 'accumulate', { baseRate, multiplierPermille, carry }),
    carry: Number(remainder),
  };
}
