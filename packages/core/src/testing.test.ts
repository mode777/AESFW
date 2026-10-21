import { describe, expect, it } from 'vitest';
import { deepFreeze } from './testing.js';

describe('[TDS-5.2][TDS-5.5] deep-freeze helper for test builds', () => {
  it('[TDS-5.2][TDS-5.5] deep freeze covers nested levels', () => {
    const graph = deepFreeze({ a: { b: { c: 1 } } });
    expect(Object.isFrozen(graph)).toBe(true);
    expect(Object.isFrozen(graph.a)).toBe(true);
    expect(Object.isFrozen(graph.a.b)).toBe(true);
    expect(graph.a.b.c).toBe(1);
  });

  it('[TDS-5.2][TDS-5.5] mutating a frozen nested property throws', () => {
    const graph = deepFreeze({ a: { b: { c: 1 } } });
    expect(() => {
      graph.a.b.c = 2;
    }).toThrow(TypeError);
    expect(graph.a.b.c).toBe(1);
  });
});
