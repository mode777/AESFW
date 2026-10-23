/**
 * Unit tests for service capacity, spatial coverage, and state-query need
 * delivery in phase 20 (GDD-12.2, GDD-3.6, TDS-14.2).
 *
 * Source: GDD-12.2, GDD-3.6, TDS-14.2
 */
import { describe, expect, it } from 'vitest';

import { createWorld } from '../../world/create.js';
import { createEmptyRegistry } from '../../registry/types.js';
import { definitionHandle, entityId, stringId } from '../../ids/index.js';
import { runPhases, stores } from '../../testing.js';
import type { Registry } from '../../registry/types.js';
import type { World } from '../../world/types.js';
import type { NeedSpec, NeedStates, ServiceProvider } from './types.js';
import type { LogicalTransform } from '../spatial.js';
import type { Residence } from '../population/types.js';

const registry: Registry = {
  ...createEmptyRegistry(),
  stringIdOf: (type, handle) =>
    type === 'service' && handle === definitionHandle(1)
      ? stringId('test.service.a')
      : type === 'condition' && handle === definitionHandle(2)
        ? stringId('test.condition.a')
        : null,
  handleOf: (type, id) =>
    type === 'service' && id === stringId('test.service.a')
      ? definitionHandle(1)
      : type === 'condition' && id === stringId('test.condition.a')
        ? definitionHandle(2)
        : null,
};

const SERVICE = definitionHandle(1);
const CONDITION = definitionHandle(2);

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

const RESIDENCE = (needs: readonly NeedSpec[]): Residence => ({
  tier: definitionHandle(9),
  capacity: 10,
  location: entityId(1),
  growthPolicy: null,
  consumptionFactor: 1000,
  outputs: [],
  needs,
  categories: [],
  satisfactionAggregation: 'average',
});

const capacityNeed = (): NeedSpec => ({
  need: definitionHandle(20),
  category: definitionHandle(30),
  type: 'service_capacity',
  resource: definitionHandle(0),
  quantityPerPopulationPerTick: 2,
  measurementWindowTicks: 1,
  targetRatio: 1000,
  service: SERVICE,
});

const coverageNeed = (required?: number): NeedSpec => ({
  need: definitionHandle(21),
  category: definitionHandle(30),
  type: 'spatial_coverage',
  resource: definitionHandle(0),
  quantityPerPopulationPerTick: 0,
  measurementWindowTicks: 1,
  targetRatio: 1000,
  service: SERVICE,
  ...(required !== undefined ? { requiredDistinctProviders: required } : {}),
});

const stateNeed = (): NeedSpec => ({
  need: definitionHandle(22),
  category: definitionHandle(30),
  type: 'state_query',
  resource: definitionHandle(0),
  quantityPerPopulationPerTick: 0,
  measurementWindowTicks: 1,
  targetRatio: 1000,
  condition: CONDITION,
});

const setupResidence = (
  world: World,
  entity: number,
  needs: readonly NeedSpec[],
  demanded: number,
): void => {
  const store = stores(world);
  store.get<Residence>('residence').set(entityId(entity), RESIDENCE(needs));
  store.get<NeedStates>('needStates').set(entityId(entity), {
    needs: needs.map((spec) => ({ need: spec.need, demanded, window: [] })),
  });
};

/** A modifierSet entry union; service providers live beside storage providers. */
type ModifierEntry = ServiceProvider | { readonly kind: 'storage_provider' };

const setProvider = (world: World, entity: number, provider: ServiceProvider, x: number): void => {
  const store = stores(world);
  store.get<ModifierEntry>('modifierSet').set(entityId(entity), provider);
  store
    .get<LogicalTransform>('transform')
    .set(entityId(entity), { location: entityId(1), position: { x, y: 0 }, orientation: 0 });
};

const runPhase20 = (
  world: World,
  evaluator: (world: World, condition: number, subject: number) => boolean = () => true,
) => {
  return runPhases(world, registry, [20], {
    commands: [],
    options: { journal: false, hash: false },
    conditionEvaluator: evaluator,
  });
};

const deliveredOf = (world: World, entity: number, need: number): number => {
  const states = stores(world).get<NeedStates>('needStates').get(entityId(entity));
  return states?.needs.find((entry) => entry.need === definitionHandle(need))?.window.at(-1) ?? -1;
};

