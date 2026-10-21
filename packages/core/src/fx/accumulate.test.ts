import { describe, expect, it } from 'vitest';
import { accumulate } from './index.js';

describe('[TDS-6.4] rate accumulators', () => {
  it('[TDS-6.4] a fractional rate carries its remainder to the next tick', () => {
    const first = accumulate(1, 500, 0);
    expect(first).toEqual({ amount: 0, carry: 500 });
    const second = accumulate(1, 500, first.carry);
    expect(second).toEqual({ amount: 1, carry: 0 });
  });

  it('[TDS-6.4] a whole rate delivers every tick', () => {
    expect(accumulate(1, 1000, 0)).toEqual({ amount: 1, carry: 0 });
  });

  it('[TDS-6.4] long-run total is within one unit of the exact rational total', () => {
    let carry = 0;
    let total = 0;
    for (let tick = 0; tick < 999; tick += 1) {
      const step = accumulate(1, 7, carry);
      total += step.amount;
      carry = step.carry;
    }
    expect(total).toBe(6);
    expect(Math.abs(total - 6.993)).toBeLessThan(1);
  });
});
