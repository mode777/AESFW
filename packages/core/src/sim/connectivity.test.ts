import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, ownerHandle, stringId } from '../ids/index.js';
import { createEmptyRegistry } from '../registry/types.js';
import { runPhases, stores } from '../testing.js';
import { cloneWorld, hashWorld } from '../world/codec.js';
import { createWorld } from '../world/create.js';
import type { World } from '../world/types.js';
import {
  buildConnectivityCache,
  connectedEntities,
  connectivityNodeOf,
  hasConnectivityRequirement,
  isConnected,
  rebuildConnectivityCaches,
} from './connectivity.js';
import type { ConnectivityCache } from './connectivity.js';
import type { Location, LocationHub } from './location.js';
import type { LogicalTransform } from './spatial.js';

const makeWorld = (): World => {
  const result = createWorld(createEmptyRegistry(), {
    seed: [1, 2],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
  });
  if (!result.ok) throw new Error('createWorld returned an error');
  return result.value;
};

const setLocation = (world: World, id: number, active = true): void => {
  stores(world)
    .get<Location>('location')
    .set(entityId(id), {
      template: definitionHandle(0),
      spatialPolicy: 'framework.spatial.abstract_capacity',
      capacity: 100,
      used: 0,
      properties: [],
      region: null,
      active,
      owner: ownerHandle(0),
    });
};

const setHub = (world: World, id: number): void => {
  stores(world).get<LocationHub>('locationHub').set(entityId(id), { inventories: [] });
};

const placeAt = (world: World, entity: number, location: number): void => {
  const transform: LogicalTransform = {
    location: entityId(location),
    position: { x: 0, y: 0 },
    orientation: 0,
  };
  stores(world).get<LogicalTransform>('transform').set(entityId(entity), transform);
};

const setNode = (world: World, entity: number, role: 'provider' | 'requirement'): void => {
  stores(world)
    .get('connectivityNode')
    .set(entityId(entity), { role, network: stringId('test.connectivity.hub') });
};

const groupOf = (world: World, location: number) =>
  buildConnectivityCache(world).groups.find((group) => group.location === entityId(location));

const emptyInput = { commands: [], options: { journal: false, hash: false } };

describe('[GDD-9.2] connectivity components', () => {
  it('[GDD-9.2] a requirement node names its network', () => {
    const world = makeWorld();
    setNode(world, 5, 'requirement');
    expect(connectivityNodeOf(world, entityId(5))).toEqual({
      role: 'requirement',
      network: 'test.connectivity.hub',
    });
    expect(hasConnectivityRequirement(world, entityId(5))).toBe(true);
  });

  it('[GDD-9.2] a provider node names its network', () => {
    const world = makeWorld();
    setNode(world, 3, 'provider');
    expect(connectivityNodeOf(world, entityId(3))?.role).toBe('provider');
  });

  it('[GDD-9.2] an entity without a node has no requirement', () => {
    const world = makeWorld();
    expect(hasConnectivityRequirement(world, entityId(3))).toBe(false);
  });
});

describe('[GDD-9.9] connectivity root', () => {
  it('[GDD-9.9] the hub roots its location', () => {
    const world = makeWorld();
    setLocation(world, 1);
    setHub(world, 1);
    expect(groupOf(world, 1)?.root).toBe(1);
  });

  it('[GDD-9.9] a provider roots a hub-less location', () => {
    const world = makeWorld();
    setLocation(world, 1);
    setNode(world, 3, 'provider');
    placeAt(world, 3, 1);
    expect(groupOf(world, 1)?.root).toBe(3);
  });

  it('[GDD-9.9] an inactive location has no root', () => {
    const world = makeWorld();
    setLocation(world, 1, false);
    setHub(world, 1);
    expect(groupOf(world, 1)).toBeUndefined();
  });
});

