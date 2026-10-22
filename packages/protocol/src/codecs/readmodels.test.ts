import { describe, expect, it } from 'vitest';
import { decodeEntityDetail, decodeNeedBreakdown } from '../index.js';

describe('[PIC-10.1] entity detail codec', () => {
  it('[PIC-10.1] entity detail without an entity id is rejected', () => {
    const decoded = decodeEntityDetail({ definition_id: 'test.entity.producer' });
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) expect(decoded.error[0]?.path).toBe('entity_id');
  });
});

describe('[PIC-10.3] need breakdown codec', () => {
  it('[PIC-10.3] a need breakdown decodes', () => {
    const decoded = decodeNeedBreakdown({
      entity_id: 7,
      need_id: 'test.need.a',
      demand: 1000,
      delivered: 800,
      fulfillment: 800,
      category: 'test.need_category.a',
      category_result: 800,
    });
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.value.fulfillment).toBe(800);
  });
});
