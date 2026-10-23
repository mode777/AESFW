import { describe, expect, it } from 'vitest';
import { ids } from '@aesfw/core';
import type {
  Cargo,
  Registry,
  StationCursor,
  TransportAssignment,
  TransportMovement,
  TransportOrder,
} from '@aesfw/core';
import type { CompiledContent } from '@aesfw/content';
import { createSession } from '../session/session.js';
import type { SessionState } from '../session/types.js';
import { transportDetail } from './transport-detail.js';

const registry: Registry = {
  stringIdOf: (type, handle) =>
    type === 'resource' && handle === ids.definitionHandle(0)
      ? ids.stringId('test.resource.a')
      : null,
  handleOf: () => null,
};

const content: CompiledContent = {
  registry,
  checksum: 'checksum.1',
  packages: [],
  presentation: null,
};

const session = (): SessionState => {
  const created = createSession(content, {
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
  return created.value;
};

const order: TransportOrder = {
  mode: 'route',
  stations: [
    {
      endpoint: ids.entityId(1),
      actions: [
        {
          resource: ids.definitionHandle(0),
          action: 'load',
          rule: { mode: 'excess_above', quantity: 10 },
        },
      ],
    },
    {
      endpoint: ids.entityId(3),
      actions: [{ resource: ids.definitionHandle(0), action: 'unload', rule: { mode: 'all' } }],
    },
  ],
  pathPolicy: 'shortest_stable',
  repeat: true,
  retryIntervalTicks: 20,
  failurePolicies: {
    origin_unavailable: 'retry',
    destination_unavailable: 'retry',
    path_unavailable: 'retry',
    cargo_cannot_unload: 'retain',
    exchange_limit_not_met: 'skip',
    establishment_target_occupied: 'return',
  },
};

const populated = (): SessionState => {
  const state = session();
  state.world.stores.get<Cargo>('cargo').set(ids.entityId(5), {
    policy: 'typed_slots',
    slotCapacity: 100,
    slots: [
      { resource: ids.definitionHandle(0), quantity: 40 },
      { resource: null, quantity: 0 },
    ],
    entries: [],
    accepts: [],
  });
  state.world.stores.get<TransportMovement>('movement').set(ids.entityId(5), {
    speedPermille: 1000,
    mode: 'physical',
    allowedConnectionTags: [],
    location: ids.entityId(3),
    path: [ids.entityId(1), ids.entityId(3)],
    connectionIds: [ids.stringId('test.conn.a_b')],
    step: 1,
    progress: 0,
  });
  state.world.stores.get<TransportOrder>('transportOrder').set(ids.entityId(6), order);
  state.world.stores
    .get<TransportAssignment>('transportAssignment')
    .set(ids.entityId(5), { order: ids.entityId(6) });
  state.world.stores.get<StationCursor>('stationCursor').set(ids.entityId(5), {
    station: 1,
    action: 0,
    handled: 5,
    target: 40,
    started: true,
    failure: 'cargo_cannot_unload',
  });
  return state;
};

describe('[PIC-10.4] transport detail read model', () => {
  it('[PIC-10.4] a unit exposes order, stations, cargo, and progress', () => {
    const detail = transportDetail(populated(), 5);
    expect(detail?.order_id).toBe(6);
    expect(detail?.mode).toBe('route');
    expect(detail?.state).toBe('handling');
    expect(detail?.current_station).toBe(1);
    expect(detail?.connection_path).toEqual(['test.conn.a_b']);
    expect(detail?.stations?.[0]?.actions[0]).toEqual({
      resource_id: 'test.resource.a',
      action: 'load',
      rule_mode: 'excess_above',
      quantity: 10,
    });
    expect(detail?.cargo?.slots).toEqual([
      { slot: 0, resource_id: 'test.resource.a', quantity: 40 },
      { slot: 1, quantity: 0 },
    ]);
    expect(detail?.progress).toEqual({ action_index: 0, handled: 5, target: 40 });
    expect(detail?.failure_reasons).toEqual(['cargo_cannot_unload']);
  });

  it('[PIC-10.4] a non-transport entity has no detail', () => {
    expect(transportDetail(session(), 99)).toBeNull();
  });
});
