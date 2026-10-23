import { describe, expect, it } from 'vitest';
import { instantiateWorld, ids } from '@aesfw/core';
import type {
  Maintenance,
  NeedStates,
  PopulationGroup,
  Registry,
  Residence,
  Satisfaction,
  ThroughputPool,
} from '@aesfw/core';
import type { CompiledContent, ContentRegistry } from '@aesfw/content';
import { createSession } from '../session/session.js';
import { definitionMetadata } from './metadata.js';
import { entityDetail } from './entity-detail.js';
import { locationSummary } from './location-summary.js';
import { needBreakdown } from './need-breakdown.js';

const IDS: Record<string, number> = {
  'test.location.a': 1,
  'test.entity.residence': 9,
  'test.resource.a': 4,
  'test.recipe.a': 5,
  'test.tier.a': 3,
  'test.need.a': 6,
  'test.need_category.a': 7,
  'test.region.alpha': 20,
};

const stringIdOf: Registry['stringIdOf'] = (type, handle) => {
  for (const [id, value] of Object.entries(IDS)) {
    if (value === handle && id.startsWith(`test.${type}`)) return ids.stringId(id);
  }
  return null;
};

const registry: ContentRegistry = {
  stringIdOf,
  handleOf: (type, id) => {
    const value = IDS[id as string];
    return value === undefined ? null : ids.definitionHandle(value);
  },
  definitionOf: () => null,
  definitionsOf: (type) =>
    type === 'entity'
      ? [
          {
            id: 'test.entity.residence',
            handle: ids.definitionHandle(9),
            type: 'entity',
            data: { components: {} },
          },
        ]
      : [],
  tagsOf: (id) => (id === ids.stringId('test.entity.residence') ? ['test.tag.a'] : []),
};

const content: CompiledContent = {
  registry,
  checksum: 'checksum.1',
  packages: [],
  presentation: null,
};

