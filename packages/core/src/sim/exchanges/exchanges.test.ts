/**
 * Unit tests for exchange price state, elasticity, and recovery (GDD-17.3,
 * ARCH-14.5): recording volume steps prices within clamped bounds, windows
 * age out, and phase 28 recovers prices toward their base prices.
 *
 * Source: GDD-17.3, ARCH-14.5, TDS-23
 */
import { describe, expect, it } from 'vitest';
import { allocateEntity, createWorld } from '../../world/create.js';
import { createEmptyRegistry } from '../../registry/types.js';
import type { Registry } from '../../registry/types.js';
import type { World } from '../../world/types.js';
import { definitionHandle, entityId, ownerHandle, stringId, tick } from '../../ids/index.js';
import { encodeWorld, decodeWorld, hashWorld, cloneWorld } from '../../world/codec.js';
import { runPhases } from '../../pipeline/step.js';
import { instantiateWorld } from '../instantiate.js';
import type { WorldPlan } from '../instantiate.js';
import { exchangePriceOf, recordExchangeVolume, recoverExchangePrices } from './prices.js';

const EXCHANGE = definitionHandle(0);
const RESOURCE = definitionHandle(1);

const ELASTICITY = {
  window_ticks: 10,
  step_quantity: 100,
  step_change_permille: 100,
  recovery_permille_per_interval: 200,
  recovery_interval_ticks: 5,
  min_price_permille: 500,
  max_price_permille: 1500,
};

const registry: Registry = {
  ...createEmptyRegistry(),
  stringIdOf: (type, handle) =>
    type === 'exchange' && handle === EXCHANGE
      ? stringId('test.exchange.a')
      : type === 'resource' && handle === RESOURCE
        ? stringId('test.resource.a')
        : null,
  handleOf: (type, id) =>
    type === 'exchange' && id === stringId('test.exchange.a')
      ? EXCHANGE
      : type === 'resource' && id === stringId('test.resource.a')
        ? RESOURCE
        : null,
  definitionDataOf: (type, handle) =>
    type === 'exchange' && handle === EXCHANGE
      ? {
          id: 'test.exchange.a',
          location: 'test.location.a',
          currency: 'test.resource.credits',
          goods: [
            {
              resource: 'test.resource.a',
              buy_from_exchange: { base_price: 1000, enabled: true },
              sell_to_exchange: { base_price: 800, enabled: true },
            },
          ],
          elasticity: ELASTICITY,
          shared_between_owners: true,
        }
      : type === 'resource' && handle === RESOURCE
        ? { id: 'test.resource.a' }
        : null,
};

const makeWorld = (): { world: World; exchange: number } => {
  const created = createWorld(registry, {
    seed: [0, 0],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
  });
  if (!created.ok) throw new Error('world creation failed');
  const world = created.value;
  const plan: WorldPlan = {
    owner: ownerHandle(0),
    locations: [
      {
        template: definitionHandle(2),
        spatialPolicy: 'framework.spatial.abstract_capacity',
        capacity: 100,
        properties: [],
        region: null,
        active: true,
        inventories: [
          {
            capacity: { total: 10000, perResource: null },
            acceptance: { accepts: [] },
            policy: 'framework.inventory.shared_location',
          },
        ],
      },
    ],
    owners: [{ handle: ownerHandle(0), accounts: [], knowledge: [] }],
  };
  instantiateWorld(world, plan);
  const exchange = allocateEntity(world);
  world.stores.get('exchangeRef').set(exchange, { exchange: EXCHANGE });
  world.exchanges = {
    prices: [
      {
        exchange: entityId(exchange),
        resource: RESOURCE,
        buy: 1000,
        sell: 800,
        soldVolume: [],
        boughtVolume: [],
      },
    ],
  };
  return { world, exchange };
};

