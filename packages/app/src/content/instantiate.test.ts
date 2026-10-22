import { describe, expect, it } from 'vitest';
import { createWorld, instantiateWorld, readWorld, ids } from '@aesfw/core';
import type { ConnectivityNode, ResourceSource, Residence, World } from '@aesfw/core';
import type { ContentRegistry } from '@aesfw/content';
import { instantiateContentEntities } from './instantiate.js';

const registry: ContentRegistry = {
  stringIdOf: (type, handle) =>
    type === 'entity' && handle === ids.definitionHandle(9)
      ? ids.stringId('test.entity.source')
      : null,
  handleOf: () => null,
  definitionOf: () => null,
  definitionsOf: (type) =>
    type === 'entity'
      ? [
          {
            id: 'test.entity.source',
            handle: ids.definitionHandle(9),
            type: 'entity',
            data: {
              components: {
                resource_source: {
                  policy: 'infinite_rate',
                  outputs: [{ resource: 'test.resource.a', quantity_per_tick: 10 }],
                },
              },
            },
          },
        ]
      : [],
  tagsOf: () => [],
};

describe('[TDS-8.3] entity definition component', () => {
  it('[TDS-8.3] instantiated entities have a definition component', () => {
    const created = createWorld(registry, {
      seed: [0, 0],
      tickDurationMs: 100,
      world: null,
      enabledModules: [],
    });
    if (!created.ok) throw new Error('world creation failed');
    const world = created.value;
    instantiateWorld(world, {
      owner: ids.ownerHandle(0),
      locations: [
        {
          template: ids.definitionHandle(1),
          spatialPolicy: 'abstract_capacity',
          capacity: 100,
          properties: [],
          region: null,
          active: true,
          inventories: [
            {
              capacity: { total: 1000, perResource: null },
              acceptance: { accepts: [] },
              policy: 'shared_location',
            },
          ],
        },
      ],
    });
    instantiateContentEntities(world, registry);
    const entity = ids.entityId(3);
    expect(readWorld(world, registry).definition(entity)).toBe(ids.definitionHandle(9));
  });
});

const sourceRegistry: ContentRegistry = {
  stringIdOf: () => null,
  handleOf: () => null,
  definitionOf: () => null,
  definitionsOf: (type) =>
    type === 'entity'
      ? [
          {
            id: 'test.entity.area_extractor',
            handle: ids.definitionHandle(9),
            type: 'entity',
            data: {
              components: {
                placement: {
                  footprint: [3, 3],
                  working_area: { cells: 12, exclusive: true },
                },
                resource_source: {
                  policy: 'area_dependent',
                  outputs: [{ resource: 'test.resource.a', quantity_per_tick: 66 }],
                  scale_by_property: 'test.property.suitability',
                },
              },
            },
          },
          {
            id: 'test.entity.regenerating_source',
            handle: ids.definitionHandle(10),
            type: 'entity',
            data: {
              components: {
                resource_source: {
                  policy: 'regenerating_deposit',
                  initial_quantity: 1000,
                  regeneration_per_tick: 100,
                  maximum_quantity: 1000,
                  outputs: [{ resource: 'test.resource.a', quantity_per_tick: 100 }],
                },
              },
            },
          },
        ]
      : [],
  tagsOf: () => [],
};

const instantiate = (registry: ContentRegistry): World => {
  const created = createWorld(registry, {
    seed: [0, 0],
    tickDurationMs: 100,
    world: null,
    enabledModules: [],
  });
  if (!created.ok) throw new Error('world creation failed');
  const world = created.value;
  instantiateWorld(world, {
    owner: ids.ownerHandle(0),
    locations: [
      {
        template: ids.definitionHandle(1),
        spatialPolicy: 'abstract_capacity',
        capacity: 100,
        properties: [],
        region: null,
        active: true,
        inventories: [
          {
            capacity: { total: 1000, perResource: null },
            acceptance: { accepts: [] },
            policy: 'shared_location',
          },
        ],
      },
    ],
  });
  instantiateContentEntities(world, registry);
  return world;
};

describe('[CONT-6.8] source entity instantiation', () => {
  it('[CONT-6.8] an area source carries its working area and scale property', () => {
    const world = instantiate(sourceRegistry);
    const store = world.stores.get<ResourceSource>('resourceSource');
    const sources = store.ids().map((id) => store.get(id));
    const area = sources.find((source) => source?.policy === 'area_dependent');
    expect(area?.workingAreaCells).toBe(12);
    expect(area?.workingAreaExclusive).toBe(true);
    expect(area?.scaleByProperty).toBe('test.property.suitability');
    expect(area?.outputs[0]?.remaining).toBeNull();
  });

  it('[CONT-6.8] a regenerating source carries its regeneration', () => {
    const world = instantiate(sourceRegistry);
    const store = world.stores.get<ResourceSource>('resourceSource');
    const sources = store.ids().map((id) => store.get(id));
    const regenerating = sources.find((source) => source?.policy === 'regenerating_deposit');
    expect(regenerating?.outputs[0]?.remaining).toBe(1000);
    expect(regenerating?.outputs[0]?.regeneration).toBe(100);
    expect(regenerating?.outputs[0]?.maximum).toBe(1000);
  });

  it('[INV-18] an infinite source keeps its base encoded shape', () => {
    const world = instantiate(registry);
    const store = world.stores.get<ResourceSource>('resourceSource');
    const id = store.ids()[0];
    const source = id === undefined ? undefined : store.get(id);
    expect(Object.keys(source ?? {}).sort()).toEqual([
      'inventory',
      'location',
      'outputs',
      'policy',
    ]);
  });
});

