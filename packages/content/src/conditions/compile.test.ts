import { describe, expect, it } from 'vitest';

import { buildRegistry } from '../registry/build.js';
import type { JsonValue } from '../types.js';
import { compileCondition } from './compile.js';

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
