/**
 * Unit tests for the tier-transition engine (GDD-13, CONT-6.15): the
 * `RequestPopulationTransition` command, cost payment, conversion, refunds,
 * decline triggers, and empty-residence policies.
 *
 * Source: GDD-13, CONT-6.15
 */
import { describe, expect, it } from 'vitest';

import { createWorld } from '../../world/create.js';
import { createEmptyRegistry } from '../../registry/types.js';
import { definitionHandle, entityId, ownerHandle, stringId, tick } from '../../ids/index.js';
import { runPhases, runSystem, stores } from '../../testing.js';
import type { Registry } from '../../registry/types.js';
import type { World } from '../../world/types.js';
import type { ScheduledCommand } from '../../world/types.js';
import type { Inventory } from '../../tx/inventory.js';
import type { Residence } from '../population/types.js';
import type { RunningTransition } from './types.js';
import { phase01ApplyCommands } from '../../systems/phase-01-apply-commands.js';

const TIER_A = definitionHandle(1);
const TIER_B = definitionHandle(2);
const TRANSITION = definitionHandle(3);
const GOLD = definitionHandle(4);
const RESIDENCE_B = definitionHandle(5);
const DECLINE = definitionHandle(6);
const REVERT_DEF = definitionHandle(7);

const transitionData = {
  id: 'test.transition.up',
  source_tier: 'test.tier.a',
  target_tier: 'test.tier.b',
  trigger: 'manual_command',
  condition: 'test.condition.ready',
  costs: [{ resource: 'test.resource.gold', quantity: 100 }],
  cost_source: 'location_inventory',
  cost_access_purpose: 'population_transition',
  refund_policy: { policy: 'fraction', fraction: 500 },
  duration_ticks: 2,
  conversion: {
    population: 'retain_count_clamped',
    entity_definition: 'test.entity.res2',
  },
};

const declineData = {
  id: 'test.transition.down',
  source_tier: 'test.tier.b',
  target_tier: 'test.tier.a',
  trigger: 'manual_command',
  refund_policy: { policy: 'none' },
  duration_ticks: 0,
  conversion: { population: 'clamp_to_target_capacity', entity_definition: 'test.entity.res1' },
};

const tierData = (id: string): Record<string, unknown> => ({
  id,
  consumption_factor: 1000,
  need_categories: [],
  outputs: [],
});

const residenceDefData = (tier: string, capacity: number): Record<string, unknown> => ({
  id: `test.entity.${tier}`,
  components: {
    residence: {
      population_tier: tier,
      capacity,
      growth_policy: 'test.growth.default',
      ...(tier === 'test.tier.a'
        ? { empty_residence: { policy: 'revert', definition: 'test.entity.revert' } }
        : {}),
    },
  },
});

const registry: Registry = {
  ...createEmptyRegistry(),
  stringIdOf: (type, handle) =>
    type === 'transition' && handle === TRANSITION
      ? stringId('test.transition.up')
      : type === 'transition' && handle === DECLINE
        ? stringId('test.transition.down')
        : type === 'tier' && handle === TIER_A
          ? stringId('test.tier.a')
          : type === 'tier' && handle === TIER_B
            ? stringId('test.tier.b')
            : type === 'resource' && handle === GOLD
              ? stringId('test.resource.gold')
              : type === 'entity' && handle === RESIDENCE_B
                ? stringId('test.entity.res2')
                : type === 'entity' && handle === REVERT_DEF
                  ? stringId('test.entity.revert')
                  : type === 'condition' && handle === definitionHandle(8)
                    ? stringId('test.condition.ready')
                    : null,
  handleOf: (type, id) =>
    type === 'transition' && id === stringId('test.transition.up')
      ? TRANSITION
      : type === 'transition' && id === stringId('test.transition.down')
        ? DECLINE
        : type === 'tier' && id === stringId('test.tier.a')
          ? TIER_A
          : type === 'tier' && id === stringId('test.tier.b')
            ? TIER_B
            : type === 'resource' && id === stringId('test.resource.gold')
              ? GOLD
              : type === 'entity' && id === stringId('test.entity.res2')
                ? RESIDENCE_B
                : type === 'entity' && id === stringId('test.entity.revert')
                  ? REVERT_DEF
                  : type === 'condition' && id === stringId('test.condition.ready')
                    ? definitionHandle(8)
                    : null,
  handlesOf: (type) =>
    type === 'transition' ? [TRANSITION, DECLINE] : type === 'tier' ? [TIER_A, TIER_B] : [],
  definitionDataOf: (type, handle) => {
    if (type === 'transition' && handle === TRANSITION) return transitionData;
    if (type === 'transition' && handle === DECLINE) return declineData;
    if (type === 'tier' && handle === TIER_A) return tierData('test.tier.a') as never;
    if (type === 'tier' && handle === TIER_B)
      return { ...tierData('test.tier.b'), decline_transitions: ['test.transition.down'] };
    if (type === 'entity' && handle === RESIDENCE_B)
      return residenceDefData('test.tier.b', 20) as never;
    if (type === 'entity' && handle === REVERT_DEF)
      return residenceDefData('test.tier.a', 10) as never;
    return null;
  },
};

