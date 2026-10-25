/**
 * Unit tests for the exchange-quotes read model (PIC-10.7): prices, bases,
 * in-window volume, recovery estimate, and the fog gate.
 *
 * Source: PIC-10.7, PIC-9.3
 */
import { describe, expect, it } from 'vitest';
import { ids } from '@aesfw/core';
import type { Cargo } from '@aesfw/core';
import { createMemorySource, loadContent } from '@aesfw/content';
import { advance, createSession, submitCommand } from '../session/session.js';
import { instantiateWorldContent } from '../content/instantiate.js';
import { exchangeQuotes } from './exchange-quotes.js';
import type { SessionState } from '../session/types.js';

const manifest = [
  'package:',
  '  id: test.quotes',
  '  version: 1.0.0',
  '  schema_version: 1',
  '  type: simulation_content',
  '  files:',
  '    - content.yaml',
  '',
].join('\n');

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
        min_price_permille: 100,
        max_price_permille: 5000,
      },
      shared_between_owners: true,
    },
  ],
  entity_definitions: [{ id: 'test.entity.transport', components: {} }],
  transport_units: [
    {
      id: 'test.transport.basic',
      entity_definition: 'test.entity.transport',
      cargo: {
        compartment_policy: 'unrestricted',
        slots: 1,
        slot_capacity: 1000,
        acceptance: 'transportable_resources',
      },
      movement: { speed_permille: 1000 },
      handling: { loading_rate_per_tick: 100, unloading_rate_per_tick: 100 },
      order_modes: ['trade'],
    },
  ],
  worlds: [
    {
      id: 'test.world',
      locations: [{ id: 'test.loc.port', template: 'test.location.port' }],
      owners: [
        {
          id: 'owner.a',
          established_locations: ['test.loc.port'],
          initial_entities: [{ definition: 'test.entity.transport', location: 'test.loc.port' }],
        },
      ],
    },
  ],
};

const session = (): { state: SessionState; exchange: number; unknownActor: number } => {
  const source = createMemorySource('test.quotes', {
    'package.yaml': manifest,
    'content.yaml': JSON.stringify(document),
  });
  const loaded = loadContent([source], { strictness: 'strict' });
  if (loaded.content === null) throw new Error('content failed');
  const created = createSession(loaded.content, {
    sessionId: 'session.1',
    seed: [1, 2],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
    hashInterval: 0,
    journal: false,
    actor: ids.ownerHandle(0),
    actorId: 'test.owner',
  });
  if (!created.ok) throw new Error('session creation failed');
  instantiateWorldContent(created.value.world, loaded.content.registry as never, 'test.world');
  const exchange = created.value.world.stores.get('exchangeRef').ids()[0];
  if (exchange === undefined) throw new Error('no exchange');
  const owners = [...created.value.world.owners.owners];
  owners.push({ ...owners[0]!, handle: ids.ownerHandle(1), knowledge: [] });
  created.value.world.owners = { owners };
  return {
    state: created.value,
    exchange,
    unknownActor: ids.ownerHandle(1),
  };
};

describe('[PIC-10.7] exchange quotes read model', () => {
  it('[PIC-10.7] quotes report prices, bases, and volume', () => {
    const { state, exchange } = session();
    const actor = ids.ownerHandle(0);
    const before = exchangeQuotes(state, actor, exchange);
    expect(before).not.toBeNull();
    expect(before?.entity_id).toBe(exchange);
    expect(before?.location_id).toBeDefined();
    expect(before?.currency_id).toBe('test.resource.credits');
    expect(before?.goods).toHaveLength(1);
    expect(before?.goods[0]).toMatchObject({
      resource_id: 'test.resource.trade_goods',
      buy: 1000,
      sell: 800,
      base_buy: 1000,
      base_sell: 800,
      recent_sold: 0,
      recent_bought: 0,
      buy_recovery_ticks: 0,
      sell_recovery_ticks: 0,
    });
  });

  it('[PIC-10.7] the recovery estimate counts intervals to base', () => {
    const { state, exchange } = session();
    state.world.exchanges = {
      prices: state.world.exchanges.prices.map((price) => ({ ...price, sell: 720 })),
    };
    const quotes = exchangeQuotes(state, ids.ownerHandle(0), exchange);
    expect(quotes?.goods[0]?.sell_recovery_ticks).toBe(5);
    expect(quotes?.goods[0]?.buy_recovery_ticks).toBe(0);
  });

  it('[PIC-10.7] the recent volume matches the elasticity window', () => {
    const { state, exchange } = session();
    state.world.exchanges = {
      prices: state.world.exchanges.prices.map((price) => ({
        ...price,
        soldVolume: [{ tick: ids.tick(1), quantity: 300 }],
      })),
    };
    const quotes = exchangeQuotes(state, ids.ownerHandle(0), exchange);
    expect(quotes?.goods[0]?.recent_sold).toBe(300);
  });

  it('[PIC-10.7] a non-exchange entity has no quotes', () => {
    const { state } = session();
    const location = state.world.stores.get('location').ids()[0];
    expect(location).toBeDefined();
    if (location === undefined) return;
    expect(exchangeQuotes(state, ids.ownerHandle(0), location)).toBeNull();
  });

  it('[PIC-9.3] quotes of an unknown location are withheld', () => {
    const { state, exchange, unknownActor } = session();
    expect(exchangeQuotes(state, unknownActor, exchange)).toBeNull();
  });

  it('[PIC-10.7] quotes move after executed trades', () => {
    const { state: created } = session();
    const exchange = created.world.stores.get('exchangeRef').ids()[0];
    const unit = created.world.stores.get('movement').ids()[0];
    if (exchange === undefined || unit === undefined) throw new Error('missing entities');
    const goods = created.content.registry.handleOf(
      'resource',
      ids.stringId('test.resource.trade_goods'),
    );
    if (goods === null) throw new Error('missing resource');
    const cargoStore = created.world.stores.get<Cargo>('cargo');
    const cargo = cargoStore.get(unit);
    if (cargo !== undefined) {
      cargoStore.set(unit, { ...cargo, entries: [{ resource: goods, quantity: 500 }] });
    }
    const create = submitCommand(created, {
      command_id: 'create',
      actor_id: 'test.owner',
      type: 'CreateTransportOrder',
      payload: {
        mode: 'trade',
        repeat: false,
        stations: [
          {
            endpoint: exchange,
            actions: [
              {
                resource: 'test.resource.trade_goods',
                action: 'sell',
                rule: { mode: 'fixed', quantity: 300 },
              },
            ],
          },
        ],
      },
    });
    expect(create.result.status).toBe('accepted');
    let state = advance(create.session, 1).session;
    const order = state.world.stores.get('transportOrder').ids()[0];
    if (order === undefined) throw new Error('no order');
    const assign = submitCommand(state, {
      command_id: 'assign',
      actor_id: 'test.owner',
      type: 'AssignTransport',
      payload: { unit_id: unit, order_id: order },
    });
    state = advance(assign.session, 4).session;
    const quotes = exchangeQuotes(state, ids.ownerHandle(0), exchange);
    expect(quotes?.goods[0]?.sell).toBeLessThan(800);
    expect(quotes?.goods[0]?.recent_sold).toBe(300);
    expect(quotes?.revision).toBeGreaterThan(0);
  });
});
