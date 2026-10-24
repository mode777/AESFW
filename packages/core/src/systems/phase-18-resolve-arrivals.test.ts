/**
 * Unit tests for phase 18 resolveArrivals (GDD-16.1, ARCH-14.4). Arrivals are
 * produced by phase 16 within the same pipeline run, so every case drives the
 * phases [16, 18] over real movement components.
 *
 * Source: GDD-16.1, ARCH-14.4, ARCH-5.2
 */
import { describe, expect, it } from 'vitest';
import { createWorld } from '../world/create.js';
import { createEmptyRegistry } from '../registry/types.js';
import type { World } from '../world/types.js';
import { definitionHandle, entityId, ownerHandle, stringId } from '../ids/index.js';
import type { EntityId } from '../ids/index.js';
import { runPhases } from '../pipeline/step.js';
import type { TickOutput } from '../pipeline/types.js';
import { instantiateWorld } from '../sim/instantiate.js';
import type { WorldPlan } from '../sim/instantiate.js';
import type { Cargo, StationCursor, TransportMovement } from '../sim/transport/types.js';
import {
  assignTransport,
  createTransportOrder,
  defaultFailurePolicies,
} from '../sim/transport/orders.js';
import { allocateEntity } from '../world/create.js';
import type { EstablishmentSystem } from '../pipeline/types.js';
import type { Registry } from '../registry/types.js';

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

