import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, ownerHandle, stringId } from '../ids/index.js';
import { createEmptyRegistry } from '../registry/types.js';
import { hashWorld } from '../world/codec.js';
import { createWorld } from '../world/create.js';
import type { World } from '../world/types.js';
import type { Inventory } from '../tx/inventory.js';
import { instantiateWorld } from './instantiate.js';
import type { WorldPlan } from './instantiate.js';
import { locationHubOf, locationOf } from './location.js';

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
      inventories: [
        {
          capacity: { total: 1000, perResource: null },
          acceptance: { accepts: [] },
          policy: 'framework.inventory.shared_location',
        },
      ],
    },
  ],
};

describe('[CONT-6.4][CONT-6.6][ARCH-3.1] default world instantiation', () => {
  it('[CONT-6.6] one location with one inventory is instantiated', () => {
    const world = makeWorld();
    instantiateWorld(world, plan);
    expect(locationOf(world, entityId(1))).toMatchObject({ capacity: 100, used: 0, active: true });
    expect(locationHubOf(world, entityId(1))).toEqual({ inventories: [2] });
    expect(world.stores.get<Inventory>('inventory').get(entityId(2))).toMatchObject({
      owner: 0,
      policy: 'framework.inventory.shared_location',
      entries: [],
    });
  });

  it('[ARCH-3.1] instantiation is deterministic', () => {
    const first = makeWorld();
    const second = makeWorld();
    instantiateWorld(first, plan);
    instantiateWorld(second, plan);
    expect(hashWorld(first, createEmptyRegistry())).toBe(hashWorld(second, createEmptyRegistry()));
  });

  it('[CONT-6.6] the owner is registered', () => {
    const world = makeWorld();
    instantiateWorld(world, plan);
    expect(world.owners.owners[ownerHandle(0)]?.handle).toBe(0);
  });

  it('[ARCH-3.1] identifiers advance monotonically', () => {
    const world = makeWorld();
    instantiateWorld(world, plan);
    expect(world.nextEntityId).toBe(3);
  });

  it('[CONT-6.4] a fixed grid plan sets the geometry and buildable capacity', () => {
    const world = makeWorld();
    instantiateWorld(world, {
      owner: ownerHandle(0),
      locations: [
        {
          template: definitionHandle(0),
          spatialPolicy: 'framework.spatial.grid',
          capacity: 16,
          properties: [],
          region: null,
          active: true,
          inventories: [],
          grid: { width: 4, height: 4, blocked: [0, 1, 4, 5], buildableRatio: null },
        },
      ],
    });
    expect(locationOf(world, entityId(1))?.grid).toEqual({
      width: 4,
      height: 4,
      blocked: [0, 1, 4, 5],
    });
    expect(locationOf(world, entityId(1))?.capacity).toBe(12);
  });

  it('[CONT-6.4] a seeded grid plan is deterministic', () => {
    const grid = { width: 4, height: 4, blocked: null, buildableRatio: { min: 500, max: 500 } };
    const makePlan = (): WorldPlan => ({
      owner: ownerHandle(0),
      locations: [
        {
          template: definitionHandle(0),
          spatialPolicy: 'framework.spatial.grid',
          capacity: 16,
          properties: [],
          region: null,
          active: true,
          inventories: [],
          grid,
        },
      ],
    });
    const first = makeWorld();
    const second = makeWorld();
    instantiateWorld(first, makePlan());
    instantiateWorld(second, makePlan());
    expect(locationOf(first, entityId(1))?.grid?.blocked).toHaveLength(8);
    expect(locationOf(first, entityId(1))?.capacity).toBe(8);
    expect(hashWorld(first, createEmptyRegistry())).toBe(hashWorld(second, createEmptyRegistry()));
  });
});

