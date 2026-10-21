import { describe, expect, it } from 'vitest';
import { compareStrings, stableSort } from './sort.js';

describe('[TDS-9.4] ordering and stable sort', () => {
  it('[TDS-9.4] compareStrings uses code-unit order', () => {
    expect(compareStrings('a', 'b')).toBeLessThan(0);
    expect(compareStrings('b', 'a')).toBeGreaterThan(0);
    expect(compareStrings('Z', 'a')).toBeLessThan(0);
    expect(compareStrings('x', 'x')).toBe(0);
  });

  it('[TDS-9.4] stableSort preserves the order of equal elements', () => {
    const input = [
      { k: 1, i: 0 },
      { k: 0, i: 1 },
      { k: 1, i: 2 },
    ];
    expect(stableSort(input, (a, b) => a.k - b.k)).toEqual([
      { k: 0, i: 1 },
      { k: 1, i: 0 },
      { k: 1, i: 2 },
    ]);
    expect(input).toEqual([
      { k: 1, i: 0 },
      { k: 0, i: 1 },
      { k: 1, i: 2 },
    ]);
  });
});
