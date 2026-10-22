import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, ownerHandle } from '../../ids/index.js';
import type { DefinitionHandle } from '../../ids/index.js';
import { runPhases } from '../../pipeline/step.js';
import type { TickInput } from '../../pipeline/types.js';
import { createEmptyRegistry } from '../../registry/types.js';
import type { Registry } from '../../registry/types.js';
import { stores } from '../../testing.js';
import { createWorld } from '../../world/create.js';
import type { World } from '../../world/types.js';
import type { CapabilityProvider } from '../capabilities/index.js';
import type { Location } from '../location.js';
import type { Satisfaction } from '../needs/types.js';
import { isResidence } from './types.js';
import type { PopulationGroup, PopulationOutput, Residence } from './types.js';

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

const CURVE_HANDLE = definitionHandle(9);
const CAPABILITY = res(5);
const CREDITS = res(6);

const dataRegistry: Registry = {
  stringIdOf: () => null,
  handleOf: () => null,
  definitionDataOf: (type, handle) => {
    if (type === 'resource' && handle === CAPABILITY) {
      return { id: 'test.capability.a', storage: { policy: 'recomputed', scope: 'location' } };
    }
    if (type === 'resource' && handle === CREDITS) {
      return {
        id: 'test.resource.credits',
        storage: { policy: 'normal', scope: 'owner' },
        allow_negative: true,
      };
    }
    if (type === 'curve' && handle === CURVE_HANDLE) {
      return {
        id: 'test.curve.income',
        type: 'piecewise_linear',
        points: [
          [0, 0],
          [500, 500],
          [1000, 1000],
        ],
        extrapolation: 'clamp',
      };
    }
    return null;
  },
};

const makeOwnedWorld = (count: number, outputs: readonly PopulationOutput[]): World => {
  const result = createWorld(dataRegistry, {
    seed: [1, 2],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
  });
  if (!result.ok) throw new Error('createWorld returned an error');
  const world = result.value;
  world.owners = {
    owners: [
      {
        handle: ownerHandle(0),
        knowledge: [],
        accounts: [],
        purposeLocks: [],
        unlocks: [],
        deficitPaused: [],
      },
    ],
  };
  world.stores.get<Location>('location').set(entityId(1), {
    template: res(0),
    spatialPolicy: 'framework.spatial.abstract_capacity',
    capacity: 100,
    used: 0,
    properties: [],
    region: null,
    active: true,
    owner: ownerHandle(0),
  });
  const residence: Residence = {
    tier: res(0),
    capacity: 10,
    location: entityId(1),
    growthPolicy: null,
    consumptionFactor: 1000,
    outputs: [...outputs],
  };
  world.stores.get<Residence>('residence').set(entityId(1), residence);
  world.stores
    .get<PopulationGroup>('populationGroup')
    .set(entityId(1), { tier: res(0), count, capacity: 10 });
  return world;
};

const incomeOutput = (rate: number, curve: DefinitionHandle | null): PopulationOutput => ({
  resource: CREDITS,
  ratePerPopulationPerTick: rate,
  scope: 'owner',
  satisfactionCurve: curve,
});

const capabilityOutput = (rate: number): PopulationOutput => ({
  resource: CAPABILITY,
  ratePerPopulationPerTick: rate,
  scope: 'location',
  satisfactionCurve: null,
});

const accountOf = (world: World) => world.owners.owners[0]?.accounts ?? [];

