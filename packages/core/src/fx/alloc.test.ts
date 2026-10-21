import { describe, expect, it } from 'vitest';
import { allocate } from './index.js';

describe('[TDS-6.3] alloc-v1 proportional allocation', () => {
  it('[TDS-6.3] under-capacity grants every request in full', () => {
    const result = allocate(10, [2, 3, 4]);
    expect(result.grants).toEqual([2, 3, 4]);
    expect(result.grants.reduce((a, b) => a + b, 0)).toBe(9);
    expect(result.throttlePermille).toEqual([1000, 1000, 1000]);
  });

  it('[TDS-6.3] over-capacity allocates proportionally with remainder to the largest remainders', () => {
    const result = allocate(10, [6, 4, 1]);
    expect(result.grants).toEqual([5, 4, 1]);
    expect(result.grants.reduce((a, b) => a + b, 0)).toBe(10);
  });

  it('[TDS-6.3] equal remainders break by ascending requester order', () => {
    expect(allocate(5, [3, 3, 3]).grants).toEqual([2, 2, 1]);
  });

  it('[TDS-6.3] throttle permille reflects a partial grant', () => {
    expect(allocate(5, [3, 3, 3]).throttlePermille).toEqual([666, 666, 333]);
  });

  it('[TDS-6.3] zero request receives full throttle', () => {
    const result = allocate(3, [0, 3]);
    expect(result.grants).toEqual([0, 3]);
    expect(result.throttlePermille).toEqual([1000, 1000]);
  });

  it('[TDS-6.3] zero capacity grants nothing', () => {
    const result = allocate(0, [3, 3]);
    expect(result.grants).toEqual([0, 0]);
    expect(result.throttlePermille).toEqual([0, 0]);
  });

  it('[TDS-6.3] empty requests allocate nothing', () => {
    const result = allocate(5, []);
    expect(result.grants).toEqual([]);
    expect(result.throttlePermille).toEqual([]);
  });
});