const makeWorld = (): World => {
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
        handle: ownerHandle(0),
        knowledge: [],
        accounts: [],
        purposeLocks: [],
        unlocks: [],
        deficitPaused: [],
      },
    ],
  };
  stores(world)
    .get<{ active: boolean; owner: number }>('location')
    .set(entityId(1), { active: true, owner: 0 });
  return world;
};

const setResidence = (world: World, tier = TIER_A, capacity = 10, count = 8): void => {
  const residence: Residence = {
    tier,
    capacity,
    location: entityId(1),
    growthPolicy: null,
    consumptionFactor: 1000,
    outputs: [],
    needs: [],
    categories: [],
    satisfactionAggregation: 'average',
  };
  stores(world).get('residence').set(entityId(1), residence);
  stores(world).get('populationGroup').set(entityId(1), { tier, count, capacity });
  stores(world).get('definition').set(entityId(1), { definition: REVERT_DEF });
};

const setGold = (world: World, quantity: number): void => {
  stores(world)
    .get<Inventory>('inventory')
    .set(entityId(2), {
      owner: ownerHandle(0),
      policy: 'framework.inventory.shared_location',
      revision: 0,
      entries: [{ resource: GOLD, quantity }],
      capacity: { total: null, perResource: null },
      acceptance: { accepts: [] },
    });
  stores(world)
    .get<{ inventories: readonly number[] }>('locationHub')
    .set(entityId(1), { inventories: [entityId(2)] });
};

const command = (transition: number): ScheduledCommand => ({
  commandId: 'c1',
  actor: ownerHandle(0),
  tick: tick(1),
  seq: 1,
  command: {
    type: 'RequestPopulationTransition',
    entity: entityId(1),
    transition: definitionHandle(transition),
  },
});

const submit = (world: World, scheduled: ScheduledCommand, eligible = true) => {
  world.commandQueue = [scheduled];
  return runSystem(phase01ApplyCommands, world, registry, {
    commands: [scheduled],
    options: { journal: false, hash: false },
    conditionEvaluator: () => eligible,
  });
};

const step = (world: World, eligible = true) =>
  runPhases(world, registry, [24], {
    commands: [],
    options: { journal: false, hash: false },
    conditionEvaluator: () => eligible,
  });

