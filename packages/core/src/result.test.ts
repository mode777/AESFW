import { describe, expect, it } from 'vitest';
import { err, ok } from './result.js';

describe('[TDS-23] Result type', () => {
  it('[TDS-23] ok and err build the two Result branches', () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    expect(err('demo_failure')).toEqual({ ok: false, error: 'demo_failure' });
  });
});
