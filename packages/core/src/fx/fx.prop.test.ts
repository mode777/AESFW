import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { accumulate, add, allocate, mul, sub } from './index.js';
import { MAX_SAFE_INT, MIN_SAFE_INT } from './round.js';
import type { Int } from './round.js';

const PR_BUDGET = { numRuns: 100 } as const;

const boundaryInt = fc.oneof(
  fc.integer({ min: -1000, max: 1000 }),
  fc.constant(MAX_SAFE_INT),
  fc.constant(MIN_SAFE_INT),
  fc.integer({ min: MAX_SAFE_INT - 8, max: MAX_SAFE_INT }),
  fc.integer({ min: MIN_SAFE_INT, max: MIN_SAFE_INT + 8 }),
);

const expectChecked = (
  operation: (a: Int, b: Int) => Int,
  reference: (a: bigint, b: bigint) => bigint,
  a: Int,
  b: Int,
): void => {
  const expected = reference(BigInt(a), BigInt(b));
  if (expected > BigInt(MAX_SAFE_INT) || expected < BigInt(MIN_SAFE_INT)) {
    expect(() => operation(a, b)).toThrowError(/arithmetic_overflow/);
  } else {
    expect(operation(a, b)).toBe(Number(expected));
  }
};

describe('[VER-7.1] arithmetic properties', () => {
  it('[VER-7.1] P-01 operations match the BigInt reference', () => {
    fc.assert(
      fc.property(boundaryInt, boundaryInt, (a, b) => {
        expectChecked(add, (x, y) => x + y, a, b);
        expectChecked(sub, (x, y) => x - y, a, b);
        expectChecked(mul, (x, y) => x * y, a, b);
      }),
      PR_BUDGET,
    );
  });

  it('[VER-7.1] P-02 alloc-v1 satisfies its grant contract', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }),
        fc.array(fc.integer({ min: 0, max: 200 }), { maxLength: 6 }),
        (capacity, requests) => {
          const result = allocate(capacity, requests);
          const totalRequests = requests.reduce((a, b) => a + b, 0);
          expect(result.grants.reduce((a, b) => a + b, 0)).toBe(Math.min(capacity, totalRequests));
          for (let i = 0; i < requests.length; i += 1) {
            const grant = result.grants[i] ?? -1;
            expect(grant).toBeGreaterThanOrEqual(0);
            expect(grant).toBeLessThanOrEqual(requests[i] ?? 0);
          }
          expect(allocate(capacity, requests)).toEqual(result);
        },
      ),
      PR_BUDGET,
    );
  });

  it('[VER-7.1] P-03 accumulators track the exact rational total', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 2000 }),
        fc.integer({ min: 1, max: 2000 }),
        (baseRate, multiplierPermille, ticks) => {
          let carry = 0;
          let total = 0;
          for (let tick = 0; tick < ticks; tick += 1) {
            const step = accumulate(baseRate, multiplierPermille, carry);
            total += step.amount;
            carry = step.carry;
          }
          const numerator = BigInt(baseRate) * BigInt(multiplierPermille) * BigInt(ticks);
          const difference = BigInt(total) * 1000n - numerator;
          const magnitude = difference < 0n ? -difference : difference;
          expect(magnitude < 1000n).toBe(true);
        },
      ),
      PR_BUDGET,
    );
  });
});
