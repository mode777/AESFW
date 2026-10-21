import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId } from '../../ids/index.js';
import { runPhases } from '../../pipeline/step.js';
import type { TickInput } from '../../pipeline/types.js';
import { createEmptyRegistry } from '../../registry/types.js';
import { stores } from '../../testing.js';
import { createWorld } from '../../world/create.js';
import type { World } from '../../world/types.js';
import type { CapabilityProvider } from '../capabilities/index.js';
import type { PopulationGroup, Residence } from './types.js';

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

const setResidence = (world: World, entity: number, count: number): void => {
  const residence: Residence = {
    tier: res(0),
    capacity: 10,
    location: entityId(1),
    growthPolicy: null,
    consumptionFactor: 1000,
    outputs: [
      { resource: res(5), ratePerPopulationPerTick: 1, scope: 'location', satisfactionCurve: null },
    ],
  };
  const group: PopulationGroup = { tier: res(0), count, capacity: 10 };
  stores(world).get<Residence>('residence').set(entityId(entity), residence);
  stores(world).get<PopulationGroup>('populationGroup').set(entityId(entity), group);
};

const providerOf = (world: World, entity: number) =>
  stores(world).get<CapabilityProvider>('capabilityProvider').get(entityId(entity));

describe('[GDD-11] population capability outputs', () => {
  it('[GDD-11.3] a residence produces its capability', () => {
    const world = makeWorld();
    setResidence(world, 1, 4);
    runPhases(world, registry, [26], input);
    expect(providerOf(world, 1)).toEqual({
      capability: 5,
      scope: 'location',
      location: 1,
      rate: 4,
    });
  });

  it('[GDD-11.3] zero population produces nothing', () => {
    const world = makeWorld();
    setResidence(world, 1, 0);
    runPhases(world, registry, [26], input);
    expect(providerOf(world, 1)?.rate).toBe(0);
  });

  it('[GDD-11.3] the accumulated output is published', () => {
    const world = makeWorld();
    setResidence(world, 1, 4);
    runPhases(world, registry, [26], input);
    runPhases(world, registry, [26], input);
    expect(providerOf(world, 1)?.rate).toBe(4);
  });
});
