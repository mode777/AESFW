import { describe, expect, it } from 'vitest';
import { mulDiv } from '../../fx/index.js';
import type { OwnerHandle } from '../../ids/index.js';
import { definitionHandle, entityId, ownerHandle, stringId } from '../../ids/index.js';
import { runPhases } from '../../pipeline/step.js';
import type { TickInput } from '../../pipeline/types.js';
import type { Registry } from '../../registry/types.js';
import { stores } from '../../testing.js';
import { createWorld } from '../../world/create.js';
import type { OwnerState, World } from '../../world/types.js';
import type { Satisfaction } from '../needs/types.js';
import type { Maintenance } from './types.js';

const input: TickInput = { commands: [], options: { journal: false, hash: false } };
const CREDITS = definitionHandle(6);
const OWNER = ownerHandle(0);
const POLICY = definitionHandle(50);
const RESIDENCE = entityId(4);
const CURVE = definitionHandle(9);

interface PolicyOverrides {
  readonly excludeTags?: readonly string[];
  readonly resumePolicy?: 'automatic_reverse_order' | 'manual' | 'disabled';
}

const makeRegistry = (overrides: PolicyOverrides = {}): Registry => {
  const policyData = {
    id: 'test.deficit.default',
    resource: 'test.resource.credits',
    trigger: { operator: 'less', value: 0 },
    action: 'pause_entities',
    order: ['maintenance_desc', 'entity_id_asc'],
    stop_when: 'net_rate_non_negative',
    ...(overrides.excludeTags === undefined ? {} : { exclude_tags: overrides.excludeTags }),
    resume: {
      policy: overrides.resumePolicy ?? 'automatic_reverse_order',
      when: { operator: 'greater_equal', value: 0 },
    },
  };
  return {
    stringIdOf: (type, handle) => {
      if (type === 'resource' && handle === CREDITS) return stringId('test.resource.credits');
      if (type === 'deficitPolicy' && handle === POLICY) return stringId('test.deficit.default');
      return null;
    },
    handleOf: (type, id) => {
      if (type === 'resource' && id === stringId('test.resource.credits')) return CREDITS;
      if (type === 'deficitPolicy' && id === stringId('test.deficit.default')) return POLICY;
      return null;
    },
    definitionDataOf: (type, handle) => {
      if (type === 'deficitPolicy' && handle === POLICY) return policyData;
      if (type === 'resource' && handle === CREDITS) {
        return {
          id: 'test.resource.credits',
          storage: { policy: 'normal', scope: 'owner' },
          allow_negative: true,
        };
      }
      if (type === 'curve' && handle === CURVE) {
        return {
          id: 'test.curve.income',
          type: 'piecewise_linear',
          points: [
            [0, 0],
            [1000, 1000],
          ],
          extrapolation: 'clamp',
        };
      }
      if (type === 'entity' && handle === definitionHandle(41))
        return { id: 'test.entity.hub', tags: ['test.tag.hub'] };
      return null;
    },
    handlesOf: (type) => (type === 'deficitPolicy' ? [POLICY] : []),
  };
};

const maintenanceOf = (due: number): Maintenance => ({
  intervalTicks: 10,
  inputs: [{ resource: CREDITS, quantity: due }],
  chargePolicy: 'while_enabled',
  shortagePolicy: 'ignore',
  arrears: [],
});

interface WorldOptions {
  readonly balance: number;
  readonly paused?: readonly number[];
  readonly withTags?: boolean;
  readonly incomeRate?: number;
  readonly satisfaction?: number;
}

const makeWorld = (registry: Registry, options: WorldOptions): World => {
  const result = createWorld(registry, {
    seed: [1, 2],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
  });
  if (!result.ok) throw new Error('createWorld returned an error');
  const world = result.value;
  const ownerState: OwnerState = {
    handle: OWNER,
    knowledge: [],
    accounts: [{ resource: CREDITS, amount: options.balance }],
    purposeLocks: [],
    unlocks: [],
    deficitPaused: (options.paused ?? []).map((value) => entityId(value)),
  };
  world.owners = { owners: [ownerState] };

  const addMaintained = (entity: number, due: number, withTag = false): void => {
    const id = entityId(entity);
    stores(world).get<{ owner: OwnerHandle }>('owner').set(id, { owner: OWNER });
    stores(world)
      .get<{ definition: number }>('definition')
      .set(id, { definition: withTag ? definitionHandle(41) : definitionHandle(40) });
    stores(world).get<Maintenance>('maintenance').set(id, maintenanceOf(due));
  };
  addMaintained(2, 500, options.withTags === true);
  addMaintained(3, 100);

  stores(world).get<{ owner: OwnerHandle }>('owner').set(RESIDENCE, { owner: OWNER });
  stores(world)
    .get('residence')
    .set(RESIDENCE, {
      tier: definitionHandle(1),
      capacity: 10,
      location: null,
      growthPolicy: null,
      consumptionFactor: 1000,
      outputs: [
        {
          resource: CREDITS,
          ratePerPopulationPerTick: options.incomeRate ?? 10,
          scope: 'owner',
          satisfactionCurve: CURVE,
        },
      ],
    });
  stores(world)
    .get('populationGroup')
    .set(RESIDENCE, { tier: definitionHandle(1), count: 1, capacity: 10 });
  stores(world)
    .get<Satisfaction>('satisfaction')
    .set(RESIDENCE, { z: options.satisfaction ?? 1000, categories: [] });
  return world;
};

