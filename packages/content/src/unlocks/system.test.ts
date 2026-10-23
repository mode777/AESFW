/**
 * Unit tests for unlock evaluation, owner scopes, and availability (GDD-19,
 * CONT-6.17).
 *
 * Source: GDD-19, CONT-6.17, PIC-4
 */
import { describe, expect, it } from 'vitest';

import { createWorld } from '@aesfw/core';
import { createTransactionWriter, txEnvironmentFor } from '@aesfw/core';
import { ids } from '@aesfw/core';
import type { TickContext, World } from '@aesfw/core';
import type { ContentRegistry } from '../registry/types.js';
import { buildRegistry } from '../registry/build.js';
import type { CompiledContent } from '../types.js';
import { buildUnlockSystem, unlockQueryValue } from './system.js';

const buildContent = (): { content: CompiledContent; registry: ContentRegistry } => {
  const built = buildRegistry({
    conditions: [
      {
        id: 'test.condition.population',
        expression: {
          greater_equal: {
            left: { population_count: { scope: 'owner' } },
            right: 5,
          },
        },
      },
    ],
    unlocks: [
      {
        id: 'test.unlock.recipe',
        scope: 'owner',
        reversible: false,
        targets: [{ type: 'recipe', id: 'test.recipe.advanced' }],
        condition: 'test.condition.population',
      },
      {
        id: 'test.unlock.reversible',
        scope: 'owner',
        reversible: true,
        targets: [{ type: 'recipe', id: 'test.recipe.temporary' }],
        condition: 'test.condition.population',
      },
    ],
    recipes: [
      { id: 'test.recipe.advanced', mode: 'batch', duration_ticks: 1, inputs: [], outputs: [] },
      { id: 'test.recipe.temporary', mode: 'batch', duration_ticks: 1, inputs: [], outputs: [] },
    ],
  });
  return {
    content: { registry: built.registry, checksum: '', packages: [], presentation: null },
    registry: built.registry,
  };
};

const makeWorld = (registry: ContentRegistry): World => {
  const result = createWorld(registry, {
    seed: [0, 0],
    tickDurationMs: 100,
    world: null,
    enabledModules: [],
  });
  if (!result.ok) throw new Error('world creation failed');
  const world = result.value;
  world.owners = {
    owners: [
      {
        handle: ids.ownerHandle(0),
        knowledge: [],
        accounts: [],
        purposeLocks: [],
        unlocks: [],
        deficitPaused: [],
      },
    ],
  };
  return world;
};

const setPopulation = (world: World, entity: number, count: number): void => {
  world.stores.get('populationGroup').set(ids.entityId(entity), {
    tier: ids.definitionHandle(9),
    count,
    capacity: 100,
  });
  world.stores.get('owner').set(ids.entityId(entity), { owner: ids.ownerHandle(0) });
};

const context = (world: World, registry: ContentRegistry): TickContext => ({
  tick: 1 as never,
  registry,
  world,
  tx: createTransactionWriter(world, null, txEnvironmentFor(registry)),
  events: { emit: () => undefined, events: [] },
  scratch: { values: new Map() },
  policies: {},
  conditionEvaluator: () => true,
  sustainedTimerUpdater: () => undefined,
  unlockSystem: null,
});

describe('[GDD-19] unlock evaluation', () => {
  it('[GDD-19] a satisfied owner-scoped condition exposes the targets', () => {
    const { content, registry } = buildContent();
    const world = makeWorld(registry);
    setPopulation(world, 1, 5);
    buildUnlockSystem(content).update(context(world, registry));
    expect(world.owners.owners[0]?.unlocks).toEqual([
      ids.stringId('test.recipe.advanced'),
      ids.stringId('test.recipe.temporary'),
    ]);
  });

  it('[GDD-19] an unsatisfied condition exposes nothing', () => {
    const { content, registry } = buildContent();
    const world = makeWorld(registry);
    setPopulation(world, 1, 4);
    buildUnlockSystem(content).update(context(world, registry));
    expect(world.owners.owners[0]?.unlocks).toEqual([]);
  });

  it('[GDD-19] a reversible unlock is revoked when the condition fails', () => {
    const { content, registry } = buildContent();
    const world = makeWorld(registry);
    setPopulation(world, 1, 5);
    const system = buildUnlockSystem(content);
    system.update(context(world, registry));
    expect(world.owners.owners[0]?.unlocks).toContain(ids.stringId('test.recipe.temporary'));

    setPopulation(world, 1, 0);
    system.update(context(world, registry));
    expect(world.owners.owners[0]?.unlocks).not.toContain(ids.stringId('test.recipe.temporary'));
  });

  it('[GDD-19] a non-reversible unlock survives a failed condition', () => {
    const { content, registry } = buildContent();
    const world = makeWorld(registry);
    setPopulation(world, 1, 5);
    const system = buildUnlockSystem(content);
    system.update(context(world, registry));
    setPopulation(world, 1, 0);
    system.update(context(world, registry));
    expect(world.owners.owners[0]?.unlocks).toContain(ids.stringId('test.recipe.advanced'));
  });

  it('[GDD-19][PIC-4] availability gates only targeted definitions', () => {
    const { content, registry } = buildContent();
    const world = makeWorld(registry);
    const system = buildUnlockSystem(content);
    expect(
      system.isAvailable(world, ids.ownerHandle(0), 'recipe', ids.stringId('test.recipe.advanced')),
    ).toBe(false);
    expect(
      system.isAvailable(world, ids.ownerHandle(0), 'recipe', ids.stringId('test.recipe.ungated')),
    ).toBe(true);
    setPopulation(world, 1, 5);
    system.update(context(world, registry));
    expect(
      system.isAvailable(world, ids.ownerHandle(0), 'recipe', ids.stringId('test.recipe.advanced')),
    ).toBe(true);
  });

  it('[TDS-14.2] population_count counts only the owner-scoped population', () => {
    const { registry } = buildContent();
    const world = makeWorld(registry);
    setPopulation(world, 1, 3);
    setPopulation(world, 2, 4);
    const total = unlockQueryValue(registry, world, ids.ownerHandle(0), {
      name: 'population_count',
      args: {},
      subject: 'owner',
    });
    expect(total).toBe(7);
  });
});
