import { describe, expect, it } from 'vitest';

import type { Diagnostic } from '@aesfw/core';
import { compileCurve, evaluateCurve } from './curves.js';

const compile = (definition: unknown) => compileCurve(definition as never);

const curveOf = (definition: unknown) => {
  const result = compile(definition);
  if (result.curve === null) throw new Error('curve did not compile');
  return result.curve;
};

describe('[CONT-8][TDS-14.4] curves', () => {
  it('[CONT-8] a piecewise-linear curve interpolates', () => {
    const curve = curveOf({
      id: 'test.curve.a',
      type: 'piecewise_linear',
      points: [
        [0, 0],
        [500, 500],
        [1000, 1200],
      ],
    });
    expect(evaluateCurve(curve, 750)).toBe(850);
  });

  it('[CONT-8] a step curve selects the lower point', () => {
    const curve = curveOf({
      id: 'test.curve.a',
      type: 'step',
      points: [
        [0, 0],
        [500, 500],
      ],
    });
    expect(evaluateCurve(curve, 750)).toBe(500);
  });

  it('[CONT-8] an empty curve is rejected', () => {
    const result = compile({ id: 'test.curve.a', type: 'piecewise_linear', points: [] });
    expect(result.curve).toBeNull();
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(['invalid_curve']);
  });

  it('[CONT-8] clamp extrapolation bounds the result', () => {
    const curve = curveOf({
      id: 'test.curve.a',
      type: 'piecewise_linear',
      points: [
        [0, 0],
        [1000, 1200],
      ],
      extrapolation: 'clamp',
    });
    expect(evaluateCurve(curve, 2000)).toBe(1200);
  });

  it('[CONT-8] error extrapolation clamps and reports', () => {
    const curve = curveOf({
      id: 'test.curve.a',
      type: 'piecewise_linear',
      points: [
        [0, 0],
        [1000, 1200],
      ],
      extrapolation: 'error',
    });
    const diagnostics: Diagnostic[] = [];
    expect(evaluateCurve(curve, 2000, diagnostics)).toBe(1200);
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual(['curve_extrapolation_error']);
  });
});
