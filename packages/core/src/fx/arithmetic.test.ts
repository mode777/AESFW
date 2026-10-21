import { describe, expect, it } from 'vitest';
import { add, clamp, max, min, mul, sub, sum } from './index.js';
import { MAX_SAFE_INT, MIN_SAFE_INT } from './round.js';

describe('[TDS-6.1][TDS-6.2] checked safe-integer arithmetic', () => {
  it('[TDS-6.1][TDS-6.2] addition and subtraction are exact for safe integers', () => {
    expect(add(2, 3)).toBe(5);
    expect(sub(2, 3)).toBe(-1);
  });

  it('[TDS-6.2] addition overflow throws ArithmeticOverflow', () => {
    expect(() => add(MAX_SAFE_INT, 1)).toThrowError(/arithmetic_overflow/);
    try {
      add(MAX_SAFE_INT, 1);
    } catch (error) {
      expect(error).toMatchObject({ code: 'arithmetic_overflow' });
    }
  });

  it('[TDS-6.2] subtraction underflow throws ArithmeticOverflow', () => {
    expect(() => sub(MIN_SAFE_INT, 1)).toThrowError(/arithmetic_overflow/);
  });

  it('[TDS-6.2] multiplication overflow throws ArithmeticOverflow', () => {
    expect(() => mul(3037000499, 3037000499)).toThrowError(/arithmetic_overflow/);
    expect(mul(1000, 1000)).toBe(1000000);
  });

  it('[TDS-6.2] clamp bounds a value', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('[TDS-6.2] min, max, and sum aggregate in a documented order', () => {
    expect(min([3, 1, 2])).toBe(1);
    expect(max([3, 1, 2])).toBe(3);
    expect(sum([3, 1, 2])).toBe(6);
    expect(sum([])).toBe(0);
  });

  it('[TDS-6.2] negative zero is normalized to zero', () => {
    const result = mul(-1, 0);
    expect(Object.is(result, -0)).toBe(false);
    expect(result).toBe(0);
  });
});