const session = () => {
  const created = createSession(content, {
    sessionId: 'session.1',
    seed: [1, 2],
    tickDurationMs: 100,
    world: null,
    enabledModules: [],
    hashInterval: 0,
    journal: false,
    actor: ids.ownerHandle(0),
    actorId: 'test.owner.1',
  });
  if (!created.ok) throw new Error('session creation failed');
  const state = created.value;
  instantiateWorld(state.world, {
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
  const entity = ids.entityId(3);
  state.world.stores
    .get<{ definition: ReturnType<typeof ids.definitionHandle> }>('definition')
    .set(entity, { definition: ids.definitionHandle(9) });
  state.world.stores.get<Residence>('residence').set(entity, {
    tier: ids.definitionHandle(3),
    capacity: 100,
    location: ids.entityId(1),
    growthPolicy: null,
    consumptionFactor: 1000,
    outputs: [],
    needs: [
      {
        need: ids.definitionHandle(6),
        category: ids.definitionHandle(7),
        type: 'resource_consumption',
        resource: ids.definitionHandle(4),
        quantityPerPopulationPerTick: 2,
        measurementWindowTicks: 1,
        targetRatio: 1000,
      },
    ],
    categories: [],
    satisfactionAggregation: 'average',
  });
  state.world.stores
    .get<PopulationGroup>('populationGroup')
    .set(entity, { tier: ids.definitionHandle(3), count: 50, capacity: 100 });
  state.world.stores
    .get<NeedStates>('needStates')
    .set(entity, { needs: [{ need: ids.definitionHandle(6), demanded: 1000, window: [800] }] });
  state.world.stores
    .get<Satisfaction>('satisfaction')
    .set(entity, { z: 800, categories: [{ category: ids.definitionHandle(7), fulfillment: 800 }] });
  return state;
};

describe('[PIC-4] definitionMetadata', () => {
  it('[PIC-4] returns metadata with tags and parameters', () => {
    const metadata = definitionMetadata(content, 'entity');
    expect(metadata).toHaveLength(1);
    expect(metadata[0]?.definition_id).toBe('test.entity.residence');
    expect(metadata[0]?.tags).toEqual(['test.tag.a']);
    expect(metadata[0]?.locked).toBeUndefined();
  });

  it('[PIC-4][GDD-19] marks an unavailable definition as locked', () => {
    const metadata = definitionMetadata(content, 'entity', () => false);
    expect(metadata[0]?.locked).toBe(true);
  });
});

describe('[PIC-10.1] entityDetail', () => {
  it('[PIC-10.1] returns entity detail for a residence', () => {
    const detail = entityDetail(session(), 3);
    expect(detail?.definition_id).toBe('test.entity.residence');
    expect(detail?.enabled).toBe(true);
    expect(detail?.residence?.population).toBe(50);
    expect(detail?.available_commands).toContain('SetEntityEnabled');
  });

  it('[PIC-10.1] returns null for an unknown entity', () => {
    expect(entityDetail(session(), 999)).toBeNull();
  });

  it('[PIC-10.1][GDD-20.1] exposes the maintenance summary', () => {
    const state = session();
    state.world.stores.get<Maintenance>('maintenance').set(ids.entityId(3), {
      intervalTicks: 60,
      inputs: [
        { resource: ids.definitionHandle(4), quantity: 300 },
        { resource: ids.definitionHandle(5), quantity: 200 },
      ],
      chargePolicy: 'while_enabled',
      shortagePolicy: 'owner_deficit_policy',
      arrears: [],
    });
    const detail = entityDetail(state, 3);
    expect(detail?.maintenance).toEqual({ amount: 500, policy: 'while_enabled' });
  });
});

describe('[PIC-10.2] locationSummary', () => {
  it('[PIC-10.2] returns inventory and population totals', () => {
    const summary = locationSummary(session(), ids.ownerHandle(0), 1);
    expect(summary?.active).toBe(true);
    expect(summary?.population_by_tier?.['test.tier.a']).toBe(50);
    expect(summary?.entity_counts?.['entities']).toBe(1);
  });

  it('[PIC-10.2] reports the throughput pool when present', () => {
    const state = session();
    const pool: ThroughputPool = {
      policy: 'framework.inventory.throughput_limited',
      baseCapacity: 8000,
      baseThroughputCapability: null,
      capacity: 8000,
      requested: 1600,
      throttlePermille: 625,
    };
    state.world.stores.get<ThroughputPool>('throughputPool').set(ids.entityId(1), pool);
    const summary = locationSummary(state, ids.ownerHandle(0), 1);
    expect(summary?.throughput).toEqual({
      capacity: 8000,
      requested: 1600,
      throttle_permille: 625,
    });
  });

  it('[PIC-10.2] omits throughput when the location is unbounded', () => {
    expect(locationSummary(session(), ids.ownerHandle(0), 1)?.throughput).toBeUndefined();
  });

  it('[PIC-10.2][CONT-6.18] a regionful location reports its region', () => {
    const state = session();
    const store = state.world.stores.get<{ region: number | null }>('location');
    const location = store.get(ids.entityId(1));
    if (location === undefined) throw new Error('location missing');
    store.set(ids.entityId(1), { ...location, region: ids.definitionHandle(20) });
    expect(locationSummary(state, ids.ownerHandle(0), 1)?.region).toBe('test.region.alpha');
    store.set(ids.entityId(1), { ...location, region: null });
    expect(locationSummary(state, ids.ownerHandle(0), 1)?.region).toBeUndefined();
  });
});

describe('[PIC-10.3] needBreakdown', () => {
  it('[PIC-10.3] computes fulfillment from the window', () => {
    const breakdown = needBreakdown(session(), 3);
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0]?.demand).toBe(1000);
    expect(breakdown[0]?.delivered).toBe(800);
    expect(breakdown[0]?.fulfillment).toBe(800);
    expect(breakdown[0]?.category_result).toBe(800);
  });

  it('[PIC-10.3] returns an empty array for a non-residence', () => {
    expect(needBreakdown(session(), 1)).toEqual([]);
  });
});

describe('[PIC-10.1] deficit-paused entity detail', () => {
  it('[PIC-10.1] a deficit-paused entity reports the pause and the resume command', () => {
    const state = session();
    state.world.stores.get<{ owner: ids.OwnerHandle }>('owner').set(ids.entityId(3), {
      owner: ids.ownerHandle(0),
    });
    state.world.owners = {
      owners: [
        {
          handle: ids.ownerHandle(0),
          knowledge: [],
          accounts: [],
          purposeLocks: [],
          unlocks: [],
          deficitPaused: [ids.entityId(3)],
        },
      ],
    };
    const detail = entityDetail(state, 3);
    expect(detail?.paused_by_deficit).toBe(true);
    expect(detail?.available_commands).toContain('ResumeDeficitPausedEntities');
  });

  it('[PIC-10.1] a running entity reports no pause', () => {
    const detail = entityDetail(session(), 3);
    expect(detail?.paused_by_deficit).toBeUndefined();
    expect(detail?.available_commands).not.toContain('ResumeDeficitPausedEntities');
  });
});
