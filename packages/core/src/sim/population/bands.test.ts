/**
 * Unit tests for satisfaction-band evaluation, growth override, output
 * multiplier, decline grace timers, and INV-09 (GDD-12.6, CONT-6.19).
 *
 * Source: GDD-12.6, CONT-6.19, INV-09
 */
import { describe, expect, it } from 'vitest';

import { createWorld } from '../../world/create.js';
import { createEmptyRegistry } from '../../registry/types.js';
import { definitionHandle, entityId, stringId } from '../../ids/index.js';
import { runPhases, stores } from '../../testing.js';
import type { Registry } from '../../registry/types.js';
import type { World } from '../../world/types.js';
import { bandIndexFor, bandTableOf, updateBands } from '../population/bands.js';
import type { BandState } from '../population/bands.js';
import type { Growth } from '../population/growth.js';
import type { Residence } from '../population/types.js';
import type { Satisfaction } from '../needs/types.js';

const RESOURCE = definitionHandle(3);
const GROWTH = definitionHandle(4);
const BANDS = definitionHandle(5);

const bandData = {
  id: 'test.bands.default',
  bands: [
    { min: 0, effects: [{ type: 'growth', policy: 'test.growth.emigration' }] },
    { min: 500, effects: [{ type: 'output_multiplier', resource: 'test.resource.a', value: 400 }] },
    {
      min: 800,
      effects: [
        { type: 'enable_advancement' },
        { type: 'output_multiplier', resource: 'test.resource.a', value: 1000 },
      ],
    },
  ],
};

const growthData = {
  id: 'test.growth.emigration',
  interval_ticks: 10,
  decrease: { quantity: 1, condition: 'test.condition.decline' },
};

const registry: Registry = {
  ...createEmptyRegistry(),
  stringIdOf: (type, handle) =>
    type === 'band' && handle === BANDS
      ? stringId('test.bands.default')
      : type === 'resource' && handle === RESOURCE
        ? stringId('test.resource.a')
        : type === 'growthPolicy' && handle === GROWTH
          ? stringId('test.growth.emigration')
          : null,
  handleOf: (type, id) =>
    type === 'resource' && id === stringId('test.resource.a')
      ? RESOURCE
      : type === 'growthPolicy' && id === stringId('test.growth.emigration')
        ? GROWTH
        : null,
  definitionDataOf: (type, handle) =>
    type === 'band' && handle === BANDS
      ? bandData
      : type === 'growthPolicy' && handle === GROWTH
        ? growthData
        : null,
};

const makeWorld = (): World => {
  const result = createWorld(registry, {
    seed: [0, 0],
    tickDurationMs: 100,
    world: null,
    enabledModules: [],
  });
  if (!result.ok) throw new Error('world creation failed');
  return result.value;
};

const residence: Residence = {
  tier: definitionHandle(9),
  capacity: 10,
  location: entityId(1),
  growthPolicy: GROWTH,
  consumptionFactor: 1000,
  outputs: [],
  needs: [],
  categories: [],
  satisfactionAggregation: 'average',
  bands: BANDS,
};

const setResidence = (world: World, z: number, entity = 1): void => {
  stores(world).get<Residence>('residence').set(entityId(entity), residence);
  stores(world).get<Satisfaction>('satisfaction').set(entityId(entity), { z, categories: [] });
};

const bandOf = (world: World, entity = 1): BandState | undefined =>
  stores(world).get<BandState>('bandState').get(entityId(entity));