describe('[GDD-20.2] population income', () => {
  it('[GDD-11.3][GDD-20.2] income is credited to the location owner', () => {
    const world = makeOwnedWorld(10, [incomeOutput(100, null)]);
    const output = runPhases(world, dataRegistry, [26], input);
    expect(accountOf(world)).toEqual([{ resource: CREDITS, amount: 1000 }]);
    expect(output.events.map((event) => event.type)).toEqual(['PopulationOutputProduced']);
  });

  it('[GDD-11.3] the satisfaction curve scales income', () => {
    const world = makeOwnedWorld(10, [incomeOutput(100, CURVE_HANDLE)]);
    world.stores.get<Satisfaction>('satisfaction').set(entityId(1), { z: 500, categories: [] });
    runPhases(world, dataRegistry, [26], input);
    expect(accountOf(world)).toEqual([{ resource: CREDITS, amount: 500 }]);
  });

  it('[GDD-11.3][TDS-6.4] fractional income accumulates across ticks', () => {
    const world = makeOwnedWorld(1, [incomeOutput(1, CURVE_HANDLE)]);
    world.stores.get<Satisfaction>('satisfaction').set(entityId(1), { z: 1000, categories: [] });
    const halving: Registry = {
      ...dataRegistry,
      definitionDataOf: (type, handle) => {
        if (type === 'curve' && handle === CURVE_HANDLE) {
          return {
            id: 'test.curve.half',
            type: 'constant',
            points: [[0, 500]],
            extrapolation: 'clamp',
          };
        }
        return dataRegistry.definitionDataOf?.(type, handle) ?? null;
      },
    };
    runPhases(world, halving, [26], input);
    expect(accountOf(world)).toEqual([]);
    runPhases(world, halving, [26], input);
    expect(accountOf(world)).toEqual([{ resource: CREDITS, amount: 1 }]);
  });

  it('[GDD-11.3] zero population produces no income and no event', () => {
    const world = makeOwnedWorld(0, [incomeOutput(100, null)]);
    const output = runPhases(world, dataRegistry, [26], input);
    expect(accountOf(world)).toEqual([]);
    expect(output.events).toEqual([]);
  });

  it('[GDD-11.3] a residence without a location produces no income', () => {
    const world = makeOwnedWorld(10, [incomeOutput(100, null)]);
    const residenceStore = world.stores.get<Residence>('residence');
    const residence = residenceStore.get(entityId(1));
    if (!isResidence(residence)) throw new Error('residence missing');
    residenceStore.set(entityId(1), { ...residence, location: null });
    const output = runPhases(world, dataRegistry, [26], input);
    expect(accountOf(world)).toEqual([]);
    expect(output.events).toEqual([]);
  });

  it('[GDD-11.3] a residence at an ownerless location produces no income', () => {
    const world = makeOwnedWorld(10, [incomeOutput(100, null)]);
    const locationStore = world.stores.get<Location>('location');
    const location = locationStore.get(entityId(1));
    if (location === undefined) throw new Error('location missing');
    locationStore.set(entityId(1), { ...location, owner: null });
    const output = runPhases(world, dataRegistry, [26], input);
    expect(accountOf(world)).toEqual([]);
    expect(output.events).toEqual([]);
  });

  it('[GDD-11.3] income without a satisfaction component uses the full rate', () => {
    const world = makeOwnedWorld(10, [incomeOutput(100, CURVE_HANDLE)]);
    runPhases(world, dataRegistry, [26], input);
    expect(accountOf(world)).toEqual([{ resource: CREDITS, amount: 1000 }]);
  });

  it('[GDD-11.3][ARCH-13] capability and income outputs coexist', () => {
    const world = makeOwnedWorld(4, [capabilityOutput(1), incomeOutput(100, null)]);
    const output = runPhases(world, dataRegistry, [26], input);
    expect(providerOf(world, 1)).toEqual({
      capability: CAPABILITY,
      scope: 'location',
      location: 1,
      rate: 4,
    });
    expect(accountOf(world)).toEqual([{ resource: CREDITS, amount: 400 }]);
    const produced = output.events.filter((event) => event.type === 'PopulationOutputProduced');
    expect(produced).toHaveLength(2);
  });

  it('[ARCH-13] the second capability output does not displace the first', () => {
    const world = makeOwnedWorld(4, [capabilityOutput(1), capabilityOutput(5)]);
    runPhases(world, dataRegistry, [26], input);
    expect(providerOf(world, 1)?.rate).toBe(4);
    expect(providerOf(world, 1)?.capability).toBe(CAPABILITY);
  });

  it('[GDD-20.2][ARCH-9] the income event names the owner and amount', () => {
    const world = makeOwnedWorld(10, [incomeOutput(100, null)]);
    const output = runPhases(world, dataRegistry, [26], input);
    const event = output.events[0];
    expect(event).toBeDefined();
    expect(event?.owner).toBe(ownerHandle(0));
    expect(event?.subjects).toEqual([entityId(1)]);
    expect(event?.payload).toEqual({ resource: CREDITS, amount: 1000 });
  });
});