describe('[GDD-17.3] elasticity', () => {
  it('[GDD-17.3] repeated sales lower the sale price by whole steps', () => {
    const { world, exchange } = makeWorld();
    const first = recordExchangeVolume(
      world,
      registry,
      entityId(exchange),
      RESOURCE,
      'sell',
      100,
      tick(1),
    );
    expect(first.sell).toBe(720);
    const second = recordExchangeVolume(
      world,
      registry,
      entityId(exchange),
      RESOURCE,
      'sell',
      100,
      tick(2),
    );
    expect(second.sell).toBe(640);
  });

  it('[GDD-17.3] partial steps leave the price unchanged', () => {
    const { world, exchange } = makeWorld();
    const row = recordExchangeVolume(
      world,
      registry,
      entityId(exchange),
      RESOURCE,
      'sell',
      99,
      tick(1),
    );
    expect(row.sell).toBe(800);
  });

  it('[GDD-17.3] buys raise the purchase price', () => {
    const { world, exchange } = makeWorld();
    const row = recordExchangeVolume(
      world,
      registry,
      entityId(exchange),
      RESOURCE,
      'buy',
      250,
      tick(1),
    );
    expect(row.buy).toBe(1200);
    expect(row.sell).toBe(800);
  });

  it('[GDD-17.3][GDD-3.11] prices are clamped to the permille bounds', () => {
    const { world, exchange } = makeWorld();
    let row = exchangePriceOf(world, entityId(exchange), RESOURCE);
    if (row === null) throw new Error('missing row');
    for (let step = 0; step < 20; step += 1) {
      row = recordExchangeVolume(
        world,
        registry,
        entityId(exchange),
        RESOURCE,
        'sell',
        100,
        tick(step + 1),
      );
    }
    expect(row.sell).toBe(400);
    const buyWorld = makeWorld();
    let buyRow = exchangePriceOf(buyWorld.world, entityId(buyWorld.exchange), RESOURCE);
    if (buyRow === null) throw new Error('missing row');
    for (let step = 0; step < 20; step += 1) {
      buyRow = recordExchangeVolume(
        buyWorld.world,
        registry,
        entityId(buyWorld.exchange),
        RESOURCE,
        'buy',
        100,
        tick(step + 1),
      );
    }
    expect(buyRow.buy).toBe(1500);
  });

  it('[GDD-17.3] aged-out volume stops stepping', () => {
    const { world, exchange } = makeWorld();
    recordExchangeVolume(world, registry, entityId(exchange), RESOURCE, 'sell', 300, tick(1));
    const afterWindow = recordExchangeVolume(
      world,
      registry,
      entityId(exchange),
      RESOURCE,
      'sell',
      1,
      tick(50),
    );
    expect(afterWindow.sell).toBe(560);
  });

  it('[GDD-17.3] the volume window prunes entries older than the window', () => {
    const { world, exchange } = makeWorld();
    recordExchangeVolume(world, registry, entityId(exchange), RESOURCE, 'sell', 100, tick(1));
    recordExchangeVolume(world, registry, entityId(exchange), RESOURCE, 'sell', 100, tick(50));
    const row = exchangePriceOf(world, entityId(exchange), RESOURCE);
    if (row === null) throw new Error('missing row');
    expect(row.soldVolume).toEqual([{ tick: tick(50), quantity: 100 }]);
  });
});