describe('[GDD-10.2] binary hub access', () => {
  it('[GDD-10.2] a provider connects the location', () => {
    const world = makeWorld();
    setLocation(world, 1);
    setHub(world, 1);
    setNode(world, 3, 'provider');
    placeAt(world, 3, 1);
    setNode(world, 5, 'requirement');
    placeAt(world, 5, 1);
    expect(isConnected(world, entityId(5))).toBe(true);
  });

  it('[GDD-10.2] the hub alone does not connect a requirer', () => {
    const world = makeWorld();
    setLocation(world, 1);
    setHub(world, 1);
    setNode(world, 5, 'requirement');
    placeAt(world, 5, 1);
    expect(isConnected(world, entityId(5))).toBe(false);
    expect(groupOf(world, 1)?.members).toEqual([1]);
  });

  it('[GDD-10.2] an unplaced requirer is not connected', () => {
    const world = makeWorld();
    setNode(world, 5, 'requirement');
    expect(isConnected(world, entityId(5))).toBe(false);
  });

  it('[GDD-10.2] the group lists the root and members in ascending order', () => {
    const world = makeWorld();
    setLocation(world, 1);
    setHub(world, 1);
    for (const [entity, role] of [
      [3, 'provider'],
      [4, 'provider'],
      [5, 'requirement'],
      [6, 'requirement'],
    ] as const) {
      setNode(world, entity, role);
      placeAt(world, entity, 1);
    }
    expect(groupOf(world, 1)?.members).toEqual([1, 3, 4, 5, 6]);
  });

  it('[GDD-10.2] without a provider the group holds only the root', () => {
    const world = makeWorld();
    setLocation(world, 1);
    setHub(world, 1);
    setNode(world, 5, 'requirement');
    placeAt(world, 5, 1);
    expect(groupOf(world, 1)?.members).toEqual([1]);
  });
});

describe('[TDS-8.4][INV-20] connectivity cache', () => {
  it('[TDS-8.4] the cache is excluded from the hash', () => {
    const world = makeWorld();
    setLocation(world, 1);
    setHub(world, 1);
    setNode(world, 3, 'provider');
    placeAt(world, 3, 1);
    const before = hashWorld(world, createEmptyRegistry());
    world.caches.connectivity = { groups: [] };
    expect(hashWorld(world, createEmptyRegistry())).toBe(before);
  });

  it('[TDS-8.4] phase 04 rebuilds a dirty cache', () => {
    const world = makeWorld();
    setLocation(world, 1);
    setHub(world, 1);
    setNode(world, 3, 'provider');
    placeAt(world, 3, 1);
    world.caches.connectivity = undefined;
    world.caches.dirty = true;
    runPhases(world, createEmptyRegistry(), [4], emptyInput);
    expect(world.caches.dirty).toBe(false);
    const cache = world.caches.connectivity as ConnectivityCache | undefined;
    expect(cache?.groups).toHaveLength(1);
    expect(cache?.groups[0]?.members).toEqual([1, 3]);
  });

  it('[TDS-8.4] groups are ordered by ascending location ID', () => {
    const world = makeWorld();
    for (const location of [1, 2]) {
      setLocation(world, location);
      setHub(world, location);
      setNode(world, location + 10, 'provider');
      placeAt(world, location + 10, location);
    }
    expect(buildConnectivityCache(world).groups.map((group) => group.location)).toEqual([1, 2]);
  });

  it('[INV-20] a full rebuild equals the prior cache', () => {
    const world = makeWorld();
    setLocation(world, 1);
    setHub(world, 1);
    setNode(world, 3, 'provider');
    placeAt(world, 3, 1);
    const first = buildConnectivityCache(world);
    rebuildConnectivityCaches(world);
    expect(world.caches.connectivity).toEqual(first);
  });

  it('[TDS-8.4] a clone leaves the cache dirty', () => {
    const world = makeWorld();
    setLocation(world, 1);
    setHub(world, 1);
    rebuildConnectivityCaches(world);
    const clone = cloneWorld(world);
    expect(clone.caches.dirty).toBe(true);
    expect(clone.caches.connectivity).toBeUndefined();
  });
});

describe('[ARCH-11] connectivity query', () => {
  it('[ARCH-11] the connected entities are reported', () => {
    const world = makeWorld();
    setLocation(world, 1);
    setHub(world, 1);
    setNode(world, 3, 'provider');
    placeAt(world, 3, 1);
    setNode(world, 5, 'requirement');
    placeAt(world, 5, 1);
    expect(connectedEntities(world, entityId(5))).toEqual([1, 3]);
  });

  it('[ARCH-11] an entity without a group has no connections', () => {
    const world = makeWorld();
    setNode(world, 5, 'requirement');
    expect(connectedEntities(world, entityId(5))).toEqual([]);
  });
});
