/**
 * Integration tests for trade execution (GDD-17.4, ARCH-14.4): trade stations
 * stage against exchanges, price limits and side enablement gate execution,
 * one atomic trade moves currency and cargo, elasticity records volume, and
 * trades apply in deterministic order.
 *
 * Source: GDD-17.4, ARCH-14.4, ARCH-14.5
 */
import { describe, expect, it } from 'vitest';
import { allocateEntity, createWorld } from '../../world/create.js';
import { createEmptyRegistry } from '../../registry/types.js';
import type { Registry } from '../../registry/types.js';
import type { World } from '../../world/types.js';
import { definitionHandle, entityId, ownerHandle, stringId, tick } from '../../ids/index.js';
import { hashWorld } from '../../world/codec.js';
import { runPhases } from '../../pipeline/step.js';
import { instantiateWorld } from '../instantiate.js';
import type { WorldPlan } from '../instantiate.js';
import { assignTransport, createTransportOrder, defaultFailurePolicies } from './orders.js';
import type { Cargo, TransportHandling, TransportMovement } from './types.js';

const EXCHANGE = definitionHandle(0);
const RESOURCE = definitionHandle(1);
const CURRENCY = definitionHandle(2);
const TEMPLATE = definitionHandle(3);

const ELASTICITY = {
  window_ticks: 10,
  step_quantity: 100,
  step_change_permille: 100,
  recovery_permille_per_interval: 200,
  recovery_interval_ticks: 5,
  min_price_permille: 500,
  max_price_permille: 1500,
};

const makeRegistry = (sellEnabled = true): Registry => ({
  ...createEmptyRegistry(),
  stringIdOf: (type, handle) =>
    type === 'exchange' && handle === EXCHANGE
      ? stringId('test.exchange.a')
      : type === 'resource' && handle === RESOURCE
        ? stringId('test.resource.a')
        : type === 'resource' && handle === CURRENCY
          ? stringId('test.resource.credits')
          : null,
  handleOf: (type, id) =>
    type === 'exchange' && id === stringId('test.exchange.a')
      ? EXCHANGE
      : type === 'resource' && id === stringId('test.resource.a')
        ? RESOURCE
        : type === 'resource' && id === stringId('test.resource.credits')
          ? CURRENCY
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
              sell_to_exchange: { base_price: 800, enabled: sellEnabled },
            },
          ],
          elasticity: ELASTICITY,
          shared_between_owners: true,
        }
      : null,
});

interface Setup {
  world: World;
  registry: Registry;
  exchange: number;
  location: number;
  addUnit: (owner: number, cargoQuantity: number) => number;
  addOrder: (
    owner: number,
    action: 'buy' | 'sell',
    options?: { priceLimit?: number; quantity?: number; mode?: 'trade' | 'route' },
  ) => number;
  run: (ticks?: number) => ReturnType<typeof runPhases>;
}

const setup = (options?: { sellEnabled?: boolean; balance?: number | null }): Setup => {
  const registry = makeRegistry(options?.sellEnabled ?? true);
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
        template: TEMPLATE,
        spatialPolicy: 'framework.spatial.abstract_capacity',
        capacity: 100,
        properties: [],
        region: null,
        active: true,
        inventories: [
          {
            capacity: { total: 1000000, perResource: null },
            acceptance: { accepts: [] },
            policy: 'framework.inventory.shared_location',
          },
        ],
      },
    ],
    owners: [
      {
        handle: ownerHandle(0),
        accounts:
          options?.balance === null
            ? []
            : [{ resource: CURRENCY, amount: options?.balance ?? 10000000 }],
        knowledge: [],
      },
      {
        handle: ownerHandle(1),
        accounts: [{ resource: CURRENCY, amount: 10000000 }],
        knowledge: [],
      },
    ],
  };
  instantiateWorld(world, plan);
  const location = world.stores.get('location').ids()[0];
  if (location === undefined) throw new Error('no location');
  const exchange = allocateEntity(world);
  world.stores.get('exchangeRef').set(exchange, { exchange: EXCHANGE, location });
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
  const setup: Setup = {
    world,
    registry,
    exchange,
    location,
    addUnit: (owner, cargoQuantity) => {
      const unit = allocateEntity(world);
      world.stores.get('owner').set(unit, { owner: ownerHandle(owner) });
      const cargo: Cargo = {
        policy: 'unrestricted',
        slotCapacity: 100000,
        slots: [],
        entries: cargoQuantity > 0 ? [{ resource: RESOURCE, quantity: cargoQuantity }] : [],
        accepts: [RESOURCE],
      };
      world.stores.get<Cargo>('cargo').set(unit, cargo);
      const movement: TransportMovement = {
        speedPermille: 1000,
        mode: 'abstract',
        allowedConnectionTags: [],
        location,
      };
      world.stores.get<TransportMovement>('movement').set(unit, movement);
      const handling: TransportHandling = {
        loadingRatePerTick: 100,
        unloadingRatePerTick: 100,
      };
      world.stores.get<TransportHandling>('handling').set(unit, handling);
      return unit;
    },
    addOrder: (owner, action, opts = {}) => {
      const order = createTransportOrder(world, ownerHandle(owner), {
        mode: opts.mode ?? 'trade',
        stations: [
          {
            endpoint: entityId(exchange),
            actions: [
              {
                resource: RESOURCE,
                action,
                rule: { mode: 'fixed', quantity: opts.quantity ?? 300 },
                ...(opts.priceLimit === undefined ? {} : { priceLimit: opts.priceLimit }),
              },
            ],
          },
        ],
        pathPolicy: 'shortest_stable',
        repeat: false,
        retryIntervalTicks: 0,
        failurePolicies: {
          ...defaultFailurePolicies(),
          exchange_limit_not_met: 'skip',
        },
      });
      return order;
    },
    run: (ticks = 1) => {
      let output: ReturnType<typeof runPhases> | null = null;
      for (let index = 0; index < ticks; index += 1) {
        output = runPhases(world, registry, [16, 17, 19], {
          commands: [],
          options: { journal: true, hash: false },
        });
      }
      if (output === null) throw new Error('no tick run');
      return output;
    },
  };
  return setup;
};

