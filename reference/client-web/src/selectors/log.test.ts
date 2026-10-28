/**
 * The event log selector (REF-12.4, PIC-11).
 *
 * Source: REF-12.4, PIC-11
 */
import { describe, expect, it } from 'vitest';

import type { EventDto } from '@aesfw/protocol';

import { LOG_LIMIT, logLines, logTypes } from './log.js';

const event = (
  tick: number,
  sequence: number,
  type: string,
  subjects: number[] = [],
): EventDto => ({
  session_id: 's',
  tick,
  sequence,
  type,
  subjects,
  payload: { amount: 3 },
});

describe('[PIC-11] event log', () => {
  it('[PIC-11] lines are newest first and summarise their payload', () => {
    const lines = logLines([event(1, 0, 'A'), event(2, 1, 'B')]);
    expect(lines.map((line) => line.type)).toEqual(['B', 'A']);
    expect(lines[0]?.text).toBe('B amount=3');
  });

  it('[PIC-11] the ring is bounded', () => {
    const events = Array.from({ length: LOG_LIMIT + 50 }, (_, index) => event(index, index, 'X'));
    const lines = logLines(events);
    expect(lines).toHaveLength(LOG_LIMIT);
    expect(lines[0]?.tick).toBe(events.length - 1);
  });

  it('[PIC-11] filters match type, entity, and location', () => {
    const events = [
      event(1, 0, 'A', [7]),
      event(2, 1, 'B', [8]),
      { ...event(3, 2, 'C', []), payload: { location: 4 } },
    ];
    expect(logLines(events, { type: 'B', location: null, entity: null })).toHaveLength(1);
    expect(logLines(events, { type: null, location: null, entity: 7 })[0]?.type).toBe('A');
    expect(logLines(events, { type: null, location: 4, entity: null })[0]?.type).toBe('C');
  });

  it('[PIC-11] the filter options are the distinct types, ascending', () => {
    expect(logTypes([event(1, 0, 'B'), event(2, 1, 'A'), event(3, 2, 'B')])).toEqual(['A', 'B']);
  });
});