describe('[GDD-12.6] band selection', () => {
  it('[GDD-12.6] a table parses and selects the highest band at or below Z', () => {
    const table = bandTableOf(registry, BANDS);
    expect(table).not.toBeNull();
    if (table === null) return;
    expect(bandIndexFor(table, 0)).toBe(0);
    expect(bandIndexFor(table, 499)).toBe(0);
    expect(bandIndexFor(table, 500)).toBe(1);
    expect(bandIndexFor(table, 1000)).toBe(2);
  });

  it('[GDD-12.6] phase 22 writes the band index and resolved effects', () => {
    const world = makeWorld();
    setResidence(world, 900);
    runPhases(world, registry, [22], { commands: [], options: { journal: false, hash: false } });
    const state = bandOf(world);
    expect(state?.bandIndex).toBe(2);
    expect(state?.advancementEnabled).toBe(true);
    expect(state?.outputMultipliers).toEqual([{ resource: RESOURCE, value: 1000 }]);
    expect(state?.growthOverride).toBeNull();
  });

  it('[GDD-12.6] a growth effect resolves the override policy', () => {
    const world = makeWorld();
    setResidence(world, 100);
    runPhases(world, registry, [22], { commands: [], options: { journal: false, hash: false } });
    const override = bandOf(world)?.growthOverride as Growth | null;
    expect(override?.policy).toBe(GROWTH);
    expect(override?.decrease?.quantity).toBe(1);
  });
});

describe('[GDD-12.6] decline grace timer', () => {
  it('[GDD-12.6] the grace counter advances while the band holds and resets on a band change', () => {
    const world = makeWorld();
    setResidence(world, 100);
    const withGrace: Registry = {
      ...registry,
      definitionDataOf: (type, handle) =>
        type === 'band' && handle === BANDS
          ? {
              id: 'test.bands.default',
              bands: [
                { min: 0, effects: [{ type: 'trigger_decline', grace_ticks: 2 }] },
                { min: 500, effects: [] },
              ],
            }
          : (registry.definitionDataOf?.(type, handle) ?? null),
    };
    updateBands(world, withGrace);
    expect(bandOf(world)?.declineTicks).toBe(1);
    updateBands(world, withGrace);
    expect(bandOf(world)?.declineTicks).toBe(2);
    stores(world).get<Satisfaction>('satisfaction').set(entityId(1), { z: 600, categories: [] });
    updateBands(world, withGrace);
    expect(bandOf(world)?.declineTicks).toBe(0);
    stores(world).get<Satisfaction>('satisfaction').set(entityId(1), { z: 100, categories: [] });
    updateBands(world, withGrace);
    expect(bandOf(world)?.declineTicks).toBe(1);
  });
});

describe('[GDD-12.6] output multiplier', () => {
  it('[GDD-12.6] a band multiplier scales the income rate', () => {
    const world = makeWorld();
    const outputRegistry: Registry = {
      ...registry,
      stringIdOf: (type, handle) =>
        type === 'resource'
          ? stringId('test.resource.a')
          : (registry.stringIdOf?.(type, handle) ?? null),
      definitionDataOf: (type, handle) =>
        type === 'resource' && handle === RESOURCE
          ? { id: 'test.resource.a', storage: { policy: 'normal', scope: 'inventory' } }
          : (registry.definitionDataOf?.(type, handle) ?? null),
    };
    stores(world)
      .get<{ active: boolean; owner: number | null }>('location')
      .set(entityId(1), { active: true, owner: 0 });
    world.owners = {
      owners: [
        {
          handle: 0 as never,
          knowledge: [],
          accounts: [],
          purposeLocks: [],
          unlocks: [],
          deficitPaused: [],
        },
      ],
    };
    stores(world)
      .get<Residence>('residence')
      .set(entityId(1), {
        ...residence,
        outputs: [
          {
            resource: RESOURCE,
            ratePerPopulationPerTick: 100,
            scope: 'owner',
            satisfactionCurve: null,
          },
        ],
      });
    stores(world)
      .get('populationGroup')
      .set(entityId(1), {
        tier: definitionHandle(9),
        count: 10,
        capacity: 10,
      });
    stores(world).get<Satisfaction>('satisfaction').set(entityId(1), { z: 600, categories: [] });
    updateBands(world, outputRegistry);
    runPhases(world, outputRegistry, [26], {
      commands: [],
      options: { journal: false, hash: false },
    });
    // 10 population × 100 rate × 400/1000 band multiplier = 400 credits.
    expect(world.owners.owners[0]?.accounts[0]?.amount).toBe(400);
  });
});
