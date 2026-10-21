import { describe, expect, it } from 'vitest';
import { createEmptyRegistry } from '../registry/types.js';
import { cloneWorld } from '../world/codec.js';
import { createWorld } from '../world/create.js';
import type { World } from '../world/types.js';
import { step } from './step.js';
import type { TickInput } from './types.js';

const registry = createEmptyRegistry();
const hashInput: TickInput = { commands: [], options: { journal: false, hash: true } };
const plainInput: TickInput = { commands: [], options: { journal: false, hash: false } };

const makeWorld = (): World => {
  const result = createWorld(registry, {
    seed: [1, 2],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
  });
  if (!result.ok) throw new Error('createWorld returned an error');
  return result.value;
};

describe('[TDS-10.1][INV-17] determinism', () => {
  it('[TDS-10.1] an empty world steps 10,000 ticks with stable hashes', () => {
    const a = makeWorld();
    const b = makeWorld();
    const checkpointsA: (string | null)[] = [];
    const checkpointsB: (string | null)[] = [];

    for (let current = 1; current <= 10000; current += 1) {
      const input = current % 1000 === 0 ? hashInput : plainInput;
      const outA = step(a, registry, input);
      const outB = step(b, registry, input);
      if (current % 1000 === 0) {
        checkpointsA.push(outA.hash);
        checkpointsB.push(outB.hash);
      }
    }

    expect(checkpointsA).toEqual(checkpointsB);
    expect(checkpointsA.at(-1)).toMatch(/^[0-9a-f]{16}$/);
  }, 120000);

  it('[INV-17] stepping a clone matches the original', () => {
    const world = makeWorld();
    const clone = cloneWorld(world);
    const outWorld = step(world, registry, hashInput);
    const outClone = step(clone, registry, hashInput);
    expect(outClone.hash).toBe(outWorld.hash);
  });
});