describe('[CONT-6.6][GDD-6.3] multi-location world instantiation', () => {
  const plan = (): WorldPlan => ({
    owner: ownerHandle(0),
    owners: [
      {
        handle: ownerHandle(0),
        accounts: [{ resource: definitionHandle(4), amount: 1000 }],
        knowledge: [{ locationIndex: 0, level: 'established' }],
      },
      { handle: ownerHandle(1), accounts: [], knowledge: [] },
    ],
    locations: [
      {
        template: definitionHandle(0),
        spatialPolicy: 'framework.spatial.abstract_capacity',
        capacity: 100,
        properties: [],
        region: null,
        active: true,
        inventories: [],
        owner: ownerHandle(0),
      },
      {
        template: definitionHandle(1),
        spatialPolicy: 'framework.spatial.abstract_capacity',
        capacity: 100,
        properties: [],
        region: null,
        active: true,
        inventories: [],
        owner: ownerHandle(1),
      },
    ],
    connections: [
      {
        id: stringId('test.conn.a_b'),
        definition: definitionHandle(2),
        originIndex: 0,
        destinationIndex: 1,
        direction: 'bidirectional',
        baseDurationTicks: 300,
        enabled: true,
        allowedTransportTags: [stringId('test.transport.standard')],
      },
    ],
  });

  it('[CONT-6.6] owners and their accounts are instantiated', () => {
    const world = makeWorld();
    instantiateWorld(world, plan());
    expect(world.owners.owners).toHaveLength(2);
    expect(world.owners.owners[0]?.accounts).toEqual([
      { resource: definitionHandle(4), amount: 1000 },
    ]);
    expect(world.owners.owners[0]?.knowledge).toEqual([
      { location: entityId(1), level: 'established' },
    ]);
  });

  it('[CONT-6.6] each location belongs to its declared owner', () => {
    const world = makeWorld();
    instantiateWorld(world, plan());
    expect(locationOf(world, entityId(1))?.owner).toBe(ownerHandle(0));
    expect(locationOf(world, entityId(2))?.owner).toBe(ownerHandle(1));
  });

  it('[GDD-6.3] a bidirectional connection is present at both endpoints', () => {
    const world = makeWorld();
    instantiateWorld(world, plan());
    expect(locationOf(world, entityId(1))?.connections?.[0]?.id).toBe(stringId('test.conn.a_b'));
    expect(locationOf(world, entityId(2))?.connections?.[0]?.id).toBe(stringId('test.conn.a_b'));
    expect(locationOf(world, entityId(1))?.connections?.[0]?.baseDurationTicks).toBe(300);
  });
});

