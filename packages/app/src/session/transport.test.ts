import { describe, expect, it } from 'vitest';
import { ids } from '@aesfw/core';
import type { Cargo, Inventory } from '@aesfw/core';
import { createMemorySource, loadContent } from '@aesfw/content';
import type { ContentRegistry } from '@aesfw/content';
import { advance, createSession, submitCommand } from '../session/session.js';
import { instantiateWorldContent } from '../content/instantiate.js';
import type { SessionState } from '../session/types.js';

const manifest = [
  'package:',
  '  id: test.transport.order',
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
      id: 'test.resource.a',
      tags: ['storable'],
      quantity: { precision: 'fixed', scale: 1000 },
      storage: { policy: 'normal', scope: 'inventory' },
      transportable: true,
    },
  ],
  location_templates: [
    {
      id: 'test.location.a',
      spatial_policy: 'framework.spatial.abstract_capacity',
      spatial_parameters: { total_capacity: 100 },
      inventories: [
        {
          id: 'shared',
          capacity: { mode: 'total', quantity: 1000 },
          access_policy: 'framework.inventory.shared_location',
        },
      ],
      activation: { initial: true },
    },
  ],
  connections: [
    {
      id: 'test.connection.standard',
      direction: 'bidirectional',
      traversal: { base_duration_ticks: 1 },
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
        slot_capacity: 100,
        acceptance: 'transportable_resources',
      },
      movement: { speed_permille: 1000 },
      handling: { loading_rate_per_tick: 10, unloading_rate_per_tick: 10 },
      order_modes: ['route'],
    },
  ],
  transport_order_templates: [
    {
      id: 'test.order.template',
      mode: 'route',
      failure_policies: { path_unavailable: 'retry' },
      scheduling: { repeat: true, retry_interval_ticks: 20 },
    },
  ],
  worlds: [
    {
      id: 'test.world',
      locations: [
        { id: 'test.loc.a', template: 'test.location.a' },
        { id: 'test.loc.b', template: 'test.location.a' },
      ],
      connections: [
        {
          id: 'test.conn.a_b',
          definition: 'test.connection.standard',
          origin: 'test.loc.a',
          destination: 'test.loc.b',
        },
      ],
      owners: [
        {
          id: 'owner.a',
          established_locations: ['test.loc.a'],
          initial_entities: [{ definition: 'test.entity.transport', location: 'test.loc.a' }],
        },
      ],
    },
  ],
};

const session = (): { state: SessionState; registry: ContentRegistry } => {
  const source = createMemorySource('test.transport.order', {
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
  const inventory = created.value.world.stores.get<Inventory>('inventory').get(ids.entityId(2));
  if (inventory !== undefined) {
    created.value.world.stores.get<Inventory>('inventory').set(ids.entityId(2), {
      ...inventory,
      entries: [{ resource: ids.definitionHandle(0), quantity: 100 }],
    });
  }
  return { state: created.value, registry };
};

describe('[GDD-15.2] transport order commands', () => {
  it('[GDD-15.2] a malformed order is rejected without allocating an entity', () => {
    const { state } = session();
    const before = state.world.nextEntityId;
    const result = submitCommand(state, {
      command_id: 'malformed',
      actor_id: 'test.owner',
      type: 'CreateTransportOrder',
      payload: { mode: 'route', stations: [] },
    });
    expect(result.result.status).toBe('rejected');
    expect(result.session.world.nextEntityId).toBe(before);
  });

  it('[GDD-15.2] a created order can be assigned and executed', () => {
    const { state: created } = session();
    const create = submitCommand(created, {
      command_id: 'create',
      actor_id: 'test.owner',
      type: 'CreateTransportOrder',
      payload: {
        template: 'test.order.template',
        mode: 'route',
        stations: [
          {
            endpoint: 1,
            actions: [{ resource: 'test.resource.a', action: 'load', rule: { mode: 'all' } }],
          },
          {
            endpoint: 3,
            actions: [{ resource: 'test.resource.a', action: 'unload', rule: { mode: 'all' } }],
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
      payload: { unit_id: 5, order_id: order },
    });
    expect(assign.result.status).toBe('accepted');
    state = advance(assign.session, 22).session;

    const cargo = state.world.stores.get<Cargo>('cargo').get(ids.entityId(5));
    expect(cargo?.entries).toEqual([]);
    const destination = state.world.stores.get<Inventory>('inventory').get(ids.entityId(4));
    expect(destination?.entries).toEqual([{ resource: ids.definitionHandle(0), quantity: 100 }]);
  });
});