describe('[GDD-12.2] service capacity delivery', () => {
  it('[GDD-12.2] capacity is allocated in ascending residence order', () => {
    const world = makeWorld();
    setProvider(
      world,
      5,
      {
        kind: 'service_provider',
        mode: 'capacity',
        service: SERVICE,
        capability: definitionHandle(4),
        quantityPerTick: 5,
      },
      0,
    );
    setupResidence(world, 1, [capacityNeed()], 4);
    setupResidence(world, 2, [capacityNeed()], 3);

    runPhase20(world);
    expect(deliveredOf(world, 1, 20)).toBe(4);
    expect(deliveredOf(world, 2, 20)).toBe(1);
  });

  it('[GDD-12.2] unserved capacity demand delivers zero', () => {
    const world = makeWorld();
    setupResidence(world, 1, [capacityNeed()], 3);

    runPhase20(world);
    expect(deliveredOf(world, 1, 20)).toBe(0);
  });
});

describe('[GDD-3.6] spatial coverage delivery', () => {
  it('[GDD-3.6] one provider inside the radius supplies a single-provider need', () => {
    const world = makeWorld();
    setProvider(
      world,
      5,
      { kind: 'service_provider', mode: 'coverage', service: SERVICE, radiusCells: 6 },
      4,
    );
    setupResidence(world, 1, [coverageNeed()], 1);
    stores(world)
      .get<LogicalTransform>('transform')
      .set(entityId(1), {
        location: entityId(1),
        position: { x: 0, y: 0 },
        orientation: 0,
      });

    runPhase20(world);
    expect(deliveredOf(world, 1, 21)).toBe(1);
  });

  it('[GDD-3.6] coverage outside the radius delivers zero', () => {
    const world = makeWorld();
    setProvider(
      world,
      5,
      { kind: 'service_provider', mode: 'coverage', service: SERVICE, radiusCells: 6 },
      7,
    );
    setupResidence(world, 1, [coverageNeed()], 1);
    stores(world)
      .get<LogicalTransform>('transform')
      .set(entityId(1), {
        location: entityId(1),
        position: { x: 0, y: 0 },
        orientation: 0,
      });

    runPhase20(world);
    expect(deliveredOf(world, 1, 21)).toBe(0);
  });

  it('[GDD-3.6] distinct providers are required in full', () => {
    const world = makeWorld();
    setProvider(
      world,
      5,
      { kind: 'service_provider', mode: 'coverage', service: SERVICE, radiusCells: 6 },
      1,
    );
    setupResidence(world, 1, [coverageNeed(2)], 1);
    stores(world)
      .get<LogicalTransform>('transform')
      .set(entityId(1), {
        location: entityId(1),
        position: { x: 2, y: 0 },
        orientation: 0,
      });

    runPhase20(world);
    expect(deliveredOf(world, 1, 21)).toBe(0);

    setProvider(
      world,
      6,
      { kind: 'service_provider', mode: 'coverage', service: SERVICE, radiusCells: 6 },
      3,
    );
    runPhase20(world);
    expect(deliveredOf(world, 1, 21)).toBe(1);
  });

  it('[GDD-3.6] a disabled provider covers nothing', () => {
    const world = makeWorld();
    setProvider(
      world,
      5,
      { kind: 'service_provider', mode: 'coverage', service: SERVICE, radiusCells: 6 },
      1,
    );
    stores(world).get<{ enabled: boolean }>('enabled').set(entityId(5), { enabled: false });
    setupResidence(world, 1, [coverageNeed()], 1);
    stores(world)
      .get<LogicalTransform>('transform')
      .set(entityId(1), {
        location: entityId(1),
        position: { x: 2, y: 0 },
        orientation: 0,
      });

    runPhase20(world);
    expect(deliveredOf(world, 1, 21)).toBe(0);
  });
});

describe('[TDS-14.2] state query delivery', () => {
  it('[TDS-14.2] a true condition supplies and a false condition delivers zero', () => {
    const world = makeWorld();
    setupResidence(world, 1, [stateNeed()], 1);
    let verdict = true;

    runPhase20(world, () => verdict);
    expect(deliveredOf(world, 1, 22)).toBe(1);

    verdict = false;
    runPhase20(world, () => verdict);
    expect(deliveredOf(world, 1, 22)).toBe(0);
  });
});