describe('[GDD-6.5][CONT-6.18][TDS-15] seeded distribution-rule generation', () => {
  const alpha = definitionHandle(10);
  const beta = definitionHandle(11);
  const descriptor = {
    streamName: 'test.generation',
    regions: [alpha, beta],
    propertyNames: [
      stringId('test.property.suitability_a'),
      stringId('test.property.suitability_b'),
    ],
    slotTypes: [stringId('test.slot.deposit_a'), stringId('test.slot.deposit_b')],
  };
  const generatedPlan = (): WorldPlan => ({
    owner: ownerHandle(0),
    locations: [
      {
        template: definitionHandle(0),
        spatialPolicy: 'framework.spatial.abstract_capacity',
        capacity: 100,
        properties: [],
        region: alpha,
        active: true,
        inventories: [],
        generated: descriptor,
      },
      {
        template: definitionHandle(0),
        spatialPolicy: 'framework.spatial.abstract_capacity',
        capacity: 100,
        properties: [],
        region: beta,
        active: true,
        inventories: [],
        generated: descriptor,
      },
    ],
  });

  it('[GDD-6.5] unauthored matched names are filled with 1000 in the owning region', () => {
    const world = makeWorld();
    instantiateWorld(world, generatedPlan());
    const first = locationOf(world, entityId(1));
    const second = locationOf(world, entityId(2));
    expect(first?.properties).toHaveLength(2);
    expect(second?.properties).toHaveLength(2);
    for (const name of descriptor.propertyNames) {
      const a = first?.properties.find((entry) => entry.property === name);
      const b = second?.properties.find((entry) => entry.property === name);
      expect([a?.value, b?.value].sort((x, y) => (x ?? 0) - (y ?? 0))).toEqual([0, 1000]);
    }
  });

  it('[GDD-6.5] authored values are not overwritten', () => {
    const plan = generatedPlan();
    const location = plan.locations[0];
    if (location === undefined) throw new Error('plan location missing');
    const authored: WorldPlan['locations'][number] = {
      ...location,
      properties: [{ property: stringId('test.property.suitability_a'), value: 400 }],
    };
    const world = makeWorld();
    instantiateWorld(world, { ...plan, locations: [authored, ...plan.locations.slice(1)] });
    const first = locationOf(world, entityId(1));
    expect(
      first?.properties.find((entry) => entry.property === stringId('test.property.suitability_a'))
        ?.value,
    ).toBe(400);
    expect(
      first?.properties.find((entry) => entry.property === stringId('test.property.suitability_b'))
        ?.value,
    ).toBeDefined();
  });

  it('[GDD-6.5] a location without authored slots receives its region-owned slot types', () => {
    const world = makeWorld();
    instantiateWorld(world, generatedPlan());
    const first = locationOf(world, entityId(1));
    const second = locationOf(world, entityId(2));
    expect(first?.sourceSlots).toBeDefined();
    expect(second?.sourceSlots).toBeDefined();
    const firstTypes = (first?.sourceSlots ?? []).map((slot) => slot.type);
    const secondTypes = (second?.sourceSlots ?? []).map((slot) => slot.type);
    for (const type of descriptor.slotTypes) {
      expect([firstTypes, secondTypes].filter((types) => types.includes(type))).toHaveLength(1);
    }
    for (const slot of [...(first?.sourceSlots ?? []), ...(second?.sourceSlots ?? [])]) {
      expect(slot.count).toBe(1);
    }
  });

  it('[GDD-6.5][TDS-15] the same seed reproduces identical generated attributes', () => {
    const run = (seed: readonly [number, number]): World => {
      const result = createWorld(createEmptyRegistry(), {
        seed: [seed[0], seed[1]],
        tickDurationMs: 1000,
        world: null,
        enabledModules: [],
      });
      if (!result.ok) throw new Error('createWorld returned an error');
      instantiateWorld(result.value, generatedPlan());
      return result.value;
    };
    const first = run([7, 11]);
    const second = run([7, 11]);
    expect(locationOf(first, entityId(1))?.properties).toEqual(
      locationOf(second, entityId(1))?.properties,
    );
    expect(locationOf(first, entityId(1))?.sourceSlots).toEqual(
      locationOf(second, entityId(1))?.sourceSlots,
    );
    for (const name of descriptor.propertyNames) {
      const owners = [first, second]
        .flatMap((world) => [1, 2].map((id) => locationOf(world, entityId(id))))
        .map(
          (location) =>
            location?.properties.find((entry) => entry.property === name)?.value === 1000,
        )
        .filter((owns) => owns);
      expect(owners).toHaveLength(2);
    }
  });

  it('[GDD-6.5] different seeds can produce different assignments', () => {
    const attributes = (seed: readonly [number, number]): number[] => {
      const result = createWorld(createEmptyRegistry(), {
        seed: [seed[0], seed[1]],
        tickDurationMs: 1000,
        world: null,
        enabledModules: [],
      });
      if (!result.ok) throw new Error('createWorld returned an error');
      instantiateWorld(result.value, generatedPlan());
      const location = locationOf(result.value, entityId(1));
      return (location?.properties ?? []).map((entry) => entry.value);
    };
    const outcomes = new Set<string>();
    for (let seed = 0; seed < 32; seed += 1) {
      outcomes.add(JSON.stringify(attributes([seed, seed + 1000])));
    }
    expect(outcomes.size).toBeGreaterThan(1);
  });
});
