import { describe, expect, it } from 'vitest';
import { ids, instantiateWorld } from '@aesfw/core';
import type { Producer } from '@aesfw/core';
import { defaultWorldPlan } from '@aesfw/content';
import type { ContentRegistry } from '@aesfw/content';
import {
  advance,
  createSession,
  instantiateContentEntities,
  needBreakdown,
  submitCommand,
} from '@aesfw/app';
import type { SessionState } from '@aesfw/app';
import { content, expectContentOk } from '../harness/content-builder.js';

const buildContent = () => {
  const built = content()
    .package('test.disable')
    .define('resources', {
      id: 'test.resource.source',
      tags: ['storable'],
      quantity: { precision: 'fixed', scale: 1000 },
      storage: { policy: 'normal', scope: 'inventory' },
      transportable: true,
    })
    .define('resources', {
      id: 'test.resource.need',
      tags: ['storable'],
      quantity: { precision: 'fixed', scale: 1000 },
      storage: { policy: 'normal', scope: 'inventory' },
      transportable: true,
    })
    .define('resources', {
      id: 'test.capability.tier_1',
      tags: ['virtual', 'capability'],
      quantity: { precision: 'integer', scale: 1 },
      storage: { policy: 'recomputed', scope: 'location' },
      transportable: false,
    })
    .define('location_templates', {
      id: 'test.location.a',
      spatial_policy: 'framework.spatial.abstract_capacity',
      spatial_parameters: { total_capacity: 100 },
      inventories: [
        {
          id: 'shared',
          capacity: { mode: 'total', quantity: 1000000 },
          access_policy: 'framework.inventory.shared_location',
        },
      ],
      activation: { initial: true },
    })
    .define('recipes', {
      id: 'test.recipe.need',
      mode: 'batch',
      duration_ticks: 10,
      inputs: [{ resource: 'test.resource.source', quantity: 1000 }],
      outputs: [{ resource: 'test.resource.need', quantity: 1100 }],
      capability_requirements: [{ resource: 'test.capability.tier_1', quantity: 1 }],
    })
    .define('population_tiers', {
      id: 'test.population.tier_1',
      consumption_factor: 1000,
      need_categories: ['test.need_category.base'],
      outputs: [
        { resource: 'test.capability.tier_1', scope: 'location', rate_per_population_per_tick: 1 },
      ],
    })
    .define('need_categories', {
      id: 'test.need_category.base',
      evaluation: { mode: 'all' },
      members: [{ need: 'test.need.base', weight: 1000 }],
    })
    .define('needs', {
      id: 'test.need.base',
      category: 'test.need_category.base',
      applies_to: ['test.population.tier_1'],
      demand: {
        type: 'resource_consumption',
        resource: 'test.resource.need',
        quantity_per_population_per_tick: 10,
      },
      fulfillment: { measurement_window_ticks: 10, target_ratio: 1000 },
    })
    .define('growth_policies', {
      id: 'test.growth.default',
      interval_ticks: 10,
      increase: { quantity: 1, condition: 'test.condition.grow' },
    })
    .define('conditions', {
      id: 'test.condition.grow',
      expression: {
        greater_equal: { left: { aggregate_need_fulfillment: 'current_entity' }, right: 800 },
      },
    })
    .define('entity_definitions', {
      id: 'test.entity.source',
      components: {
        resource_source: {
          policy: 'infinite_rate',
          outputs: [{ resource: 'test.resource.source', quantity_per_tick: 1000 }],
        },
      },
    })
    .define('entity_definitions', {
      id: 'test.entity.producer',
      components: {
        producer: {
          recipes: ['test.recipe.need'],
          process_slots: 1,
          input_inventory: 'location.shared',
          output_inventory: 'location.shared',
        },
      },
    })
    .define('entity_definitions', {
      id: 'test.entity.residence',
      components: {
        residence: {
          population_tier: 'test.population.tier_1',
          capacity: 10,
          initial_population: 10,
          growth_policy: 'test.growth.default',
        },
      },
    })
    .build();
  return expectContentOk(built);
};

const session = (): SessionState => {
  const compiled = buildContent();
  const created = createSession(compiled, {
    sessionId: 'session.1',
    seed: [1, 2],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
    hashInterval: 0,
    journal: false,
    actor: ids.ownerHandle(0),
    actorId: 'test.owner.1',
    fog: false,
  });
  if (!created.ok) throw new Error('session creation failed');
  const state = created.value;
  const registry = compiled.registry as ContentRegistry;
  instantiateWorld(state.world, defaultWorldPlan(registry).plan);
  instantiateContentEntities(state.world, registry);
  return state;
};

describe('[GDD-10.3][GDD-12.4] disabling a producer lowers satisfaction', () => {
  it('[GDD-10.3] a disabled producer blocks and fulfillment falls', () => {
    let state = session();
    const producerId = state.world.stores.get('producer').ids()[0];
    const residenceId = state.world.stores.get('residence').ids()[0];
    expect(producerId).toBeDefined();
    expect(residenceId).toBeDefined();
    if (producerId === undefined || residenceId === undefined) return;

    state = advance(state, 300).session;
    const before = needBreakdown(state, ids.ownerHandle(0), residenceId)[0]?.fulfillment ?? 0;
    expect(before).toBeGreaterThan(0);

    const submitted = submitCommand(state, {
      command_id: 'c1',
      actor_id: 'test.owner.1',
      type: 'SetEntityEnabled',
      payload: { entity_id: producerId, enabled: false },
    });
    state = advance(submitted.session, 200).session;

    const producer = state.world.stores.get<Producer>('producer').get(producerId);
    expect(producer?.blockReasons).toContain('entity_disabled');
    const after = needBreakdown(state, ids.ownerHandle(0), residenceId)[0]?.fulfillment ?? 0;
    expect(after).toBeLessThan(before);
  });
});
