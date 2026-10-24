/**
 * Unit tests for phase 18 resolveArrivals (GDD-16.1, ARCH-14.4). Arrivals are
 * produced by phase 16 within the same pipeline run, so every case drives the
 * phases [16, 18] over real movement components.
 *
 * Source: GDD-16.1, ARCH-14.4, ARCH-5.2
 */
import { describe, expect, it } from 'vitest';
import { allocateEntity, createWorld } from '../world/create.js';
import { createEmptyRegistry } from '../registry/types.js';
import type { World } from '../world/types.js';
import { definitionHandle, entityId, ownerHandle, stringId } from '../ids/index.js';
import type { EntityId } from '../ids/index.js';
import { runPhases } from '../pipeline/step.js';
import type { TickOutput } from '../pipeline/types.js';
import { instantiateWorld } from '../sim/instantiate.js';
import type { WorldPlan } from '../sim/instantiate.js';
import type { TransportMovement } from '../sim/transport/types.js';

const makeWorld = (
  knowledge: { locationIndex: number; level: 'discovered' | 'established' }[] = [],
): World => {
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
    locations: [
      {
        template: definitionHandle(0),
        spatialPolicy: 'framework.spatial.abstract_capacity',
        capacity: 100,
        properties: [],
        region: null,
        active: true,
        inventories: [],
      },
      {
        template: definitionHandle(0),
        spatialPolicy: 'framework.spatial.abstract_capacity',
        capacity: 100,
        properties: [],
        region: null,
        active: true,
        inventories: [],
      },
    ],
    owners: [{ handle: ownerHandle(0), accounts: [], knowledge }],
  };
  instantiateWorld(world, plan);
  // The bidirectional connection is attached to location 1 (entity 1).
  const locationStore = world.stores.get<{
    connections?: { id: string; origin: number; destination: number; baseDurationTicks: number }[];
  }>('location');
  const location = locationStore.get(entityId(1));
  if (location === undefined) throw new Error('location missing');
  locationStore.set(entityId(1), {
    ...location,
    connections: [
      {
        id: stringId('test.conn.a_b'),
        origin: entityId(1),
        destination: entityId(2),
        baseDurationTicks: 1,
      },
    ],
  });
  return world;
};

const travellingUnit = (world: World, owner: number | null, from: number, to: number): EntityId => {
  const unit = allocateEntity(world);
  if (owner !== null) {
    world.stores.get<{ owner: number }>('owner').set(unit, { owner });
  }
  const movement: TransportMovement = {
    speedPermille: 1000,
    mode: 'physical',
    allowedConnectionTags: [],
    location: entityId(from),
    path: [entityId(from), entityId(to)],
    connectionIds: [stringId('test.conn.a_b')],
    step: 0,
    progress: 0,
  };
  world.stores.get<TransportMovement>('movement').set(unit, movement);
  return unit;
};

const run1618 = (world: World): TickOutput =>
  runPhases(world, createEmptyRegistry(), [16, 18], {
    commands: [],
    options: { journal: false, hash: false },
  });

const knowledgeOf = (world: World, owner: number, location: number): string =>
  world.owners.owners[owner]?.knowledge.find((entry) => entry.location === location)?.level ??
  'unknown';

describe('[GDD-16.1][ARCH-14.4] phase 18 resolveArrivals', () => {
  it('[ARCH-14.4] an arrival discovers an unknown location and emits LocationDiscovered', () => {
    const world = makeWorld();
    travellingUnit(world, 0, 1, 2);
    const output = run1618(world);
    expect(knowledgeOf(output.world, 0, 2)).toBe('discovered');
    expect(knowledgeOf(output.world, 0, 1)).toBe('unknown');
    const discovered = output.events.filter((event) => event.type === 'LocationDiscovered');
    expect(discovered).toHaveLength(1);
    expect(discovered[0]?.owner).toBe(0);
    expect(discovered[0]?.location).toBe(entityId(2));
  });

  it('[GDD-16.1] an established location stays established and emits nothing', () => {
    const world = makeWorld([{ locationIndex: 1, level: 'established' }]);
    travellingUnit(world, 0, 1, 2);
    const output = run1618(world);
    expect(knowledgeOf(output.world, 0, 2)).toBe('established');
    expect(output.events.filter((event) => event.type === 'LocationDiscovered')).toHaveLength(0);
  });

  it('[ARCH-14.4] a repeat arrival emits nothing more', () => {
    const world = makeWorld();
    const unit = travellingUnit(world, 0, 1, 2);
    const first = run1618(world);
    expect(knowledgeOf(first.world, 0, 2)).toBe('discovered');
    expect(first.events.filter((event) => event.type === 'LocationDiscovered')).toHaveLength(1);
    const second = runPhases(first.world, createEmptyRegistry(), [16, 18], {
      commands: [],
      options: { journal: false, hash: false },
    });
    void unit;
    expect(knowledgeOf(second.world, 0, 2)).toBe('discovered');
    expect(second.events.filter((event) => event.type === 'LocationDiscovered')).toHaveLength(0);
  });

  it('[ARCH-14.4] an unowned unit discovers nothing', () => {
    const world = makeWorld();
    travellingUnit(world, null, 1, 2);
    const output = run1618(world);
    expect(knowledgeOf(output.world, 0, 2)).toBe('unknown');
    expect(output.events.filter((event) => event.type === 'LocationDiscovered')).toHaveLength(0);
  });

  it('[ARCH-14.4] a tick without arrivals leaves knowledge unchanged', () => {
    const world = makeWorld([{ locationIndex: 0, level: 'discovered' }]);
    const unit = travellingUnit(world, 0, 1, 2);
    const movement = world.stores.get<TransportMovement>('movement').get(unit);
    if (movement === undefined) throw new Error('movement missing');
    const rest: TransportMovement = { ...movement, path: [], connectionIds: [] };
    world.stores.get<TransportMovement>('movement').set(unit, rest);
    const output = run1618(world);
    expect(knowledgeOf(output.world, 0, 1)).toBe('discovered');
    expect(knowledgeOf(output.world, 0, 2)).toBe('unknown');
    expect(output.events.filter((event) => event.type === 'LocationDiscovered')).toHaveLength(0);
  });
});