describe('[GDD-16.3][ARCH-14.4] phase 18 establishment', () => {
  const worldWithEstablishment = (): { world: World; unit: EntityId } => {
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
          active: false,
          inventories: [],
          establishment: definitionHandle(7),
        },
      ],
      owners: [
        {
          handle: ownerHandle(0),
          accounts: [],
          knowledge: [{ locationIndex: 0, level: 'established' }],
        },
      ],
    };
    instantiateWorld(world, plan);
    const locationStore0 = world.stores.get<{
      connections?: {
        id: string;
        origin: number;
        destination: number;
        baseDurationTicks: number;
      }[];
    }>('location');
    const origin = locationStore0.get(entityId(1));
    if (origin === undefined) throw new Error('origin missing');
    locationStore0.set(entityId(1), {
      ...origin,
      connections: [
        {
          id: stringId('test.conn.a_b'),
          origin: entityId(1),
          destination: entityId(2),
          baseDurationTicks: 1,
        },
      ],
    });
    // Locations are entities 1 and 2 (the plans declare no inventories); the
    // target starts unowned so the unoccupied guard is testable.
    const locationStore = world.stores.get<{ owner: number | null }>('location');
    const target = locationStore.get(entityId(2));
    if (target === undefined) throw new Error('target missing');
    locationStore.set(entityId(2), { ...target, owner: null });
    const unit = allocateEntity(world);
    world.stores.get<{ owner: number }>('owner').set(unit, { owner: 0 });
    world.stores.get<Cargo>('cargo').set(unit, {
      policy: 'unrestricted',
      slotCapacity: 100000,
      slots: [],
      entries: [{ resource: definitionHandle(2), quantity: 1000 }],
      accepts: [],
    });
    world.stores.get<TransportMovement>('movement').set(unit, {
      speedPermille: 1000,
      mode: 'physical',
      allowedConnectionTags: [],
      location: entityId(1),
    });
    const order = createTransportOrder(world, ownerHandle(0), {
      mode: 'establish',
      stations: [{ endpoint: entityId(2), actions: [] }],
      pathPolicy: 'shortest_stable',
      repeat: false,
      retryIntervalTicks: 20,
      failurePolicies: defaultFailurePolicies(),
    });
    assignTransport(world, unit, order);
    // Phase 14 normally plans the path and seeds the cursor after assignment;
    // the [16, 18] runs here need both up front.
    world.stores.get<TransportMovement>('movement').set(unit, {
      speedPermille: 1000,
      mode: 'physical',
      allowedConnectionTags: [],
      location: entityId(1),
      path: [entityId(1), entityId(2)],
      connectionIds: [stringId('test.conn.a_b')],
      step: 0,
      progress: 0,
    });
    world.stores
      .get<StationCursor>('stationCursor')
      .set(unit, { station: 0, action: 0, handled: 0, target: 0, started: false });
    return { world, unit };
  };

  const establishmentData = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: 'test.establishment.default',
    requires_knowledge: 'discovered',
    requires_unoccupied: true,
    cost_source: 'transport_cargo',
    costs: [{ resource: 'test.resource.package', quantity: 1000 }],
    creates_hub: 'test.entity.hub',
    activation: 'on_completion',
    ownership: 'exclusive',
    ...overrides,
  });

  const registry = (data: Record<string, unknown> | null): Registry =>
    data === null
      ? createEmptyRegistry()
      : {
          stringIdOf: () => null,
          handleOf: (type, id) =>
            type === ('resource' as never) && String(id) === 'test.resource.package'
              ? definitionHandle(2)
              : null,
          definitionDataOf: () => data as never,
        };

  const fakeSystem = (): {
    system: EstablishmentSystem;
    hubAt: () => { entity: number; location: number; owner: number } | null;
    cargoAtHub: () => Cargo | null;
    establishmentAtHub: () => number | null;
  } => {
    const created: { entity: number; location: number; owner: number }[] = [];
    const cargoSeen: Cargo[] = [];
    const establishmentSeen: (number | null)[] = [];
    return {
      system: {
        createHub: (world, location, owner) => {
          const entity = allocateEntity(world);
          world.stores.get<{ definition: number }>('definition').set(entity, { definition: 9 });
          created.push({ entity, location, owner });
          return entity;
        },
      },
      hubAt: () => created[created.length - 1] ?? null,
      cargoAtHub: () => cargoSeen[cargoSeen.length - 1] ?? null,
      establishmentAtHub: () => establishmentSeen[establishmentSeen.length - 1] ?? null,
    };
  };

  const run = (
    world: World,
    data: Record<string, unknown> | null,
    system: EstablishmentSystem | null,
  ): TickOutput =>
    runPhases(world, registry(data), [16, 18], {
      commands: [],
      options: { journal: false, hash: false },
      ...(system === null ? {} : { establishmentSystem: system }),
    });

  it('[GDD-16.3] an arriving unit establishes the location atomically', () => {
    const { world, unit } = worldWithEstablishment();
    const { system, hubAt } = fakeSystem();
    const output = run(world, establishmentData(), system);
    expect(hubAt()).not.toBeNull();
    const location = world.stores
      .get<{ owner: number | null; active: boolean; establishment?: number }>('location')
      .get(entityId(2));
    expect(location?.owner).toBe(0);
    expect(location?.active).toBe(true);
    expect(location?.establishment).toBe(definitionHandle(7));
    expect(hubAt()).not.toBeNull();
    expect(hubAt()?.owner).toBe(0);
    expect(world.owners.owners[0]?.knowledge).toContainEqual({
      location: entityId(2),
      level: 'established',
    });
    const established = output.events.filter((event) => event.type === 'LocationEstablished');
    expect(established).toHaveLength(1);
    expect(established[0]?.owner).toBe(0);
    const assignment = world.stores.get<{ order: number | null }>('transportAssignment').get(unit);
    expect(assignment?.order ?? null).toBeNull();
  });

  it('[GDD-16.3] a cargo shortfall applies the failure policy and pays nothing', () => {
    const { world, unit } = worldWithEstablishment();
    world.stores.get<Cargo>('cargo').set(unit, {
      policy: 'unrestricted',
      slotCapacity: 100000,
      slots: [],
      entries: [{ resource: definitionHandle(2), quantity: 500 }],
      accepts: [],
    });
    const { system, hubAt } = fakeSystem();
    const output = run(world, establishmentData(), system);
    const cargo = world.stores.get<Cargo>('cargo').get(unit);
    expect(cargo?.entries).toEqual([{ resource: definitionHandle(2), quantity: 500 }]);
    expect(hubAt()).toBeNull();
    const location = world.stores.get<{ owner: number | null }>('location').get(entityId(2));
    expect(location?.owner ?? null).toBeNull();
    const established = output.events.filter((event) => event.type === 'LocationEstablished');
    expect(established).toHaveLength(0);
    const assignment = world.stores.get<{ order: number | null }>('transportAssignment').get(unit);
    expect(assignment?.order ?? null).not.toBeNull();
  });

  it('[GDD-16.3] an occupied target applies establishment_target_occupied', () => {
    const { world } = worldWithEstablishment();
    const locationStore = world.stores.get<{ owner: number | null }>('location');
    const location = locationStore.get(entityId(2));
    if (location === undefined) throw new Error('location missing');
    locationStore.set(entityId(2), { ...location, owner: ownerHandle(1) });
    const { system, hubAt } = fakeSystem();
    const output = run(world, establishmentData(), system);
    expect(hubAt()).toBeNull();
    const established = output.events.filter((event) => event.type === 'LocationEstablished');
    expect(established).toHaveLength(0);
    const locationAfter = locationStore.get(entityId(2));
    expect(locationAfter?.owner).toBe(1);
  });

  it('[GDD-16.3] a location without an establishment cannot be established', () => {
    const { world } = worldWithEstablishment();
    const locationStore = world.stores.get<{ establishment?: number }>('location');
    const location = locationStore.get(entityId(2));
    if (location === undefined) throw new Error('location missing');
    const rest: { establishment?: number } = { ...location };
    delete rest.establishment;
    locationStore.set(entityId(2), rest);
    const { system, hubAt } = fakeSystem();
    const output = run(world, establishmentData(), system);
    expect(hubAt()).toBeNull();
    expect(output.events.filter((event) => event.type === 'LocationEstablished')).toHaveLength(0);
  });

  it('[GDD-16.3] insufficient knowledge blocks the transaction', () => {
    const { world } = worldWithEstablishment();
    const owners = [...world.owners.owners];
    const state = owners[0];
    if (state === undefined) throw new Error('owner missing');
    owners[0] = { ...state, knowledge: [] };
    world.owners = { owners };
    const { system, hubAt } = fakeSystem();
    const output = run(world, establishmentData({ requires_knowledge: 'established' }), system);
    expect(hubAt()).toBeNull();
    expect(output.events.filter((event) => event.type === 'LocationEstablished')).toHaveLength(0);
  });
});
