import { cloneWorld, createEmptyRegistry, hashWorld, step } from '@aesfw/core';
import type { Registry, TickInput } from '@aesfw/core';
import { describe, expect, it } from 'vitest';
import {
  cloneRun,
  doubleRun,
  expectHashStable,
  expectSameState,
  saveContinue,
} from './harnesses.js';
import { world } from './world-builder.js';

const registry: Registry = createEmptyRegistry();
const input: TickInput = { commands: [], options: { journal: false, hash: false } };

describe('[VER-8.1][VER-5.2] determinism harnesses', () => {
  it('[VER-8.1][INV-17] a clone run matches the original', () => {
    expect(cloneRun(world().build(), registry, input).ok).toBe(true);
  });

  it('[VER-8.1] a double run produces identical checkpoints', () => {
    const report = doubleRun(world().build(), registry, 100, { interval: 10 });
    expect(report.ok).toBe(true);
    expect(report.detail).toContain('10 checkpoints');
  });

  it('[VER-8.1][INV-18] a save and continue reproduces the uninterrupted run', () => {
    expect(saveContinue(world().build(), registry, 200, 100).ok).toBe(true);
  });

  it('[VER-5.2] identical runs pass the stability assertion', () => {
    const fixed = hashWorld(world().build(), registry);
    expect(() => expectHashStable(() => fixed)).not.toThrow();
  });

  it('[VER-5.2] different states fail the equality assertion', () => {
    const first = world().build();
    const second = cloneWorld(first);
    step(second, registry, input);
    expect(() => expectSameState(first, second, registry)).toThrowError(/state_mismatch/);
    expect(() => expectSameState(first, cloneWorld(first), registry)).not.toThrow();
  });
});
