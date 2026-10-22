import { describe, expect, it } from 'vitest';

import { evaluateCompiledCurve } from './curve.js';
import type { CompiledCurvePoints } from './curve.js';

const curve = (overrides: Partial<CompiledCurvePoints>): CompiledCurvePoints => ({
  type: 'piecewise_linear',
  points: [
    [0, 0],
    [3, 1000],
  ],
  extrapolation: 'clamp',
  ...overrides,
});

describe('[CONT-8][TDS-14.4] fx.evaluateCompiledCurve', () => {
  it('[CONT-8] piecewise-linear interpolation floors', () => {
    expect(evaluateCompiledCurve(curve({}), 1)).toBe(333);
    expect(evaluateCompiledCurve(curve({}), 2)).toBe(666);
  });

  it('[CONT-8] a step curve holds the left point', () => {
    const step = curve({
      type: 'step',
      points: [
        [0, 100],
        [10, 500],
      ],
    });
    expect(evaluateCompiledCurve(step, 9)).toBe(100);
    expect(evaluateCompiledCurve(step, 10)).toBe(500);
  });

  it('[CONT-8] a lookup curve behaves like a step curve', () => {
    const lookup = curve({
      type: 'lookup',
      points: [
        [0, 100],
        [10, 500],
      ],
    });
    expect(evaluateCompiledCurve(lookup, 5)).toBe(100);
  });

  it('[CONT-8] a constant curve returns its single value', () => {
    expect(evaluateCompiledCurve(curve({ type: 'constant', points: [[7, 250]] }), -3)).toBe(250);
  });

  it('[CONT-8] clamp extrapolation holds the boundary', () => {
    expect(evaluateCompiledCurve(curve({}), -5)).toBe(0);
    expect(evaluateCompiledCurve(curve({}), 9)).toBe(1000);
  });

  it('[CONT-8] error extrapolation clamps', () => {
    const error = curve({ extrapolation: 'error' });
    expect(evaluateCompiledCurve(error, -5)).toBe(0);
    expect(evaluateCompiledCurve(error, 9)).toBe(1000);
  });

  it('[CONT-8] linear extrapolation extends the last segment', () => {
    const linear = curve({ extrapolation: 'linear' });
    expect(evaluateCompiledCurve(linear, 6)).toBe(2000);
    expect(evaluateCompiledCurve(linear, -3)).toBe(-1000);
  });

  it('[CONT-8] an empty point list evaluates to zero', () => {
    expect(evaluateCompiledCurve(curve({ points: [] }), 5)).toBe(0);
  });

  it('[CONT-8] boundary inputs return their exact points', () => {
    expect(evaluateCompiledCurve(curve({}), 0)).toBe(0);
    expect(evaluateCompiledCurve(curve({}), 3)).toBe(1000);
  });
});
