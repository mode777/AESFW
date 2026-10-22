/**
 * Compiled-curve evaluation (CONT-8, TDS-14.4). A curve maps an integer input
 * to an integer output over sorted integer points. Evaluation is pure and
 * identical for identical inputs; piecewise-linear interpolation floors via
 * `fx.mulDiv`. The `error` extrapolation policy clamps at runtime — reporting
 * the content diagnostic is the caller's concern (`@aesfw/content` wraps this
 * evaluator for its own callers).
 *
 * Source: CONT-8, TDS-14.4
 */
import type { Int } from './round.js';
import { mulDiv } from './index.js';

/** A curve type (CONT-8). */
export type CurveType = 'constant' | 'piecewise_linear' | 'step' | 'lookup';

/** A curve extrapolation policy (CONT-8). */
export type CurveExtrapolation = 'clamp' | 'linear' | 'error';

/** A compiled curve: sorted integer points plus type and extrapolation. */
export interface CompiledCurvePoints {
  readonly type: CurveType;
  readonly points: readonly (readonly [Int, Int])[];
  readonly extrapolation: CurveExtrapolation;
}

const interpolate = (left: readonly [Int, Int], right: readonly [Int, Int], input: Int): Int => {
  const deltaX = right[0] - left[0];
  if (deltaX === 0) return right[1];
  return left[1] + mulDiv(right[1] - left[1], input - left[0], deltaX, 'floor');
};

/**
 * Evaluates a compiled curve at `input` (TDS-14.4). Out-of-domain inputs
 * extrapolate: `clamp` holds the boundary value, `linear` extends the first
 * or last segment, and `error` clamps (the caller reports the diagnostic).
 *
 * Source: CONT-8, TDS-14.4
 */
export function evaluateCompiledCurve(curve: CompiledCurvePoints, input: Int): Int {
  const points = curve.points;
  const first = points[0];
  const last = points[points.length - 1];
  if (first === undefined || last === undefined) return 0;
  if (curve.type === 'constant') return first[1];

  if (input <= first[0]) {
    if (input === first[0]) return first[1];
    if (curve.extrapolation === 'linear' && points.length >= 2) {
      const second = points[1];
      if (second !== undefined) return interpolate(first, second, input);
    }
    return first[1];
  }

  if (input >= last[0]) {
    if (input === last[0]) return last[1];
    if (curve.extrapolation === 'linear' && points.length >= 2) {
      const previous = points[points.length - 2];
      if (previous !== undefined) return interpolate(previous, last, input);
    }
    return last[1];
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const left = points[index];
    const right = points[index + 1];
    if (left === undefined || right === undefined) continue;
    if (input >= left[0] && input <= right[0]) {
      if (curve.type === 'piecewise_linear') return interpolate(left, right, input);
      return left[1];
    }
  }
  return last[1];
}
