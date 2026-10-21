import { describe, expect, it } from 'vitest';

describe('[TDS-5.5] ambient-API traps in core tests', () => {
  it('[TDS-5.5] Math.random throws in a core test', () => {
    expect(() => Math.random()).toThrow(/Math.random/);
  });
});
