import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, ownerHandle } from '../../ids/index.js';
import { runPhases } from '../../pipeline/step.js';
import type { TickInput } from '../../pipeline/types.js';
import { createEmptyRegistry } from '../../registry/types.js';
import type { Registry } from '../../registry/types.js';
import { stores } from '../../testing.js';
import { createTransactionWriter } from '../../tx/index.js';
import type { Inventory } from '../../tx/inventory.js';
import { createWorld } from '../../world/create.js';
import type { World } from '../../world/types.js';
import type { Location, LocationHub } from '../location.js';
import type { ResourceSource } from '../production/types.js';
import { applyPlaceEntityPlan } from '../placement/apply.js';
import { effectiveInventoryCapacity, storageThroughputBonus } from './storage.js';
import { THROUGHPUT_LIMITED_POLICY } from './types.js';
import type { StorageProvider, ThroughputPool } from './types.js';

const registry = createEmptyRegistry();
const input: TickInput = { commands: [], options: { journal: false, hash: false } };
const res = (value: number) => definitionHandle(value);

const makeWorld = (): World => {
  const result = createWorld(registry, {
    seed: [1, 2],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
  });
  if (!result.ok) throw new Error('createWorld returned an error');
  const world = result.value;
  world.nextEntityId = entityId(100);
  world.owners = {
    owners: [
      {
        handle: ownerHandle(0),
        knowledge: [],
        accounts: [],
        purposeLocks: [],
        unlocks: [],
        deficitPaused: [],
      },
    ],
  };
  stores(world)
    .get<Location>('location')
    .set(entityId(1), {
      template: definitionHandle(0),
      spatialPolicy: 'framework.spatial.abstract_capacity',
      capacity: 1000,
      used: 0,
      properties: [],
      region: null,
      active: true,
      owner: ownerHandle(0),
    });
  stores(world)
    .get<LocationHub>('locationHub')
    .set(entityId(1), { inventories: [entityId(2)] });
  stores(world)
    .get<Inventory>('inventory')
    .set(entityId(2), {
      owner: ownerHandle(0),
      policy: 'framework.inventory.shared_location',
      revision: 0,
      entries: [],
      capacity: { total: 1000, perResource: null },
      acceptance: { accepts: [] },
    });
  return world;
};

const provider = (overrides: Partial<StorageProvider> = {}): StorageProvider => ({
  kind: 'storage_provider',
  inventory: entityId(2),
  location: entityId(1),
  capacityTotal: 500,
  capacityPerResource: 0,
  throughput: 2000,
  ...overrides,
});

const setProvider = (world: World, value: StorageProvider): void => {
  stores(world).get<StorageProvider>('modifierSet').set(entityId(5), value);
};

const deposit = (world: World, quantity: number) => {
  const writer = createTransactionWriter(world, null);
  return writer.atomic((builder) =>
    builder.deposit({
      inventory: entityId(2),
      resource: res(0),
      quantity,
      source: entityId(3),
    }),
  );
};

describe('[GDD-9.7][GDD-8.1] storage providers', () => {
  it('[GDD-9.7] a total capacity bonus raises the effective capacity', () => {
    const world = makeWorld();
    setProvider(world, provider());
    expect(effectiveInventoryCapacity(world, entityId(2)).total).toBe(1500);
  });

  it('[GDD-9.7] a per-resource bonus raises the per-resource capacity', () => {
    const world = makeWorld();
    stores(world)
      .get<Inventory>('inventory')
      .set(entityId(2), {
        ...(stores(world).get<Inventory>('inventory').get(entityId(2)) as Inventory),
        capacity: { total: null, perResource: 1000 },
      });
    setProvider(world, provider({ capacityTotal: 0, capacityPerResource: 500 }));
    expect(effectiveInventoryCapacity(world, entityId(2)).perResource).toBe(1500);
  });

  it('[GDD-9.7] a planned provider adds nothing', () => {
    const world = makeWorld();
    setProvider(world, provider());
    stores(world).get('lifecycle').set(entityId(5), { lifecycle: 'planned' });
    expect(effectiveInventoryCapacity(world, entityId(2)).total).toBe(1000);
    expect(storageThroughputBonus(world, entityId(1))).toBe(0);
  });

  it('[GDD-8.1] a deposit beyond the base capacity succeeds within the bonus', () => {
    const world = makeWorld();
    setProvider(world, provider());
    expect(deposit(world, 1500).ok).toBe(true);
  });

  it('[GDD-8.1] a deposit beyond the effective capacity is rejected', () => {
    const world = makeWorld();
    setProvider(world, provider());
    expect(deposit(world, 1500).ok).toBe(true);
    const rejected = deposit(world, 1);
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.error.code).toBe('insufficient_capacity');
  });

  it('[GDD-9.7] a placed storage provider records its expansion', () => {
    const world = makeWorld();
    const definitions: Registry = {
      stringIdOf: () => null,
      handleOf: () => null,
      definitionDataOf: (type, handle) =>
        type === 'entity' && handle === definitionHandle(40)
          ? {
              components: {
                placement: { footprint: [1, 1] },
                storage_provider: {
                  inventory: 'location.shared',
                  capacity: { total: 500 },
                  throughput: 2000,
                },
              },
            }
          : null,
    };
    const outcome = applyPlaceEntityPlan(
      world,
      definitions,
      {
        type: 'PlaceEntityPlan',
        definition: definitionHandle(40),
        location: entityId(1),
        transform: {
          location: entityId(1),
          position: { x: 0, y: 0 },
          orientation: 0,
        },
      },
      () => true,
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const stored = stores(world).get<StorageProvider>('modifierSet').get(outcome.entity);
    expect(stored?.capacityTotal).toBe(500);
    expect(stored?.throughput).toBe(2000);
  });

  it('[GDD-15.1] a throughput bonus raises the location pool capacity', () => {
    const world = makeWorld();
    setProvider(world, provider());
    const pool: ThroughputPool = {
      policy: THROUGHPUT_LIMITED_POLICY,
      baseCapacity: 6000,
      baseThroughputCapability: null,
      capacity: 6000,
      requested: 0,
      throttlePermille: 1000,
    };
    stores(world).get<ThroughputPool>('throughputPool').set(entityId(1), pool);
    const source: ResourceSource = {
      policy: 'infinite_rate',
      location: entityId(1),
      inventory: entityId(2),
      outputs: [{ resource: res(0), rate: 1000, remaining: null }],
    };
    stores(world).get<ResourceSource>('resourceSource').set(entityId(3), source);
    runPhases(world, registry, [9, 10], input);
    const updated = stores(world).get<ThroughputPool>('throughputPool').get(entityId(1));
    expect(updated?.capacity).toBe(8000);
  });
});
