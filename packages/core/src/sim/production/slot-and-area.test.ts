import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, ownerHandle, stringId } from '../../ids/index.js';
import { runPhases } from '../../pipeline/step.js';
import type { TickInput } from '../../pipeline/types.js';
import { createEmptyRegistry } from '../../registry/types.js';
import { stores } from '../../testing.js';
import { createWorld } from '../../world/create.js';
import type { World } from '../../world/types.js';
import type { Inventory } from '../../tx/inventory.js';
import { locationOf } from '../location.js';
import type { Location, LocationHub, SourceSlot } from '../location.js';
import { evaluateSourcePreconditions } from './preconditions.js';
import type { ResourceSource, SourceSlotBinding, WorkingAreaClaim } from './types.js';

const res = (value: number) => definitionHandle(value);
const input: TickInput = { commands: [], options: { journal: false, hash: false } };

const makeWorld = (): World => {
  const result = createWorld(createEmptyRegistry(), {
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
  return world;
};

const setLocation = (
  world: World,
  id: number,
  options: {
    readonly capacity?: number;
    readonly used?: number;
    readonly sourceSlots?: readonly SourceSlot[];
    readonly properties?: readonly {
      readonly property: ReturnType<typeof stringId>;
      readonly value: number;
    }[];
    readonly active?: boolean;
  } = {},
): void => {
  stores(world)
    .get<Location>('location')
    .set(entityId(id), {
      template: definitionHandle(0),
      spatialPolicy: 'framework.spatial.abstract_capacity',
      capacity: options.capacity ?? 100,
      used: options.used ?? 0,
      properties: options.properties ?? [],
      region: null,
      active: options.active ?? true,
      owner: ownerHandle(0),
      ...(options.sourceSlots === undefined ? {} : { sourceSlots: options.sourceSlots }),
    });
  stores(world).get<LocationHub>('locationHub').set(entityId(id), { inventories: [] });
};

const setInventory = (world: World, id: number): void => {
  stores(world)
    .get<Inventory>('inventory')
    .set(entityId(id), {
      owner: ownerHandle(0),
      policy: 'framework.inventory.shared_location',
      revision: 0,
      entries: [],
      capacity: { total: null, perResource: null },
      acceptance: { accepts: [] },
    });
};

const setSource = (world: World, id: number, source: ResourceSource): void => {
  stores(world).get<ResourceSource>('resourceSource').set(entityId(id), source);
};

const sourceOf = (world: World, id: number): ResourceSource | undefined =>
  stores(world).get<ResourceSource>('resourceSource').get(entityId(id));

const bindingOf = (world: World, id: number): SourceSlotBinding | undefined =>
  stores(world).get<SourceSlotBinding>('sourceSlotBinding').get(entityId(id));

const claimOf = (world: World, id: number): WorkingAreaClaim | undefined =>
  stores(world).get<WorkingAreaClaim>('workingArea').get(entityId(id));

const stock = (world: World, inventory: number, resource: number): number => {
  const component = stores(world).get<Inventory>('inventory').get(entityId(inventory));
  return component?.entries.find((entry) => entry.resource === resource)?.quantity ?? 0;
};

const slotSource = (slotType: string): ResourceSource => ({
  policy: 'slot_dependent',
  location: entityId(1),
  inventory: entityId(2),
  slotType: stringId(slotType),
  outputs: [{ resource: res(0), rate: 1000, remaining: null }],
});

const areaSource = (cells: number): ResourceSource => ({
  policy: 'area_dependent',
  location: entityId(1),
  inventory: entityId(2),
  scaleByProperty: stringId('test.property.suitability'),
  workingAreaCells: cells,
  outputs: [{ resource: res(0), rate: 66, remaining: null }],
});

describe('[GDD-9.5][GDD-6.5][ARCH-3.4] slot and area sources', () => {
  it('[GDD-9.5] the first slot sources by ascending ID claim the slots', () => {
    const world = makeWorld();
    setLocation(world, 1, { sourceSlots: [{ type: stringId('test.slot.a'), count: 2 }] });
    setSource(world, 5, slotSource('test.slot.a'));
    setSource(world, 6, slotSource('test.slot.a'));
    setSource(world, 7, slotSource('test.slot.a'));
    evaluateSourcePreconditions(world, () => true);
    expect(bindingOf(world, 5)).toEqual({ slotType: 'test.slot.a', location: 1 });
    expect(bindingOf(world, 6)).toEqual({ slotType: 'test.slot.a', location: 1 });
    expect(bindingOf(world, 7)).toBeUndefined();
    expect(sourceOf(world, 7)?.blockReasons).toEqual(['no_source_slot']);
  });

  it('[GDD-9.5] a bound slot persists across ticks', () => {
    const world = makeWorld();
    setLocation(world, 1, { sourceSlots: [{ type: stringId('test.slot.a'), count: 1 }] });
    setSource(world, 5, slotSource('test.slot.a'));
    evaluateSourcePreconditions(world, () => true);
    evaluateSourcePreconditions(world, () => true);
    expect(bindingOf(world, 5)).toEqual({ slotType: 'test.slot.a', location: 1 });
    expect(sourceOf(world, 5)?.blockReasons).toBeUndefined();
  });

  it('[GDD-9.5] a source with no matching slot type is blocked', () => {
    const world = makeWorld();
    setLocation(world, 1, { sourceSlots: [{ type: stringId('test.slot.a'), count: 0 }] });
    setSource(world, 5, slotSource('test.slot.a'));
    evaluateSourcePreconditions(world, () => true);
    expect(sourceOf(world, 5)?.blockReasons).toEqual(['no_source_slot']);
  });

  it('[GDD-9.5] a source without a slot type is blocked', () => {
    const world = makeWorld();
    setLocation(world, 1, { sourceSlots: [{ type: stringId('test.slot.a'), count: 1 }] });
    setSource(world, 5, {
      policy: 'slot_dependent',
      location: entityId(1),
      inventory: entityId(2),
      outputs: [{ resource: res(0), rate: 1000, remaining: null }],
    });
    evaluateSourcePreconditions(world, () => true);
    expect(sourceOf(world, 5)?.blockReasons).toEqual(['no_source_slot']);
  });

  it('[GDD-9.5] an area source claims its working area', () => {
    const world = makeWorld();
    setLocation(world, 1, { capacity: 100, used: 0 });
    setSource(world, 5, areaSource(12));
    evaluateSourcePreconditions(world, () => true);
    expect(claimOf(world, 5)).toEqual({ location: 1, cells: 12, exclusive: true });
    expect(sourceOf(world, 5)?.blockReasons).toBeUndefined();
  });

  it('[GDD-9.5] the first area source by ascending ID claims the area', () => {
    const world = makeWorld();
    setLocation(world, 1, { capacity: 20, used: 0 });
    setSource(world, 5, areaSource(12));
    setSource(world, 6, areaSource(12));
    evaluateSourcePreconditions(world, () => true);
    expect(claimOf(world, 5)).toEqual({ location: 1, cells: 12, exclusive: true });
    expect(claimOf(world, 6)).toBeUndefined();
    expect(sourceOf(world, 6)?.blockReasons).toEqual(['no_working_area']);
  });

  it('[GDD-9.5] an area source without a working area is blocked', () => {
    const world = makeWorld();
    setLocation(world, 1, { capacity: 100, used: 0 });
    setSource(world, 5, {
      policy: 'area_dependent',
      location: entityId(1),
      inventory: entityId(2),
      outputs: [{ resource: res(0), rate: 66, remaining: null }],
    });
    evaluateSourcePreconditions(world, () => true);
    expect(sourceOf(world, 5)?.blockReasons).toEqual(['no_working_area']);
  });

  it('[GDD-9.5] a blocked area source claims nothing', () => {
    const world = makeWorld();
    setLocation(world, 1, { capacity: 100, used: 0 });
    stores(world).get('enabled').set(entityId(5), { enabled: false });
    setSource(world, 5, areaSource(12));
    evaluateSourcePreconditions(world, () => true);
    expect(claimOf(world, 5)).toBeUndefined();
    expect(sourceOf(world, 5)?.blockReasons).toEqual(['entity_disabled']);
  });

  it('[GDD-9.5] a blocked source extracts nothing', () => {
    const world = makeWorld();
    setLocation(world, 1);
    setInventory(world, 2);
    setSource(world, 5, { ...slotSource('test.slot.a'), blockReasons: ['no_source_slot'] });
    runPhases(world, createEmptyRegistry(), [12, 13], input);
    expect(stock(world, 2, 0)).toBe(0);
  });

  it('[GDD-6.5] an area source scales its deposit by the location property', () => {
    const world = makeWorld();
    setLocation(world, 1, {
      capacity: 100,
      used: 0,
      properties: [{ property: stringId('test.property.suitability'), value: 500 }],
    });
    setInventory(world, 2);
    setSource(world, 5, areaSource(12));
    runPhases(world, createEmptyRegistry(), [7, 12, 13], input);
    expect(stock(world, 2, 0)).toBe(33);
  });

  it('[GDD-6.5] an area source without the property extracts nothing', () => {
    const world = makeWorld();
    setLocation(world, 1, { capacity: 100, used: 0 });
    setInventory(world, 2);
    setSource(world, 5, areaSource(12));
    runPhases(world, createEmptyRegistry(), [7, 12, 13], input);
    expect(stock(world, 2, 0)).toBe(0);
  });

  it('[GDD-9.5] the location component carries its source slots', () => {
    const world = makeWorld();
    setLocation(world, 1, {
      sourceSlots: [
        { type: stringId('test.slot.a'), count: 2 },
        { type: stringId('test.slot.b'), count: 0 },
      ],
    });
    expect(locationOf(world, entityId(1))?.sourceSlots).toEqual([
      { type: 'test.slot.a', count: 2 },
      { type: 'test.slot.b', count: 0 },
    ]);
  });
});
