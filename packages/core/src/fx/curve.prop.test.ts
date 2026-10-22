import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { evaluateCompiledCurve } from './curve.js';
import type { CompiledCurvePoints, CurveType } from './curve.js';

const PR_BUDGET = { numRuns: 100 } as const;

/** Sorted, deduplicated point arrays with at least one point. */
const pointArrays: fc.Arbitrary<readonly (readonly [number, number])[]> = fc
  .tuple(
    fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 1, maxLength: 6 }),
    fc.array(fc.integer({ min: -2000, max: 2000 }), { minLength: 1, maxLength: 6 }),
  )
  .map(([xs, ys]) => {
    const paired = xs.map((x, index) => [x, ys[index] ?? 0] as readonly [number, number]);
    paired.sort((left, right) => left[0] - right[0]);
    const deduped: (readonly [number, number])[] = [];
    for (const point of paired) {
      const previous = deduped[deduped.length - 1];
      if (previous === undefined || previous[0] !== point[0]) deduped.push(point);
    }
    return deduped;
  })
  .filter((points) => points.length >= 1);

/** BigInt floor division matching `fx.mulDiv(…, 'floor')`. */
const floorDiv = (numerator: bigint, denominator: bigint): number => {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const floored =
    remainder !== 0n && remainder < 0n !== denominator < 0n ? quotient - 1n : quotient;
  return Number(floored);
};

const exactPiecewiseLinear = (
  points: readonly (readonly [number, number])[],
  input: number,
): number => {
  for (let index = 0; index < points.length - 1; index += 1) {
    const left = points[index];
    const right = points[index + 1];
    if (left === undefined || right === undefined) continue;
    if (input >= left[0] && input <= right[0]) {
      const deltaX = right[0] - left[0];
      if (deltaX === 0) return right[1];
      return (
        left[1] + floorDiv(BigInt(right[1] - left[1]) * BigInt(input - left[0]), BigInt(deltaX))
      );
    }
  }
  const last = points[points.length - 1];
  return last !== undefined ? last[1] : 0;
};

const types: readonly CurveType[] = ['piecewise_linear', 'step', 'lookup'];

describe('[TDS-14.4] curve evaluation properties', () => {
  it('[TDS-14.4] P: evaluation matches exact floor interpolation inside the domain', () => {
    fc.assert(
      fc.property(
        pointArrays,
        fc.constantFrom(...types),
        fc.integer({ min: -1500, max: 1500 }),
        (points, type, input) => {
          const first = points[0];
          const last = points[points.length - 1];
          if (first === undefined || last === undefined || input < first[0] || input > last[0])
            return;
          const curve: CompiledCurvePoints = { type, points, extrapolation: 'clamp' };
          const expected =
            type === 'piecewise_linear'
              ? exactPiecewiseLinear(points, input)
              : exactStep(points, input);
          expect(evaluateCompiledCurve(curve, input)).toBe(expected);
        },
      ),
      PR_BUDGET,
    );
  });

  it('[TDS-14.4] P: piecewise-linear evaluation is monotone on non-decreasing point values', () => {
    const nonDecreasing = pointArrays
      .map((points) => {
        const result: (readonly [number, number])[] = [];
        let runningMax = -Infinity;
        for (const point of points) {
          runningMax = Math.max(runningMax, point[1]);
          result.push([point[0], runningMax] as readonly [number, number]);
        }
        return result;
      })
      .filter((points) => points.length >= 2);
    fc.assert(
      fc.property(
        nonDecreasing,
        fc.integer({ min: -1500, max: 1500 }),
        fc.integer({ min: 1, max: 500 }),
        (points, input, step) => {
          const curve: CompiledCurvePoints = {
            type: 'piecewise_linear',
            points,
            extrapolation: 'clamp',
          };
          const lower = evaluateCompiledCurve(curve, input);
          const upper = evaluateCompiledCurve(curve, input + step);
          expect(upper).toBeGreaterThanOrEqual(lower);
        },
      ),
      PR_BUDGET,
    );
  });
});

const exactStep = (points: readonly (readonly [number, number])[], input: number): number => {
  let value = 0;
  for (const point of points) {
    if (input >= point[0]) value = point[1];
  }
  return value;
};
