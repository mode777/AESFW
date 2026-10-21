import { describe, expect, it } from 'vitest';

describe('[TDS-5.5] ambient-API traps in content tests', () => {
  it('[TDS-5.5] Date.now throws in a content test', () => {
    expect(() => Date.now()).toThrow(/Date\.now/);
  });
});
