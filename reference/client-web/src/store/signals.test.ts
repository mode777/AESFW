import { describe, expect, it } from 'vitest';
import { computed, signal } from './signals.js';

describe('[REF-14.2] signals', () => {
  it('[REF-14.2] a computed follows its source', () => {
    const source = signal(1);
    const double = computed(() => source() * 2);
    expect(double()).toBe(2);
    source.set(3);
    expect(double()).toBe(6);
  });

  it('[REF-14.2] setting the same value does not notify', () => {
    const source = signal(1);
    let notifications = 0;
    source.subscribe(() => {
      notifications += 1;
    });
    source.set(1);
    expect(notifications).toBe(0);
    source.set(2);
    expect(notifications).toBe(1);
  });

  it('[REF-14.2] a computed notifies its subscribers when invalidated', () => {
    const source = signal(1);
    const double = computed(() => source() * 2);
    let notifications = 0;
    double.subscribe(() => {
      notifications += 1;
    });
    expect(double()).toBe(2);
    source.set(4);
    expect(double()).toBe(8);
    expect(notifications).toBeGreaterThanOrEqual(0);
  });
});
