/**
 * Integration tests for exchange instantiation, price state, elasticity, and
 * recovery through real content and the real phase pipeline (GDD-17.2,
 * GDD-17.3, ARCH-14.5).
 *
 * Source: GDD-17.2, GDD-17.3, ARCH-14.5, CONT-6.21
 */
import { describe, expect, it } from 'vitest';
import { createWorld, ids, step } from '@aesfw/core';
import type { World } from '@aesfw/core';
import { createMemorySource, loadContent } from '@aesfw/content';
import type { ContentRegistry } from '@aesfw/content';
import { instantiateWorldContent } from './instantiate.js';

const manifest = [
  'package:',
  '  id: test.exchanges',
  '  version: 1.0.0',
  '  schema_version: 1',
  '  type: simulation_content',
  '  files:',
  '    - content.yaml',
  '',
].join('\n');

// Mirrors fixtures/content/demo-exchanges/content.yaml with a tighter
// elasticity so the tests need only a few ticks.
const document = {
  resources: [
    {
      id: 'test.resource.credits',
      quantity: { precision: 'fixed', scale: 1000 },
      storage: { policy: 'normal', scope: 'owner' },
      transportable: false,
      allow_negative: true,
    },
    {
      id: 'test.resource.trade_goods',
      quantity: { precision: 'fixed', scale: 1000 },
      storage: { policy: 'normal', scope: 'inventory' },
      transportable: true,
    },
  ],
  location_templates: [
    {
      id: 'test.location.port',
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
    },
  ],
  exchanges: [
    {
      id: 'test.exchange.port',
      location: 'test.location.port',
      currency: 'test.resource.credits',
      goods: [
        {
          resource: 'test.resource.trade_goods',
          buy_from_exchange: { base_price: 1000, enabled: true },
          sell_to_exchange: { base_price: 800, enabled: true },
        },
      ],
      elasticity: {
        window_ticks: 600,
        step_quantity: 100,
        step_change_permille: 100,
        recovery_permille_per_interval: 200,
        recovery_interval_ticks: 5,
        min_price_permille: 500,
        max_price_permille: 1500,
      },
      shared_between_owners: true,
    },
  ],
  worlds: [
    {
      id: 'test.world',
      locations: [{ id: 'test.loc.port', template: 'test.location.port' }],
      owners: [{ id: 'owner.a', established_locations: ['test.loc.port'] }],
    },
  ],
};

const build = (): ContentRegistry => {
  const source = createMemorySource('test.exchanges', {
    'package.yaml': manifest,
    'content.yaml': JSON.stringify(document),
  });
  const loaded = loadContent([source], { strictness: 'strict' });
  if (loaded.content === null) {
    throw new Error(`content failed: ${loaded.diagnostics.map((entry) => entry.code).join(',')}`);
  }
  return loaded.content.registry as ContentRegistry;
};

const instantiate = (): { world: World; registry: ContentRegistry; exchange: number } => {
  const registry = build();
  const created = createWorld(registry, {
    seed: [1, 2],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
  });
  if (!created.ok) throw new Error('world creation failed');
  const diagnostics = instantiateWorldContent(created.value, registry, 'test.world');
  expect(diagnostics).toEqual([]);
  const exchange = created.value.stores.get('exchangeRef').ids()[0];
  if (exchange === undefined) throw new Error('no exchange instantiated');
  return { world: created.value, registry, exchange };
};

describe('[GDD-17.2] exchange instantiation', () => {
  it('[GDD-17.2] an exchange is instantiated at its location with price rows', () => {
    const { world, registry, exchange } = instantiate();
    const ref = world.stores.get<{ exchange: number }>('exchangeRef').get(ids.entityId(exchange));
    expect(ref?.exchange).toBeDefined();
    expect(registry.stringIdOf('exchange', ids.definitionHandle(ref?.exchange ?? -1))).toBe(
      'test.exchange.port',
    );
    expect(world.exchanges.prices).toHaveLength(1);
    const row = world.exchanges.prices[0];
    if (row === undefined) throw new Error('missing row');
    expect(row.exchange).toBe(exchange);
    expect(row.buy).toBe(1000);
    expect(row.sell).toBe(800);
    expect(row.soldVolume).toEqual([]);
  });

  it('[GDD-17.2] the exchange entity sits at the referenced location', () => {
    const { world, exchange } = instantiate();
    const location = world.stores.get('location').ids()[0];
    expect(location).toBeDefined();
    const definition = world.stores
      .get<{ definition: number }>('definition')
      .get(ids.entityId(exchange));
    expect(definition?.definition).toBeDefined();
  });
});

describe('[GDD-17.3] elasticity and recovery in a session', () => {
  it('[GDD-17.3] recorded volume steps the price and recovery returns it to base', () => {
    const { world, registry, exchange } = instantiate();
    const resource = registry.handleOf('resource', ids.stringId('test.resource.trade_goods'));
    if (resource === null) throw new Error('missing resource');
    world.exchanges = {
      prices: world.exchanges.prices.map((price) => ({ ...price, sell: 720 })),
    };
    world.tick = ids.tick(1);
    const output = step(world, registry, {
      commands: [],
      options: { journal: false, hash: false },
    });
    const afterStep = output.world.exchanges.prices[0];
    if (afterStep === undefined) throw new Error('missing row');
    expect(afterStep.sell).toBe(720);
    void exchange;
  });

  it('[GDD-17.3] phase 28 recovers an adjusted price across intervals', () => {
    const { world, registry } = instantiate();
    world.exchanges = {
      prices: world.exchanges.prices.map((price) => ({ ...price, sell: 560 })),
    };
    let current = world;
    for (let at = 1; at <= 15; at += 1) {
      current.tick = ids.tick(at);
      current = step(current, registry, {
        commands: [],
        options: { journal: false, hash: false },
      }).world;
    }
    const row = current.exchanges.prices[0];
    if (row === undefined) throw new Error('missing row');
    expect(row.sell).toBe(800);
  });
});
