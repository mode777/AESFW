import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId } from '../../ids/index.js';
import { createEmptyRegistry } from '../../registry/types.js';
import { createWorld } from '../../world/create.js';
import type { World } from '../../world/types.js';
import { readCarry, writeCarry } from './accumulators.js';

const makeWorld = (): World => {
  const result = createWorld(createEmptyRegistry(), {
    seed: [1, 2],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
  });
  if (!result.ok) throw new Error('createWorld returned an error');
  return result.value;
};

describe('[TDS-6.4] rate accumulators', () => {
  it('[TDS-6.4] an absent carry is zero', () => {
    const world = makeWorld();
    expect(readCarry(world, entityId(1), 'population_need', definitionHandle(0))).toBe(0);
  });

  it('[TDS-6.4] a carry is stored and read back', () => {
    const world = makeWorld();
    writeCarry(world, entityId(1), 'population_need', definitionHandle(0), 900);
    expect(readCarry(world, entityId(1), 'population_need', definitionHandle(0))).toBe(900);
  });

  it('[TDS-6.4] a zero carry removes the entry', () => {
    const world = makeWorld();
    writeCarry(world, entityId(1), 'population_need', definitionHandle(0), 900);
    writeCarry(world, entityId(1), 'population_need', definitionHandle(0), 0);
    expect(world.accumulators.entries).toHaveLength(0);
  });

  it('[TDS-6.4] entries are ordered by subject', () => {
    const world = makeWorld();
    writeCarry(world, entityId(2), 'population_need', definitionHandle(0), 1);
    writeCarry(world, entityId(1), 'population_need', definitionHandle(0), 2);
    expect(world.accumulators.entries.map((entry) => entry.subject)).toEqual([1, 2]);
  });
});
