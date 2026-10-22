import { describe, expect, it } from 'vitest';
import { decodeEvent } from '../index.js';

describe('[PIC-11] domain event codec', () => {
  it('[PIC-11] a known event decodes', () => {
    const decoded = decodeEvent({
      session_id: 's1',
      tick: 10,
      sequence: 1,
      type: 'ProductionCompleted',
      subjects: [8241],
      payload: {},
    });
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.value.subjects).toEqual([8241]);
  });

  it('[PIC-11] an unknown event type still decodes', () => {
    const decoded = decodeEvent({
      session_id: 's1',
      tick: 10,
      sequence: 1,
      type: 'FutureEvent',
      subjects: [],
      payload: {},
    });
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.value.type).toBe('FutureEvent');
  });

  it('[PIC-11] an event without a sequence is rejected', () => {
    const decoded = decodeEvent({
      session_id: 's1',
      tick: 10,
      type: 'ProductionCompleted',
      subjects: [],
      payload: {},
    });
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) expect(decoded.error[0]?.path).toBe('sequence');
  });
});