const pausedOf = (world: World): readonly number[] =>
  (world.owners.owners[0]?.deficitPaused ?? []).map((entity) => entity as number);

const run27 = (world: World, registry: Registry) => runPhases(world, registry, [27], input);

describe('[GDD-20.3] deficit pause', () => {
  it('[GDD-20.3] pauses the highest maintenance payer first until the net rate is non-negative', () => {
    const registry = makeRegistry();
    const world = makeWorld(registry, { balance: -1, incomeRate: 10 });
    const output = run27(world, registry);
    expect(pausedOf(world)).toEqual([2]);
    expect(output.events.map((event) => event.type)).toEqual(['DeficitPaused']);
    expect(output.events[0]?.subjects).toEqual([entityId(2)]);
  });

  it('[GDD-20.3] pauses nothing when the net rate already holds', () => {
    const registry = makeRegistry();
    const world = makeWorld(registry, { balance: -1, incomeRate: 100 });
    const output = run27(world, registry);
    expect(pausedOf(world)).toEqual([]);
    expect(output.events).toEqual([]);
  });

  it('[GDD-20.3] pausing continues while expenses exceed income', () => {
    const registry = makeRegistry();
    const world = makeWorld(registry, { balance: -1, incomeRate: 1, satisfaction: 0 });
    run27(world, registry);
    expect(pausedOf(world)).toEqual([2, 3]);
  });

  it('[CONT-6.22] an excluded entity is never paused', () => {
    const registry = makeRegistry({ excludeTags: ['test.tag.hub'] });
    const world = makeWorld(registry, {
      balance: -1,
      incomeRate: 1,
      satisfaction: 0,
      withTags: true,
    });
    run27(world, registry);
    expect(pausedOf(world)).not.toContain(2);
    expect(pausedOf(world)).toEqual([3]);
  });

  it('[GDD-20.3] an entity already paused is not paused twice', () => {
    const registry = makeRegistry();
    const world = makeWorld(registry, {
      balance: -1,
      incomeRate: 1,
      satisfaction: 0,
      paused: [2, 3],
    });
    const output = run27(world, registry);
    expect(pausedOf(world)).toEqual([2, 3]);
    expect(output.events).toEqual([]);
  });
});

describe('[GDD-20.3] deficit resume', () => {
  it('[GDD-20.3] automatic resume restores entities in reverse order', () => {
    const registry = makeRegistry();
    const world = makeWorld(registry, { balance: 5, paused: [2, 3] });
    const output = run27(world, registry);
    expect(pausedOf(world)).toEqual([]);
    const resumed = output.events.filter((event) => event.type === 'DeficitResumed');
    expect(resumed.map((event) => event.subjects[0])).toEqual([entityId(3), entityId(2)]);
  });

  it('[GDD-20.3] manual resume never happens automatically', () => {
    const registry = makeRegistry({ resumePolicy: 'manual' });
    const world = makeWorld(registry, { balance: 5, paused: [2, 3] });
    const output = run27(world, registry);
    expect(pausedOf(world)).toEqual([2, 3]);
    expect(output.events).toEqual([]);
  });

  it('[GDD-20.3] the trigger holds only below the configured value', () => {
    const registry = makeRegistry();
    const world = makeWorld(registry, { balance: 0, paused: [] });
    const output = run27(world, registry);
    expect(pausedOf(world)).toEqual([]);
    expect(output.events).toEqual([]);
  });
});

describe('[GDD-20.3] net rate helpers', () => {
  it('[GDD-20.3] expense per tick floors the interval division', () => {
    expect(mulDiv(500, 1, 10, 'floor')).toBe(50);
    expect(mulDiv(505, 1, 10, 'floor')).toBe(50);
  });

  it('[GDD-20.3] paused entities pay no expense per tick', () => {
    const registry = makeRegistry();
    const world = makeWorld(registry, { balance: -1, incomeRate: 10, paused: [2] });
    run27(world, registry);
    expect(pausedOf(world)).toEqual([2]);
  });
});