const connectivityRegistry: ContentRegistry = {
  stringIdOf: () => null,
  handleOf: () => null,
  definitionOf: () => null,
  definitionsOf: (type) =>
    type === 'entity'
      ? [
          {
            id: 'test.entity.refiner',
            handle: ids.definitionHandle(9),
            type: 'entity',
            data: { components: { connectivity: { requires: 'test.connectivity.hub' } } },
          },
          {
            id: 'test.entity.connector',
            handle: ids.definitionHandle(10),
            type: 'entity',
            data: { components: { connectivity: { provides: 'test.connectivity.hub' } } },
          },
          {
            id: 'test.entity.plain',
            handle: ids.definitionHandle(11),
            type: 'entity',
            data: {
              components: {
                resource_source: {
                  policy: 'infinite_rate',
                  outputs: [{ resource: 'test.resource.a', quantity_per_tick: 10 }],
                },
              },
            },
          },
        ]
      : [],
  tagsOf: () => [],
};

const connectivityNodes = (world: World): readonly (ConnectivityNode | undefined)[] => {
  const store = world.stores.get<ConnectivityNode>('connectivityNode');
  return store.ids().map((id) => store.get(id));
};

describe('[CONT-6.8] connectivity instantiation', () => {
  it('[CONT-6.8][GDD-9.2] a requiring definition yields a requirement node', () => {
    const nodes = connectivityNodes(instantiate(connectivityRegistry));
    expect(nodes).toContainEqual({
      role: 'requirement',
      network: ids.stringId('test.connectivity.hub'),
    });
  });

  it('[CONT-6.8][GDD-9.9] a providing definition yields a provider node', () => {
    const nodes = connectivityNodes(instantiate(connectivityRegistry));
    expect(nodes).toContainEqual({
      role: 'provider',
      network: ids.stringId('test.connectivity.hub'),
    });
  });

  it('[CONT-6.8] a definition without connectivity yields no node', () => {
    const nodes = connectivityNodes(instantiate(connectivityRegistry));
    expect(nodes).toHaveLength(2);
  });
});

const TIER_HANDLE = ids.definitionHandle(20);
const CURVE_HANDLE = ids.definitionHandle(21);

const tierRegistry: ContentRegistry = {
  stringIdOf: (type, handle2) => {
    if (type === 'tier' && handle2 === TIER_HANDLE) return ids.stringId('test.tier.a');
    if (type === 'curve' && handle2 === CURVE_HANDLE) return ids.stringId('test.curve.income');
    return null;
  },
  handleOf: (type, id) => {
    if (type === 'tier' && id === ids.stringId('test.tier.a')) return TIER_HANDLE;
    if (type === 'curve' && id === ids.stringId('test.curve.income')) return CURVE_HANDLE;
    return null;
  },
  definitionOf: (type, handle2) => {
    if (type === 'tier' && handle2 === TIER_HANDLE) {
      return {
        id: 'test.tier.a',
        handle: TIER_HANDLE,
        type: 'tier',
        data: {
          consumption_factor: 1000,
          outputs: [
            { resource: 'test.capability.a', scope: 'location', rate_per_population_per_tick: 1 },
            {
              resource: 'test.resource.credits',
              scope: 'owner',
              rate_per_population_per_tick: 10,
              satisfaction_curve: 'test.curve.income',
            },
          ],
        },
      };
    }
    if (type === 'curve' && handle2 === CURVE_HANDLE) {
      return {
        id: 'test.curve.income',
        handle: CURVE_HANDLE,
        type: 'curve',
        data: {
          type: 'piecewise_linear',
          points: [
            [0, 0],
            [1000, 1000],
          ],
          extrapolation: 'clamp',
        },
      };
    }
    return null;
  },
  definitionsOf: (type) =>
    type === 'entity'
      ? [
          {
            id: 'test.entity.residence',
            handle: ids.definitionHandle(30),
            type: 'entity',
            data: {
              components: {
                residence: { population_tier: 'test.tier.a', capacity: 10, initial_population: 4 },
              },
            },
          },
        ]
      : [],
  tagsOf: () => [],
};

describe('[GDD-11.3] income output instantiation', () => {
  it('[GDD-11.3][TDS-20.2] a configured satisfaction_curve is resolved to its handle', () => {
    const world = instantiate(tierRegistry);
    const store = world.stores.get<Residence>('residence');
    const residence = store.get(store.ids()[0] ?? ids.entityId(0));
    expect(residence?.outputs).toEqual([
      {
        resource: null,
        ratePerPopulationPerTick: 1,
        scope: 'location',
        satisfactionCurve: null,
      },
      {
        resource: null,
        ratePerPopulationPerTick: 10,
        scope: 'owner',
        satisfactionCurve: CURVE_HANDLE,
      },
    ]);
  });
});
