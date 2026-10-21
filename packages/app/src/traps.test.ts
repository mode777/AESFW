import { describe, expect, it } from 'vitest';

declare const performance: { now(): number };

describe('[TDS-5.5] ambient-API traps in app tests', () => {
  it('[TDS-5.5] performance.now throws in an app test', () => {
    expect(() => performance.now()).toThrow(/performance\.now/);
  });
});
