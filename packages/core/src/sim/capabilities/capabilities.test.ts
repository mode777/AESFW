import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, ownerHandle } from '../../ids/index.js';
import { runPhases } from '../../pipeline/step.js';
import type { TickInput } from '../../pipeline/types.js';
import { createEmptyRegistry } from '../../registry/types.js';
import { stores } from '../../testing.js';
import { createWorld } from '../../world/create.js';
import type { Location } from '../location.js';
import type { World } from '../../world/types.js';
import type { CapabilityConsumer, CapabilityProvider } from './types.js';

const registry = createEmptyRegistry();
const input: TickInput = { commands: [], options: { journal: false, hash: false } };

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

const setProvider = (world: World, id: number, provider: CapabilityProvider): void => {
  stores(world).get<CapabilityProvider>('capabilityProvider').set(entityId(id), provider);
};

const setConsumer = (world: World, id: number, consumer: CapabilityConsumer): void => {
  stores(world).get<CapabilityConsumer>('capabilityConsumer').set(entityId(id), consumer);
};

const setLocation = (world: World, id: number, active: boolean): void => {
  stores(world)
    .get<Location>('location')
    .set(entityId(id), {
      template: definitionHandle(0),
      spatialPolicy: 'framework.spatial.abstract_capacity',
      capacity: 100,
      used: 0,
      properties: [],
      region: null,
      active,
      owner: ownerHandle(0),
    });
};

const allocationOf = (world: World, id: number) =>
  world.stores.get('capabilityAllocation').get(entityId(id));

const provider = (
  capability: number,
  rate: number,
  scope: CapabilityProvider['scope'] = 'location',
  location: number | null = 1,
): CapabilityProvider => ({
  capability: definitionHandle(capability),
  scope,
  location: location === null ? null : entityId(location),
  rate,
});

const consumer = (
  capability: number,
  request: number,
  overrides: Partial<CapabilityConsumer> = {},
): CapabilityConsumer => ({
  capability: definitionHandle(capability),
  substitutes: [],
  scope: 'location',
  location: entityId(1),
  model: 'proportional',
  priority: 0,
  weight: 1000,
  request,
  ...overrides,
});

describe('[GDD-14][ARCH-13] capability supply and allocation', () => {
  it('[ARCH-13] provider rates aggregate by pool', () => {
    const world = makeWorld();
    setProvider(world, 1, provider(0, 40));
    setProvider(world, 2, provider(0, 60));
    setConsumer(world, 3, consumer(0, 100));
    runPhases(world, registry, [5, 6], input);
    expect(allocationOf(world, 3)).toEqual({ capability: 0, granted: 100, shortage: 0 });
  });

  it('[ARCH-13] different scopes do not mix', () => {
    const world = makeWorld();
    setProvider(world, 1, provider(0, 40, 'location', 1));
    setProvider(world, 2, provider(0, 60, 'global', null));
    setConsumer(world, 3, consumer(0, 50, { scope: 'global', location: null }));
    runPhases(world, registry, [5, 6], input);
    expect(allocationOf(world, 3)).toEqual({ capability: 0, granted: 50, shortage: 0 });
  });

  it('[GDD-14.2] proportional allocation splits deterministically', () => {
    const world = makeWorld();
    setProvider(world, 1, provider(0, 100));
    setConsumer(world, 2, consumer(0, 100));
    setConsumer(world, 3, consumer(0, 100));
    runPhases(world, registry, [5, 6], input);
    expect(allocationOf(world, 2)).toEqual({ capability: 0, granted: 50, shortage: 50 });
    expect(allocationOf(world, 3)).toEqual({ capability: 0, granted: 50, shortage: 50 });
  });

  it('[GDD-14.2] a shortage emits an event', () => {
    const world = makeWorld();
    setProvider(world, 1, provider(0, 10));
    setConsumer(world, 2, consumer(0, 50));
    const output = runPhases(world, registry, [5, 6], input);
    expect(allocationOf(world, 2)).toEqual({ capability: 0, granted: 10, shortage: 40 });
    expect(output.events.map((event) => event.type)).toContain('CapabilityShortageDetected');
  });

  it('[GDD-4.7] a consumer does not draw from an unrelated capability', () => {
    const world = makeWorld();
    setProvider(world, 1, provider(1, 40));
    setConsumer(world, 2, consumer(0, 30));
    runPhases(world, registry, [5, 6], input);
    expect(allocationOf(world, 2)).toEqual({ capability: 0, granted: 0, shortage: 30 });
  });

  it('[GDD-4.7] a consumer draws from an explicit substitute', () => {
    const world = makeWorld();
    setProvider(world, 1, provider(1, 40));
    setConsumer(world, 2, consumer(0, 30, { substitutes: [definitionHandle(1)] }));
    runPhases(world, registry, [5, 6], input);
    expect(allocationOf(world, 2)).toEqual({ capability: 0, granted: 30, shortage: 0 });
  });

  it('[GDD-14.2] a zero request receives nothing', () => {
    const world = makeWorld();
    setProvider(world, 1, provider(0, 100));
    setConsumer(world, 2, consumer(0, 0));
    runPhases(world, registry, [5, 6], input);
    expect(allocationOf(world, 2)).toEqual({ capability: 0, granted: 0, shortage: 0 });
  });

  it('[GDD-6.2] an inactive location receives nothing', () => {
    const world = makeWorld();
    setLocation(world, 1, false);
    setProvider(world, 2, provider(0, 100));
    setConsumer(world, 3, consumer(0, 50));
    runPhases(world, registry, [5, 6], input);
    expect(allocationOf(world, 3)).toEqual({ capability: 0, granted: 0, shortage: 0 });
  });

  it('[ARCH-13] phase 06 rebuilds supply when phase 05 did not run', () => {
    const world = makeWorld();
    setProvider(world, 1, provider(0, 40));
    setConsumer(world, 2, consumer(0, 30));
    runPhases(world, registry, [6], input);
    expect(allocationOf(world, 2)).toEqual({ capability: 0, granted: 30, shortage: 0 });
  });
});
