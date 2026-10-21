import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId } from '../../ids/index.js';
import { runPhases } from '../../pipeline/step.js';
import type { TickInput } from '../../pipeline/types.js';
import { createEmptyRegistry } from '../../registry/types.js';
import { stores } from '../../testing.js';
import { createWorld } from '../../world/create.js';
import type { World } from '../../world/types.js';
import type { PopulationGroup } from './types.js';
import type { Growth } from './growth.js';

const registry = createEmptyRegistry();
const input: TickInput = { commands: [], options: { journal: false, hash: false } };
const res = (value: number) => definitionHandle(value);

const makeWorld = (): World => {
  const result = createWorld(registry, {
    seed: [1, 2],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
  });
  if (!result.ok) throw new Error('createWorld returned an error');
  const world = result.value;
  world.nextEntityId = entityId(100);
  return world;
};

const setPopulation = (world: World, count: number, capacity: number): void => {
  const group: PopulationGroup = { tier: res(0), count, capacity };
  stores(world).get<PopulationGroup>('populationGroup').set(entityId(1), group);
};

const setSatisfaction = (world: World, z: number): void => {
  stores(world).get('satisfaction').set(entityId(1), { z, categories: [] });
};

const setGrowth = (world: World, growth: Growth): void => {
  stores(world).get<Growth>('growth').set(entityId(1), growth);
};

const countOf = (world: World) =>
  stores(world).get<PopulationGroup>('populationGroup').get(entityId(1))?.count;

const growth = (overrides: Partial<Growth> = {}): Growth => ({
  policy: res(0),
  intervalTicks: 1,
  increase: {
    quantity: 1,
    condition: { minSatisfaction: 800, maxSatisfaction: null, requireCapacity: true },
  },
  decrease: {
    quantity: 1,
    condition: { minSatisfaction: null, maxSatisfaction: 250, requireCapacity: false },
  },
  ...overrides,
});

describe('[GDD-11.4] population growth', () => {
  it('[GDD-11.4] a satisfied residence grows', () => {
    const world = makeWorld();
    setPopulation(world, 5, 10);
    setSatisfaction(world, 900);
    setGrowth(world, growth());
    runPhases(world, registry, [23], input);
    expect(countOf(world)).toBe(6);
  });

  it('[GDD-11.4] a decline shrinks the residence', () => {
    const world = makeWorld();
    setPopulation(world, 5, 10);
    setSatisfaction(world, 200);
    setGrowth(world, growth());
    runPhases(world, registry, [23], input);
    expect(countOf(world)).toBe(4);
  });

  it('[GDD-11.4] growth is capped at capacity', () => {
    const world = makeWorld();
    setPopulation(world, 10, 10);
    setSatisfaction(world, 900);
    setGrowth(world, growth());
    runPhases(world, registry, [23], input);
    expect(countOf(world)).toBe(10);
  });

  it('[GDD-11.4] decline stops at zero', () => {
    const world = makeWorld();
    setPopulation(world, 0, 10);
    setSatisfaction(world, 200);
    setGrowth(world, growth());
    runPhases(world, registry, [23], input);
    expect(countOf(world)).toBe(0);
  });

  it('[GDD-11.4] the interval spreads the change', () => {
    const world = makeWorld();
    setPopulation(world, 5, 10);
    setSatisfaction(world, 900);
    setGrowth(world, growth({ intervalTicks: 10 }));
    for (let tick = 0; tick < 10; tick += 1) runPhases(world, registry, [23], input);
    expect(countOf(world)).toBe(6);
  });
});
