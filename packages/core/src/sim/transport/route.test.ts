import { describe, expect, it } from 'vitest';
import { allocateEntity } from '../../world/create.js';
import { createWorld } from '../../world/create.js';
import { createEmptyRegistry } from '../../registry/types.js';
import type { World } from '../../world/types.js';
import { definitionHandle, entityId, ownerHandle, stringId } from '../../ids/index.js';
import { instantiateWorld } from '../instantiate.js';
import type { WorldPlan } from '../instantiate.js';
import { locationOf } from '../location.js';
import { runPhases } from '../../pipeline/step.js';
import { planRoute, startMovement, traversalTicks } from './route.js';
import type { TransportMovement } from './types.js';

const tag = stringId('test.transport.standard');

const buildWorld = (): World => {
  const created = createWorld(createEmptyRegistry(), {
    seed: [0, 0],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
  });
  if (!created.ok) throw new Error('world creation failed');
  const world = created.value;
  const plan: WorldPlan = {
    owner: ownerHandle(0),
    locations: ['a', 'b', 'c', 'd'].map((name) => ({
      template: definitionHandle(0),
      spatialPolicy: 'framework.spatial.abstract_capacity',
      capacity: 10,
      properties: [],
      region: null,
      active: true,
      inventories: [],
      ...(name === '' ? {} : {}),
    })),
    connections: [
      {
        id: stringId('test.conn.a_b'),
        definition: definitionHandle(1),
        originIndex: 0,
        destinationIndex: 1,
        direction: 'bidirectional',
        baseDurationTicks: 100,
        enabled: true,
        allowedTransportTags: [tag],
      },
      {
        id: stringId('test.conn.a_c'),
        definition: definitionHandle(1),
        originIndex: 0,
        destinationIndex: 2,
        direction: 'bidirectional',
        baseDurationTicks: 100,
        enabled: true,
        allowedTransportTags: [tag],
      },
      {
        id: stringId('test.conn.b_d'),
        definition: definitionHandle(1),
        originIndex: 1,
        destinationIndex: 3,
        direction: 'bidirectional',
        baseDurationTicks: 100,
        enabled: true,
        allowedTransportTags: [tag],
      },
      {
        id: stringId('test.conn.c_d'),
        definition: definitionHandle(1),
        originIndex: 2,
        destinationIndex: 3,
        direction: 'bidirectional',
        baseDurationTicks: 100,
        enabled: true,
        allowedTransportTags: [tag],
      },
    ],
  };
  instantiateWorld(world, plan);
  return world;
};

describe('[ARCH-14.1] traversal time', () => {
  it('[ARCH-14.1] speed scales the base duration with ceiling', () => {
    expect(traversalTicks(100, 1000)).toBe(100);
    expect(traversalTicks(100, 500)).toBe(200);
    expect(traversalTicks(101, 500)).toBe(202);
  });
});

describe('[ARCH-14.3][GDD-15.2] shortest stable route planning', () => {
  it('[ARCH-14.3] equal-cost paths choose the lexicographically lower connection sequence', () => {
    const world = buildWorld();
    const path = planRoute(world, entityId(1), entityId(4), 1000, [tag]);
    expect(path?.connections).toEqual([stringId('test.conn.a_b'), stringId('test.conn.b_d')]);
    expect(path?.locations).toEqual([entityId(1), entityId(2), entityId(4)]);
    expect(path?.totalTicks).toBe(200);
  });

  it('[ARCH-14.3] a disabled connection is not traversed', () => {
    const world = buildWorld();
    const a = locationOf(world, entityId(1));
    if (a?.connections === undefined) throw new Error('connections missing');
    world.stores.get('location').set(entityId(1), {
      ...a,
      connections: a.connections.map((connection) =>
        connection.id === stringId('test.conn.a_b')
          ? { ...connection, enabled: false }
          : connection,
      ),
    });
    const path = planRoute(world, entityId(1), entityId(4), 1000, [tag]);
    expect(path?.connections).toEqual([stringId('test.conn.a_c'), stringId('test.conn.c_d')]);
  });

  it('[ARCH-14.3] an unreachable target has no path', () => {
    const world = buildWorld();
    world.stores.get('location').set(entityId(2), {
      ...(locationOf(world, entityId(2)) as NonNullable<ReturnType<typeof locationOf>>),
      connections: [],
    });
    world.stores.get('location').set(entityId(1), {
      ...(locationOf(world, entityId(1)) as NonNullable<ReturnType<typeof locationOf>>),
      connections: (locationOf(world, entityId(1))?.connections ?? []).filter(
        (connection) => connection.id !== stringId('test.conn.a_b'),
      ),
    });
    world.stores.get('location').set(entityId(4), {
      ...(locationOf(world, entityId(4)) as NonNullable<ReturnType<typeof locationOf>>),
      connections: (locationOf(world, entityId(4))?.connections ?? []).filter(
        (connection) => connection.id !== stringId('test.conn.b_d'),
      ),
    });
    expect(planRoute(world, entityId(1), entityId(2), 1000, [tag])).toBeNull();
  });
});

