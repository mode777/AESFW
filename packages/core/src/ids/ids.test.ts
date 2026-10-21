import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, ownerHandle, reservationId, stringId, tick } from './index.js';

describe('[TDS-7] branded identifiers', () => {
  it('[TDS-7] branded constructors preserve the runtime value', () => {
    expect(entityId(5)).toBe(5);
    expect(definitionHandle(3)).toBe(3);
    expect(ownerHandle(1)).toBe(1);
    expect(reservationId(9)).toBe(9);
    expect(tick(7)).toBe(7);
    expect(stringId('test.r.a')).toBe('test.r.a');
  });
});
