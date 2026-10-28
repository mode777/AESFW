/**
 * Number formatting from the presentation package (REF-14.4, PIC-7).
 *
 * Source: REF-14.4, PIC-7
 */
import { describe, expect, it } from 'vitest';

import { createFormatter } from './index.js';

const reference = createFormatter({
  baseScale: 6000,
  grouping: true,
  decimals: 0,
  perMinute: true,
  tickDurationMs: 1000,
});

describe('[REF-14.4] presentation formatting', () => {
  it('[REF-14.4] base units render in display units with grouping', () => {
    expect(reference.format(0)).toBe('0');
    expect(reference.format(6000)).toBe('1');
    expect(reference.format(1_234_000)).toBe('206');
    expect(reference.format(-12_000)).toBe('-2');
  });

  it('[REF-14.4] decimals come from the package', () => {
    const formatter = createFormatter({
      baseScale: 1000,
      grouping: false,
      decimals: 2,
      perMinute: false,
      tickDurationMs: 1000,
    });
    expect(formatter.format(1500)).toBe('1.50');
    expect(formatter.format(-250)).toBe('-0.25');
  });

  it('[REF-14.4] rates convert per tick to the declared unit', () => {
    // 100 base units per tick = 6000 per minute = 1 display unit per minute.
    expect(reference.formatRate(100)).toBe('+1/min');
    expect(reference.formatRate(-100)).toBe('-1/min');
    expect(reference.formatRate(0)).toBe('+0/min');
    expect(reference.rateUnit).toBe('/min');
  });

  it('[REF-14.4] an empty package falls back to a scale of one', () => {
    const fallback = createFormatter({
      baseScale: 0,
      grouping: true,
      decimals: 0,
      perMinute: false,
      tickDurationMs: 0,
    });
    expect(fallback.format(1500)).toBe('1,500');
    expect(fallback.rateUnit).toBe('/tick');
    expect(fallback.formatRate(2)).toBe('+2/tick');
  });
});