describe('[ARCH-14.1] movement phase', () => {
  it('[ARCH-14.2] abstract and physical units arrive on the same tick', () => {
    const world = buildWorld();
    const physical = allocateEntity(world);
    const abstract = allocateEntity(world);
    const path = planRoute(world, entityId(1), entityId(2), 1000, [tag]);
    if (path === null) throw new Error('path missing');
    const connection = locationOf(world, entityId(1))?.connections?.[0];
    if (connection === undefined) throw new Error('connection missing');
    world.stores.get('location').set(entityId(1), {
      ...(locationOf(world, entityId(1)) as NonNullable<ReturnType<typeof locationOf>>),
      connections: [{ ...connection, baseDurationTicks: 1 }],
    });
    for (const [unit, mode] of [
      [physical, 'physical'],
      [abstract, 'abstract'],
    ] as const) {
      world.stores.get<TransportMovement>('movement').set(unit, {
        speedPermille: 1000,
        mode,
        allowedConnectionTags: [tag],
        location: entityId(1),
      });
      startMovement(world, unit, path);
    }
    runPhases(world, createEmptyRegistry(), [16], {
      commands: [],
      options: { journal: false, hash: false },
    });
    expect(world.stores.get<TransportMovement>('movement').get(physical)?.location).toBe(
      entityId(2),
    );
    expect(world.stores.get<TransportMovement>('movement').get(abstract)?.location).toBe(
      entityId(2),
    );
  });

  it('[ARCH-14.1] a unit advances one tick at a time and arrives', () => {
    const world = buildWorld();
    const unit = allocateEntity(world);
    const movement: TransportMovement = {
      speedPermille: 1000,
      mode: 'physical',
      allowedConnectionTags: [tag],
      location: entityId(1),
    };
    world.stores.get<TransportMovement>('movement').set(unit, movement);
    const path = planRoute(world, entityId(1), entityId(2), 1000, [tag]);
    if (path === null) throw new Error('path missing');
    startMovement(world, unit, { ...path, totalTicks: 2 });
    // Shorten the leg so the test needs two ticks.
    const connection = locationOf(world, entityId(1))?.connections?.[0];
    if (connection === undefined) throw new Error('connection missing');
    world.stores.get('location').set(entityId(1), {
      ...(locationOf(world, entityId(1)) as NonNullable<ReturnType<typeof locationOf>>),
      connections: [{ ...connection, baseDurationTicks: 2 }],
    });
    const first = runPhases(world, createEmptyRegistry(), [16], {
      commands: [],
      options: { journal: false, hash: false },
    });
    expect(first.events.filter((event) => event.type === 'TransportArrived')).toHaveLength(0);
    expect(world.stores.get<TransportMovement>('movement').get(unit)?.progress).toBe(1);
    const second = runPhases(world, createEmptyRegistry(), [16], {
      commands: [],
      options: { journal: false, hash: false },
    });
    expect(second.events.some((event) => event.type === 'TransportArrived')).toBe(true);
    const arrived = world.stores.get<TransportMovement>('movement').get(unit);
    expect(arrived?.location).toBe(entityId(2));
    expect(arrived?.step).toBe(1);
  });
});