describe('[GDD-13][GDD-13.1][CONT-6.15] RequestPopulationTransition', () => {
  it('[GDD-13.1] an eligible transition starts and pays its costs', () => {
    const world = makeWorld();
    setResidence(world);
    setGold(world, 500);
    const output = submit(world, command(3));
    expect(output.outcomes[0]?.status).toBe('applied');
    expect(stores(world).get<Inventory>('inventory').get(entityId(2))?.entries[0]?.quantity).toBe(
      400,
    );
    const running = stores(world).get<RunningTransition>('transition').get(entityId(1));
    expect(running?.transition).toBe(TRANSITION);
    expect(running?.completesAt).toBe(3);
  });

  it('[GDD-13.1] a non-residence is rejected', () => {
    const world = makeWorld();
    const output = submit(world, command(3));
    expect(output.outcomes[0]?.status).toBe('rejected');
    if (output.outcomes[0]?.status === 'rejected') {
      expect(output.outcomes[0].errors[0]?.code).toBe('unknown_entity');
    }
  });

  it('[GDD-13.1] a source-tier mismatch is rejected', () => {
    const world = makeWorld();
    setResidence(world, TIER_B);
    setGold(world, 500);
    const output = submit(world, command(3));
    expect(output.outcomes[0]?.status).toBe('rejected');
    if (output.outcomes[0]?.status === 'rejected') {
      expect(output.outcomes[0].errors[0]?.code).toBe('invalid_transition');
    }
  });

  it('[GDD-13.1] a false condition is rejected as not eligible', () => {
    const world = makeWorld();
    setResidence(world);
    setGold(world, 500);
    const output = submit(world, command(3), false);
    expect(output.outcomes[0]?.status).toBe('rejected');
    if (output.outcomes[0]?.status === 'rejected') {
      expect(output.outcomes[0].errors[0]?.code).toBe('not_eligible');
    }
  });

  it('[GDD-13.1] insufficient cost is rejected', () => {
    const world = makeWorld();
    setResidence(world);
    setGold(world, 50);
    const output = submit(world, command(3));
    expect(output.outcomes[0]?.status).toBe('rejected');
    if (output.outcomes[0]?.status === 'rejected') {
      expect(output.outcomes[0].errors[0]?.code).toBe('insufficient_quantity');
    }
  });
});

describe('[GDD-13][GDD-13.3][CONT-6.15] completion and conversion', () => {
  it('[GDD-13.3] completion replaces the tier and clamps the population', () => {
    const world = makeWorld();
    setResidence(world, TIER_A, 10, 25);
    setGold(world, 500);
    submit(world, command(3));
    step(world);
    step(world);
    const group = stores(world)
      .get<{ tier: number; capacity: number; count: number }>('populationGroup')
      .get(entityId(1));
    expect(group?.tier).toBe(TIER_B);
    expect(group?.capacity).toBe(20);
    expect(group?.count).toBe(20);
    expect(stores(world).get('residence').get(entityId(1))).toMatchObject({
      tier: TIER_B,
      capacity: 20,
    });
    expect(stores(world).get<RunningTransition>('transition').get(entityId(1))).toBeUndefined();
  });

  it('[GDD-13.3] a fraction refund is deposited at completion', () => {
    const world = makeWorld();
    setResidence(world);
    setGold(world, 500);
    submit(world, command(3));
    step(world);
    step(world);
    expect(stores(world).get<Inventory>('inventory').get(entityId(2))?.entries[0]?.quantity).toBe(
      450,
    );
  });
});

describe('[GDD-13][GDD-13.4][CONT-6.15] decline and empty residences', () => {
  it('[GDD-13.4] the band grace timer starts the tier decline transition', () => {
    const world = makeWorld();
    setResidence(world, TIER_B, 20, 5);
    setGold(world, 500);
    stores(world)
      .get('bandState')
      .set(entityId(1), {
        band: definitionHandle(9),
        bandIndex: 0,
        declineTicks: 2,
        advancementEnabled: false,
        growthOverride: null,
        outputMultipliers: [],
        declineGraceTicks: 2,
        declineTransition: null,
      });
    step(world);
    expect(stores(world).get<RunningTransition>('transition').get(entityId(1))?.transition).toBe(
      DECLINE,
    );
  });

  it('[GDD-9.3] an empty residence reverts to the configured definition', () => {
    const world = makeWorld();
    setResidence(world, TIER_A, 10, 0);
    step(world);
    expect(
      stores(world).get<{ definition: number }>('definition').get(entityId(1))?.definition,
    ).toBe(REVERT_DEF);
    expect(stores(world).get('residence').get(entityId(1))).toMatchObject({
      tier: TIER_A,
      capacity: 10,
    });
  });
});
