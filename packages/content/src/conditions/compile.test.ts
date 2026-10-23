import { describe, expect, it } from 'vitest';

import { buildRegistry } from '../registry/build.js';
import type { JsonValue } from '../types.js';
import { compileCondition } from './compile.js';
import { sustainedSlots } from './expr.js';
import type { Expr } from './expr.js';

const registry = buildRegistry({}).registry;

const compile = (expression: JsonValue) =>
  compileCondition({ id: 'test.condition.a', expression }, registry);

const codes = (diagnostics: readonly { readonly code: string }[]) =>
  diagnostics.map((diagnostic) => diagnostic.code);

describe('[CONT-7.1][CONT-7.2] condition compilation', () => {
  it('[CONT-7.1][CONT-7.3] a comparison compiles', () => {
    const result = compile({
      greater_equal: { left: { residence_population: 'current_entity' }, right: 10 },
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.condition?.resultType).toBe('bool');
  });

  it('[CONT-7.1] an unknown operator is reported', () => {
    const result = compile({ telepathy: 1 });
    expect(codes(result.diagnostics)).toEqual(['unknown_operator']);
    expect(result.condition).toBeNull();
  });

  it('[CONT-7.1] a malformed node is reported', () => {
    const result = compile({ greater_equal: { left: 1 } });
    expect(codes(result.diagnostics)).toEqual(['invalid_condition_shape']);
  });

  it('[CONT-7.1] a boolean operand mismatch is reported', () => {
    const result = compile({ not: 5 });
    expect(codes(result.diagnostics)).toEqual(['condition_type_error']);
  });

  it('[CONT-7.1] a comparison of different types is reported', () => {
    const result = compile({ greater: { left: true, right: 1 } });
    expect(codes(result.diagnostics)).toEqual(['condition_type_error']);
  });
});

describe('[CONT-7.2] domain queries', () => {
  it('[CONT-7.2] a known query is recognised', () => {
    const result = compile({ aggregate_need_fulfillment: 'current_entity' });
    expect(result.diagnostics).toEqual([]);
    expect(result.condition?.resultType).toBe('int');
  });

  it('[CONT-7.2] an unknown query is reported', () => {
    const result = compile({
      sum: { selector: { type: 'global' }, of: { weather_forecast: 'current_entity' } },
    });
    expect(codes(result.diagnostics)).toEqual(['unknown_query']);
  });
});

describe('[CONT-7.2][TDS-14.3] sustained compilation', () => {
  it('[CONT-7.2][TDS-14.3] sustained nodes compile with pre-order slots', () => {
    const result = compile({
      all: [
        { sustained: { ticks: 60, condition: true } },
        { sustained: { ticks: 30, condition: { not: false } } },
      ],
    });
    expect(result.diagnostics).toEqual([]);
    const root = result.condition?.root;
    expect(root?.t).toBe('all');
    if (root?.t !== 'all') return;
    const [first, second] = root.args;
    expect(first?.t).toBe('sustained');
    expect(second?.t).toBe('sustained');
    if (first?.t !== 'sustained' || second?.t !== 'sustained') return;
    expect(first.slot).toBe(0);
    expect(first.ticks).toBe(60);
    expect(second.slot).toBe(1);
    expect(result.condition?.resultType).toBe('bool');
  });

  it('[CONT-7.2] a malformed sustained node is reported', () => {
    expect(codes(compile({ sustained: { ticks: 10 } }).diagnostics)).toEqual([
      'invalid_condition_shape',
    ]);
    expect(codes(compile({ sustained: 10 }).diagnostics)).toEqual(['invalid_condition_shape']);
  });

  it('[CONT-7.2] a non-positive or fractional ticks value is invalid', () => {
    expect(codes(compile({ sustained: { ticks: 0, condition: true } }).diagnostics)).toEqual([
      'condition_ticks_invalid',
    ]);
    expect(codes(compile({ sustained: { ticks: -5, condition: true } }).diagnostics)).toEqual([
      'condition_ticks_invalid',
    ]);
    expect(codes(compile({ sustained: { ticks: 1.5, condition: true } }).diagnostics)).toEqual([
      'condition_ticks_invalid',
    ]);
  });

  it('[CONT-7.2] a non-boolean inner expression is a type error', () => {
    const result = compile({ sustained: { ticks: 10, condition: 5 } });
    expect(codes(result.diagnostics)).toEqual(['condition_type_error']);
  });

  it('[TDS-14.3] sustainedSlots returns the used slots in pre-order', () => {
    const result = compile({
      all: [
        { sustained: { ticks: 5, condition: true } },
        true,
        { sustained: { ticks: 3, condition: { sustained: { ticks: 1, condition: true } } } },
      ],
    });
    expect(result.condition).not.toBeNull();
    expect(sustainedSlots(result.condition?.root as Expr)).toEqual([0, 1, 2]);
  });
});
