import { describe, expect, it } from 'vitest';
import { div, mulDiv, permille } from './index.js';
import { MAX_SAFE_INT } from './round.js';
import type { Rounding } from './round.js';

const modes: readonly Rounding[] = ['floor', 'ceil', 'trunc', 'half_up'];

describe('[TDS-6.2] exact rational division and rounding', () => {
  it('[TDS-6.2] mulDiv is exact when the intermediate product exceeds the safe range', () => {
    expect(mulDiv(1099511627776, 1099511627776, 1099511627776, 'floor')).toBe(1099511627776);
  });

  it('[TDS-6.2] each rounding mode rounds positive and negative quotients', () => {
    const expected: Record<Rounding, readonly [number, number]> = {
      floor: [3, -4],
      ceil: [4, -3],
      trunc: [3, -3],
      half_up: [4, -4],
    };
    for (const mode of modes) {
      expect([div(7, 2, mode), div(-7, 2, mode)]).toEqual(expected[mode]);
    }
  });

  it('[TDS-6.2] half_up rounds a tie away from zero', () => {
    expect(div(5, 2, 'half_up')).toBe(3);
    expect(div(-5, 2, 'half_up')).toBe(-3);
  });

  it('[TDS-6.2] permille divides by one thousand with the chosen rounding', () => {
    expect(permille(3, 500, 'floor')).toBe(1);
    expect(permille(1, 500, 'ceil')).toBe(1);
    expect(permille(-1, 500, 'half_up')).toBe(-1);
  });

  it('[TDS-6.2][TDS-23] division by zero is an invariant violation', () => {
    expect(() => div(1, 0, 'floor')).toThrowError(/division_by_zero/);
    expect(() => mulDiv(1, 2, 0, 'floor')).toThrowError(/division_by_zero/);
  });

  it('[TDS-6.2] mulDiv overflow throws ArithmeticOverflow', () => {
    expect(() => mulDiv(MAX_SAFE_INT, 2, 1, 'floor')).toThrowError(/arithmetic_overflow/);
  });
});
