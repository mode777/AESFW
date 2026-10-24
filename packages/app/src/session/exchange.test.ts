/**
 * Integration tests for exchange trades through the session command gateway
 * (GDD-17.4): a created trade order is assigned, executes against the
 * exchange price state, and moves the owner's balance and the price.
 *
 * Source: GDD-17.4, ARCH-14.4
 */
import { describe, expect, it } from 'vitest';
import { ids } from '@aesfw/core';
import type { Cargo } from '@aesfw/core';
import { createMemorySource, loadContent } from '@aesfw/content';
import type { ContentRegistry } from '@aesfw/content';
import { advance, createSession, submitCommand } from '../session/session.js';
import { instantiateWorldContent } from '../content/instantiate.js';
import type { SessionState } from '../session/types.js';

const manifest = [
  'package:',
  '  id: test.exchange.trade',
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
        recovery_permille_per_interval: 50,
        recovery_interval_ticks: 60,
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

const session = (): { state: SessionState; registry: ContentRegistry } => {
  const source = createMemorySource('test.exchange.trade', {
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
    journal: true,
    actor: ids.ownerHandle(0),
    actorId: 'test.owner',
  });
  if (!created.ok) throw new Error('session creation failed');
  const registry = loaded.content.registry as ContentRegistry;
  instantiateWorldContent(created.value.world, registry, 'test.world');
  const state = created.value;
  const credits = registry.handleOf('resource', ids.stringId('test.resource.credits'));
  const goods = registry.handleOf('resource', ids.stringId('test.resource.trade_goods'));
  if (credits === null || goods === null) throw new Error('missing resources');
  const owners = [...state.world.owners.owners];
  owners[0] = {
    ...owners[0]!,
    accounts: [{ resource: credits, amount: 100000000 }],
  };
  state.world.owners = { owners };
  const unit = state.world.stores.get('movement').ids()[0];
  if (unit === undefined) throw new Error('no transport unit');
  const cargoStore = state.world.stores.get<Cargo>('cargo');
  const cargo = cargoStore.get(unit);
  if (cargo !== undefined) {
    cargoStore.set(unit, {
      ...cargo,
      entries: [{ resource: goods, quantity: 500 }],
    });
  }
  return { state, registry };
};

describe('[GDD-17.4] exchange trades through the command gateway', () => {
  it('[GDD-17.4] a trade order sells cargo, pays out, and moves the price', () => {
    const { state: created, registry } = session();
    const exchange = created.world.stores.get('exchangeRef').ids()[0];
    expect(exchange).toBeDefined();
    if (exchange === undefined) return;
    const unit = created.world.stores.get('movement').ids()[0];
    expect(unit).toBeDefined();
    if (unit === undefined) return;

    const create = submitCommand(created, {
      command_id: 'create',
      actor_id: 'test.owner',
      type: 'CreateTransportOrder',
      payload: {
        mode: 'trade',
        stations: [
          {
            endpoint: exchange,
            actions: [
              {
                resource: 'test.resource.trade_goods',
                action: 'sell',
                rule: { mode: 'fixed', quantity: 300 },
                price_limit: 600,
              },
            ],
          },
        ],
      },
    });
    expect(create.result.status).toBe('accepted');
    let state = advance(create.session, 1).session;
    const order = state.world.stores.get('transportOrder').ids()[0];
    expect(order).toBeDefined();
    if (order === undefined) return;
    const assign = submitCommand(state, {
      command_id: 'assign',
      actor_id: 'test.owner',
      type: 'AssignTransport',
      payload: { unit_id: unit, order_id: order },
    });
    expect(assign.result.status).toBe('accepted');
    const advanced = advance(assign.session, 5);
    state = advanced.session;

    const traded = advanced.outputs
      .flatMap((output) => output.events)
      .filter((event) => event.type === 'Traded');
    expect(traded.length).toBeGreaterThanOrEqual(1);
    for (const event of traded) {
      expect((event.payload as { price?: number }).price).toBeGreaterThanOrEqual(600);
    }
    const sold = traded.reduce(
      (total, event) => total + ((event.payload as { quantity?: number }).quantity ?? 0),
      0,
    );
    expect(sold).toBe(300);
    const row = state.world.exchanges.prices[0];
    expect(row?.sell).toBeLessThan(800);
    const credits = registry.handleOf('resource', ids.stringId('test.resource.credits'));
    const balance = state.world.owners.owners[0]?.accounts.find(
      (entry) => entry.resource === credits,
    )?.amount;
    expect(balance).toBeGreaterThan(100000000);
  });
});