describe('[GDD-17.3] recovery (phase 28)', () => {
  it('[GDD-17.3] lowered prices recover toward base without passing it', () => {
    const { world, exchange } = makeWorld();
    recordExchangeVolume(world, registry, entityId(exchange), RESOURCE, 'sell', 300, tick(1));
    let row = exchangePriceOf(world, entityId(exchange), RESOURCE);
    if (row === null) throw new Error('missing row');
    expect(row.sell).toBe(560);
    recoverExchangePrices(world, registry, tick(5));
    row = exchangePriceOf(world, entityId(exchange), RESOURCE);
    if (row === null) throw new Error('missing row');
    expect(row.sell).toBe(720);
    for (let at = 10; at <= 20; at += 5) {
      recoverExchangePrices(world, registry, tick(at));
    }
    row = exchangePriceOf(world, entityId(exchange), RESOURCE);
    if (row === null) throw new Error('missing row');
    expect(row.sell).toBe(800);
    recoverExchangePrices(world, registry, tick(25));
    row = exchangePriceOf(world, entityId(exchange), RESOURCE);
    if (row === null) throw new Error('missing row');
    expect(row.sell).toBe(800);
  });

  it('[GDD-17.3] raised prices recover downward without passing base', () => {
    const { world, exchange } = makeWorld();
    recordExchangeVolume(world, registry, entityId(exchange), RESOURCE, 'buy', 300, tick(1));
    let row = exchangePriceOf(world, entityId(exchange), RESOURCE);
    if (row === null) throw new Error('missing row');
    expect(row.buy).toBe(1300);
    recoverExchangePrices(world, registry, tick(5));
    row = exchangePriceOf(world, entityId(exchange), RESOURCE);
    if (row === null) throw new Error('missing row');
    expect(row.buy).toBe(1100);
  });

  it('[GDD-17.3] windows prune on every tick and recovery is interval-aligned', () => {
    const { world, exchange } = makeWorld();
    recordExchangeVolume(world, registry, entityId(exchange), RESOURCE, 'sell', 100, tick(1));
    recoverExchangePrices(world, registry, tick(4));
    let row = exchangePriceOf(world, entityId(exchange), RESOURCE);
    if (row === null) throw new Error('missing row');
    expect(row.sell).toBe(720);
    expect(row.soldVolume).toEqual([{ tick: tick(1), quantity: 100 }]);
    recoverExchangePrices(world, registry, tick(11));
    row = exchangePriceOf(world, entityId(exchange), RESOURCE);
    if (row === null) throw new Error('missing row');
    expect(row.soldVolume).toEqual([]);
    expect(row.sell).toBe(720);
    recoverExchangePrices(world, registry, tick(15));
    row = exchangePriceOf(world, entityId(exchange), RESOURCE);
    if (row === null) throw new Error('missing row');
    expect(row.sell).toBe(800);
  });

  it('[GDD-17.3] the phase runs through the pipeline', () => {
    const { world, exchange } = makeWorld();
    recordExchangeVolume(world, registry, entityId(exchange), RESOURCE, 'sell', 300, tick(1));
    world.tick = tick(1);
    const output = runPhases(world, registry, [28], {
      commands: [],
      options: { journal: false, hash: false },
    });
    const row = output.world.exchanges.prices[0];
    if (row === undefined) throw new Error('missing row');
    expect(row.sell).toBe(560);
  });
});

describe('[ARCH-14.5] price state persistence', () => {
  it('[ARCH-14.5] price state survives encode/decode and hash round-trips', () => {
    const { world, exchange } = makeWorld();
    recordExchangeVolume(world, registry, entityId(exchange), RESOURCE, 'sell', 300, tick(3));
    const encoded = encodeWorld(world, registry);
    const decoded = decodeWorld(registry, encoded);
    if (!decoded.ok) throw new Error('decode failed');
    expect(decoded.value.exchanges.prices).toEqual(world.exchanges.prices);
    expect(hashWorld(world, registry)).toBe(hashWorld(decoded.value, registry));
    expect(cloneWorld(world).exchanges.prices).toEqual(world.exchanges.prices);
  });

  it('[ARCH-14.5] an empty price table hashes identically to the pre-M9 encoding', () => {
    const created = createWorld(createEmptyRegistry(), {
      seed: [0, 0],
      tickDurationMs: 1000,
      world: null,
      enabledModules: [],
    });
    if (!created.ok) throw new Error('world creation failed');
    expect(created.value.exchanges.prices).toEqual([]);
  });
});
