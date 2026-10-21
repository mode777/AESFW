import { describe, expect, it } from 'vitest';
import { canonicalStringify } from './canonical.js';

describe('[TDS-19.3] canonical JSON encoding', () => {
  it('[TDS-19.3] object keys are sorted in code-unit order', () => {
    expect(canonicalStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it('[TDS-19.3] nested arrays keep their order and objects are sorted recursively', () => {
    expect(canonicalStringify({ a: [1, 2], b: { d: 4, c: 3 } })).toBe(
      '{"a":[1,2],"b":{"c":3,"d":4}}',
    );
  });

  it('[TDS-19.3] non-integer numbers are rejected', () => {
    expect(() => canonicalStringify(1.5)).toThrowError(/non_canonical_value/);
    expect(() => canonicalStringify(Number.MAX_SAFE_INTEGER + 1)).toThrowError(
      /non_canonical_value/,
    );
  });

  it('[TDS-19.3] values outside the canonical domain are rejected', () => {
    expect(() => canonicalStringify({ a: undefined })).toThrowError(/non_canonical_value/);
    expect(() => canonicalStringify({ a: () => 1 })).toThrowError(/non_canonical_value/);
    expect(() => canonicalStringify(new Map())).toThrowError(/non_canonical_value/);
  });

  it('[TDS-19.3] strings are escaped for round-trip', () => {
    expect(canonicalStringify('a"b')).toBe('"a\\"b"');
    expect(JSON.parse(canonicalStringify('a"b\n'))).toBe('a"b\n');
  });

  it('[TDS-19.3] negative zero is normalized', () => {
    expect(canonicalStringify(-0)).toBe('0');
  });
});