const balanceOf = (world: World, owner: number, resource = CURRENCY): number =>
  world.owners.owners[owner]?.accounts.find((entry) => entry.resource === resource)?.amount ?? 0;

const cargoOf = (world: World, unit: number, resource = RESOURCE): number =>
  world.stores
    .get<Cargo>('cargo')
    .get(entityId(unit))
    ?.entries.find((entry) => entry.resource === resource)?.quantity ?? 0;

describe('[GDD-17.4] trade execution', () => {
  it('[GDD-17.4] a sale pays out at the current price and records volume', () => {
    const state = setup();
    const unit = state.addUnit(0, 500);
    const order = state.addOrder(0, 'sell');
    expect(assignTransport(state.world, entityId(unit), entityId(order))).toBe(true);
    const output = state.run(3);
    expect(balanceOf(state.world, 0)).toBe(10000000 + 216000);
    expect(cargoOf(state.world, unit)).toBe(200);
    const traded = output.events.filter((event) => event.type === 'Traded');
    expect(traded).toHaveLength(1);
    expect(traded[0]?.payload).toEqual({
      exchange: state.exchange,
      resource: RESOURCE,
      quantity: 100,
      price: 640,
      direction: 'sell',
    });
    const row = state.world.exchanges.prices[0];
    expect(row?.soldVolume).toEqual([
      { tick: tick(1), quantity: 100 },
      { tick: tick(2), quantity: 100 },
      { tick: tick(3), quantity: 100 },
    ]);
    expect(row?.sell).toBe(560);
  });

  it('[GDD-17.4] a purchase debits the owner and loads the cargo', () => {
    const state = setup();
    const unit = state.addUnit(0, 0);
    const order = state.addOrder(0, 'buy', { quantity: 200 });
    expect(assignTransport(state.world, entityId(unit), entityId(order))).toBe(true);
    state.run(2);
    expect(balanceOf(state.world, 0)).toBe(10000000 - 210000);
    expect(cargoOf(state.world, unit)).toBe(200);
    const row = state.world.exchanges.prices[0];
    expect(row?.boughtVolume).toEqual([
      { tick: tick(1), quantity: 100 },
      { tick: tick(2), quantity: 100 },
    ]);
    expect(row?.buy).toBe(1200);
  });

  it('[GDD-17.4] a sale below the price limit is refused by policy', () => {
    const state = setup();
    const unit = state.addUnit(0, 500);
    const order = state.addOrder(0, 'sell', { priceLimit: 900 });
    expect(assignTransport(state.world, entityId(unit), entityId(order))).toBe(true);
    state.run();
    expect(balanceOf(state.world, 0)).toBe(10000000);
    expect(cargoOf(state.world, unit)).toBe(500);
    expect(state.world.stores.get('transportAssignment').get(entityId(unit))).toEqual({
      order: null,
    });
  });

  it('[GDD-17.4] a disabled side is refused', () => {
    const state = setup({ sellEnabled: false });
    const unit = state.addUnit(0, 500);
    const order = state.addOrder(0, 'sell');
    expect(assignTransport(state.world, entityId(unit), entityId(order))).toBe(true);
    state.run();
    expect(balanceOf(state.world, 0)).toBe(10000000);
    expect(cargoOf(state.world, unit)).toBe(500);
  });

  it('[GDD-17.4] an unaffordable purchase fails without partial effects', () => {
    const state = setup({ balance: 99000 });
    const unit = state.addUnit(0, 0);
    const order = state.addOrder(0, 'buy', { quantity: 100 });
    expect(assignTransport(state.world, entityId(unit), entityId(order))).toBe(true);
    state.run();
    expect(balanceOf(state.world, 0)).toBe(99000);
    expect(cargoOf(state.world, unit)).toBe(0);
    expect(state.world.stores.get('stationCursor').get(entityId(unit))).toMatchObject({
      failure: 'origin_unavailable',
    });
  });

  it('[GDD-17.4] trades apply in exchange, owner, and unit order', () => {
    const state = setup();
    const late = state.addUnit(0, 100);
    const early = state.addUnit(1, 100);
    const lateOrder = state.addOrder(0, 'sell', { quantity: 300 });
    const earlyOrder = state.addOrder(1, 'sell', { quantity: 100 });
    expect(assignTransport(state.world, entityId(late), entityId(lateOrder))).toBe(true);
    expect(assignTransport(state.world, entityId(early), entityId(earlyOrder))).toBe(true);
    const output = state.run();
    const trades = output.journal?.filter((entry) => entry.kind === 'trade') ?? [];
    expect(trades).toHaveLength(2);
    expect(trades[0]?.owner).toBe(0);
    expect(trades[1]?.owner).toBe(1);
  });

  it('[GDD-17.4] the same staged trades reproduce identical state and hash', () => {
    const buildAndRun = (): { hash: string; balances: number[] } => {
      const state = setup();
      const a = state.addUnit(0, 100);
      const b = state.addUnit(1, 100);
      const orderA = state.addOrder(0, 'sell', { quantity: 100 });
      const orderB = state.addOrder(1, 'sell', { quantity: 100 });
      assignTransport(state.world, entityId(a), entityId(orderA));
      assignTransport(state.world, entityId(b), entityId(orderB));
      state.run();
      return {
        hash: hashWorld(state.world, state.registry),
        balances: [balanceOf(state.world, 0), balanceOf(state.world, 1)],
      };
    };
    const first = buildAndRun();
    const second = buildAndRun();
    expect(second.hash).toBe(first.hash);
    expect(second.balances).toEqual(first.balances);
  });

  it('[INV-13] a same-tick buy-then-sell round trip loses currency', () => {
    const state = setup();
    const buyer = state.addUnit(0, 0);
    const seller = state.addUnit(0, 100);
    const buyOrder = state.addOrder(0, 'buy', { quantity: 100 });
    const sellOrder = state.addOrder(0, 'sell', { quantity: 100 });
    assignTransport(state.world, entityId(buyer), entityId(buyOrder));
    assignTransport(state.world, entityId(seller), entityId(sellOrder));
    const before = balanceOf(state.world, 0);
    state.run();
    const after = balanceOf(state.world, 0);
    expect(after).toBe(before - 100000 + 80000);
    expect(after).toBeLessThan(before);
  });

  it('[GDD-17.4] the journal trade entry carries currency, price, and direction', () => {
    const state = setup();
    const unit = state.addUnit(0, 300);
    const order = state.addOrder(0, 'sell', { quantity: 300 });
    assignTransport(state.world, entityId(unit), entityId(order));
    const output = state.run();
    const trades = output.journal?.filter((entry) => entry.kind === 'trade') ?? [];
    expect(trades).toHaveLength(1);
    expect(trades[0]).toMatchObject({
      kind: 'trade',
      exchange: state.exchange,
      owner: 0,
      unit,
      resource: RESOURCE,
      currency: CURRENCY,
      quantity: 100,
      price: 800,
      direction: 'sell',
    });
  });

  it('[GDD-17.4] plain load and unload staging is unchanged', () => {
    const state = setup();
    const unit = state.addUnit(0, 0);
    const order = createTransportOrder(state.world, ownerHandle(0), {
      mode: 'route',
      stations: [
        {
          endpoint: entityId(state.location),
          actions: [
            {
              resource: RESOURCE,
              action: 'load',
              rule: { mode: 'fixed', quantity: 300 },
            },
          ],
        },
      ],
      pathPolicy: 'shortest_stable',
      repeat: false,
      retryIntervalTicks: 0,
      failurePolicies: defaultFailurePolicies(),
    });
    expect(assignTransport(state.world, entityId(unit), entityId(order))).toBe(true);
    state.run();
    expect(state.world.exchanges.prices[0]?.soldVolume ?? []).toEqual([]);
    expect(balanceOf(state.world, 0)).toBe(10000000);
  });
});
