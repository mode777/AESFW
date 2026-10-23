import { describe, expect, it } from 'vitest';
import { instantiateWorld, ids } from '@aesfw/core';
import type {
  ConnectivityNode,
  Footprint,
  Inventory,
  LogicalTransform,
  Maintenance,
  Producer,
  Registry,
  StorageProvider,
  ThroughputPool,
} from '@aesfw/core';
import { applyDelta } from '@aesfw/protocol';
import type { CompiledContent } from '@aesfw/content';
import { createSession } from '../session/session.js';
import { diffProjection } from './diff.js';
import { project } from './project.js';

const IDS: Record<string, number> = {
  'test.location.a': 1,
  'test.entity.producer': 9,
  'test.resource.a': 4,
  'test.recipe.a': 5,
};

const registry: Registry = {
  stringIdOf: (type, handle) => {
    for (const [id, value] of Object.entries(IDS)) {
      if (value === handle && id.startsWith(`test.${type}`)) return ids.stringId(id);
    }
    return null;
  },
  handleOf: (type, id) => {
    const value = IDS[id as string];
    return value === undefined ? null : ids.definitionHandle(value);
  },
  definitionDataOf: (type, handle) =>
    type === 'resource' && handle === ids.definitionHandle(6)
      ? { id: 'test.resource.credits', storage: { policy: 'normal', scope: 'owner' } }
      : null,
};

const content: CompiledContent = {
  registry,
  checksum: 'checksum.1',
  packages: [],
  presentation: null,
};

const producer = (): Producer => ({
  recipes: [
    {
      recipe: ids.definitionHandle(5),
      mode: 'batch',
      duration: 10,
      inputs: [],
      outputs: [],
      capabilities: [],
      condition: null,
    },
  ],
  recipe: ids.definitionHandle(5),
  processSlots: 1,
  location: ids.entityId(1),
  inputInventory: ids.entityId(2),
  outputInventory: ids.entityId(2),
  state: 'idle',
  blockReasons: [],
  progress: 0,
  inputReservations: [],
  capacityReservations: [],
});

const session = (options: { grid?: boolean } = {}) => {
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
        spatialPolicy: options.grid === true ? 'grid' : 'abstract_capacity',
        capacity: options.grid === true ? 0 : 100,
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
        ...(options.grid === true
          ? { grid: { width: 4, height: 3, blocked: [1, 6], buildableRatio: null } }
          : {}),
      },
    ],
  });
  state.world.stores.get<Producer>('producer').set(ids.entityId(3), producer());
  state.world.stores
    .get<{ definition: ReturnType<typeof ids.definitionHandle> }>('definition')
    .set(ids.entityId(3), { definition: ids.definitionHandle(9) });
  return state;
};

const place = (
  state: ReturnType<typeof session>,
  entity: number,
  position: { x: number; y: number },
  orientation: 0 | 1 | 2 | 3,
  footprint?: { width: number; height: number },
): void => {
  state.world.stores.get<LogicalTransform>('transform').set(ids.entityId(entity), {
    location: ids.entityId(1),
    position,
    orientation,
  });
  if (footprint !== undefined) {
    state.world.stores.get<Footprint>('footprint').set(ids.entityId(entity), footprint);
  }
};

const connect = (
  state: ReturnType<typeof session>,
  entity: number,
  role: 'provider' | 'requirement',
  network: string,
): void => {
  state.world.stores
    .get<ConnectivityNode>('connectivityNode')
    .set(ids.entityId(entity), { role, network: ids.stringId(network) });
};

describe('[PIC-9.1] project', () => {
  it('[PIC-9.1] a projection contains the owner, location, and entity', () => {
    const state = session();
    const snapshot = project(state, ids.ownerHandle(0));
    expect(snapshot.owners).toHaveLength(1);
    expect(snapshot.locations).toHaveLength(1);
    expect(snapshot.locations[0]?.inventories).toHaveLength(1);
    expect(snapshot.entities).toHaveLength(1);
    expect(snapshot.entities[0]?.definition_id).toBe('test.entity.producer');
    expect(snapshot.entities[0]?.production?.recipe_id).toBe('test.recipe.a');
  });

  it('[PIC-9.1][GDD-9.7] an inventory exposes its effective capacity', () => {
    const state = session();
    state.world.stores.get<Inventory>('inventory').set(ids.entityId(2), {
      owner: ids.ownerHandle(0),
      policy: 'framework.inventory.shared_location',
      revision: 0,
      entries: [{ resource: ids.definitionHandle(4), quantity: 100 }],
      capacity: { total: 1000, perResource: null },
      acceptance: { accepts: [] },
    });
    const provider: StorageProvider = {
      kind: 'storage_provider',
      inventory: ids.entityId(2),
      location: ids.entityId(1),
      capacityTotal: 500,
      capacityPerResource: 0,
      throughput: 0,
    };
    state.world.stores.get<StorageProvider>('modifierSet').set(ids.entityId(7), provider);
    const snapshot = project(state, ids.ownerHandle(0));
    const entry = snapshot.locations[0]?.inventories?.[0]?.entries[0];
    expect(entry?.capacity).toBe(1500);
  });

  it('[PIC-9.1][GDD-15.1] a throughput-limited location exposes its pool', () => {
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
    const snapshot = project(state, ids.ownerHandle(0));
    expect(snapshot.locations[0]?.throughput).toEqual({
      capacity: 8000,
      requested: 1600,
      throttle_permille: 625,
    });
  });

  it('[PIC-9.1] an unbounded location omits throughput', () => {
    const snapshot = project(session(), ids.ownerHandle(0));
    expect(snapshot.locations[0]?.throughput).toBeUndefined();
  });

  it('[PIC-9.1] projection order is ascending entity ID', () => {
    const state = session();
    state.world.stores.get<Producer>('producer').set(ids.entityId(4), producer());
    const snapshot = project(state, ids.ownerHandle(0));
    expect(snapshot.entities.map((entity) => entity.entity_id)).toEqual([3, 4]);
  });
});

describe('[PIC-9.2] diffProjection', () => {
  it('[PIC-9.2] an unchanged projection yields an empty delta', () => {
    const state = session();
    const snapshot = project(state, ids.ownerHandle(0));
    const delta = diffProjection(snapshot, snapshot);
    expect(delta.entity_updates).toEqual([]);
    expect(delta.inventory_updates).toEqual([]);
  });

  it('[PIC-9.2] a changed field appears in the delta', () => {
    const state = session();
    const before = project(state, ids.ownerHandle(0));
    const entity = ids.entityId(3);
    state.world.stores
      .get<Producer>('producer')
      .set(entity, { ...producer(), progress: 5, state: 'processing' });
    state.revision = 1;
    const after = project(state, ids.ownerHandle(0));
    const delta = diffProjection(before, after);
    expect(delta.entity_updates.some((update) => update.component === 'production')).toBe(true);
  });
});

describe('[PIC-18] P-10 round-trip', () => {
  it('[PIC-18] applying the delta yields the next projection', () => {
    const state = session();
    const before = project(state, ids.ownerHandle(0));
    state.world.stores
      .get<Producer>('producer')
      .set(ids.entityId(3), { ...producer(), progress: 5 });
    state.revision = 1;
    const after = project(state, ids.ownerHandle(0));
    const applied = applyDelta(before, diffProjection(before, after));
    expect(applied).toEqual(after);
  });
});

describe('[PIC-9.1] spatial projection', () => {
  it('[PIC-9.1] a grid location exposes its geometry [CONT-6.4]', () => {
    const snapshot = project(session({ grid: true }), ids.ownerHandle(0));
    expect(snapshot.locations[0]?.grid).toEqual({ width: 4, height: 3, blocked: [1, 6] });
  });

  it('[PIC-9.1] an abstract location omits the grid [CONT-6.4]', () => {
    const snapshot = project(session(), ids.ownerHandle(0));
    expect(snapshot.locations[0]?.grid).toBeUndefined();
  });

  it('[PIC-9.3] the grid is projected per actor', () => {
    const state = session({ grid: true });
    instantiateWorld(state.world, { owner: ids.ownerHandle(1), locations: [] });
    const first = project(state, ids.ownerHandle(0));
    const second = project(state, ids.ownerHandle(1));
    expect(second.locations[0]?.grid).toBeDefined();
    expect(first.locations[0]?.grid).toEqual(second.locations[0]?.grid);
  });

  it('[PIC-9.1] a placed entity exposes its transform and footprint [TDS-18.4]', () => {
    const state = session();
    place(state, 3, { x: 10, y: 12 }, 1, { width: 2, height: 3 });
    const snapshot = project(state, ids.ownerHandle(0));
    expect(snapshot.entities[0]?.spatial).toEqual({
      logical_position: [10, 12],
      orientation: 1,
      footprint: { width: 2, height: 3 },
    });
  });

  it('[PIC-9.1] a placed entity without a footprint still exposes its position', () => {
    const state = session();
    place(state, 3, { x: 10, y: 12 }, 0);
    const snapshot = project(state, ids.ownerHandle(0));
    expect(snapshot.entities[0]?.spatial?.logical_position).toEqual([10, 12]);
    expect(snapshot.entities[0]?.spatial?.footprint).toBeUndefined();
  });

  it('[PIC-9.1] an unplaced entity omits spatial', () => {
    const snapshot = project(session(), ids.ownerHandle(0));
    expect(snapshot.entities[0]?.spatial).toBeUndefined();
  });
});

describe('[PIC-9.1] connectivity projection', () => {
  it('[PIC-9.1] a connected requirement is exposed [GDD-9.2]', () => {
    const state = session();
    place(state, 3, { x: 1, y: 1 }, 0);
    connect(state, 3, 'requirement', 'test.connectivity.hub');
    state.world.stores.get<Producer>('producer').set(ids.entityId(4), producer());
    place(state, 4, { x: 2, y: 2 }, 0);
    connect(state, 4, 'provider', 'test.connectivity.hub');
    const snapshot = project(state, ids.ownerHandle(0));
    const entity = snapshot.entities.find((entry) => entry.entity_id === 3);
    expect(entity?.connectivity).toEqual({
      role: 'requirement',
      network: 'test.connectivity.hub',
      connected: true,
    });
  });

  it('[PIC-9.1] an unconnected requirement is exposed [GDD-9.9]', () => {
    const state = session();
    place(state, 3, { x: 1, y: 1 }, 0);
    connect(state, 3, 'requirement', 'test.connectivity.hub');
    const snapshot = project(state, ids.ownerHandle(0));
    expect(snapshot.entities[0]?.connectivity).toEqual({
      role: 'requirement',
      network: 'test.connectivity.hub',
      connected: false,
    });
  });

  it('[PIC-9.1] a provider is exposed [GDD-9.2]', () => {
    const state = session();
    place(state, 3, { x: 1, y: 1 }, 0);
    connect(state, 3, 'provider', 'test.connectivity.hub');
    const snapshot = project(state, ids.ownerHandle(0));
    expect(snapshot.entities[0]?.connectivity?.role).toBe('provider');
  });

  it('[PIC-9.1] an entity without a node omits connectivity', () => {
    const snapshot = project(session(), ids.ownerHandle(0));
    expect(snapshot.entities[0]?.connectivity).toBeUndefined();
  });
});

describe('[PIC-9.2] connectivity delta', () => {
  it('[PIC-9.2] a connectivity change appears in the delta', () => {
    const state = session();
    place(state, 3, { x: 1, y: 1 }, 0);
    connect(state, 3, 'requirement', 'test.connectivity.hub');
    const before = project(state, ids.ownerHandle(0));
    state.world.stores.get<Producer>('producer').set(ids.entityId(4), producer());
    place(state, 4, { x: 2, y: 2 }, 0);
    connect(state, 4, 'provider', 'test.connectivity.hub');
    state.revision = 1;
    const after = project(state, ids.ownerHandle(0));
    const delta = diffProjection(before, after);
    expect(delta.entity_updates.some((update) => update.component === 'connectivity')).toBe(true);
  });
});

describe('[PIC-10.6] owner economy read model', () => {
  const economySession = () => {
    const state = session();
    const credits = ids.definitionHandle(6);
    state.world.owners = {
      owners: [
        {
          handle: ids.ownerHandle(0),
          knowledge: [],
          accounts: [{ resource: credits, amount: 1000 }],
          purposeLocks: [],
          unlocks: [],
          deficitPaused: [ids.entityId(5), ids.entityId(4)],
        },
      ],
    };
    const addOwner = (entity: number): void => {
      state.world.stores
        .get<{ owner: ids.OwnerHandle }>('owner')
        .set(ids.entityId(entity), { owner: ids.ownerHandle(0) });
    };
    // Residence (entity 10) of tier 9 producing 10 credits per population per tick.
    addOwner(10);
    state.world.stores.get('residence').set(ids.entityId(10), {
      tier: ids.definitionHandle(9),
      capacity: 10,
      location: null,
      growthPolicy: null,
      consumptionFactor: 1000,
      outputs: [
        {
          resource: credits,
          ratePerPopulationPerTick: 10,
          scope: 'owner',
          satisfactionCurve: null,
        },
      ],
    });
    state.world.stores
      .get('populationGroup')
      .set(ids.entityId(10), { tier: ids.definitionHandle(9), count: 1, capacity: 10 });
    // High-maintenance producer (entity 3): 500 per 10 ticks, idle.
    addOwner(3);
    state.world.stores.get<Maintenance>('maintenance').set(ids.entityId(3), {
      intervalTicks: 10,
      inputs: [{ resource: credits, quantity: 500 }],
      chargePolicy: 'while_enabled',
      shortagePolicy: 'ignore',
      arrears: [],
    });
    // Low-maintenance entity (entity 4): 100 per 10 ticks.
    addOwner(4);
    state.world.stores.get<Maintenance>('maintenance').set(ids.entityId(4), {
      intervalTicks: 10,
      inputs: [{ resource: credits, quantity: 100 }],
      chargePolicy: 'while_enabled',
      shortagePolicy: 'ignore',
      arrears: [],
    });
    return { state, credits };
  };

  it('[PIC-10.6] the balance carries revenue, expenses, and pause order', () => {
    const { state } = economySession();
    const snapshot = project(state, ids.ownerHandle(0));
    const balance = snapshot.owners[0]?.balance;
    expect(balance?.revenue_per_interval).toBe(10);
    expect(balance?.expenses_per_interval).toBe(50);
    expect(balance?.net_per_interval).toBe(-40);
    expect(balance?.deficit_paused_entities).toEqual([ids.entityId(5), ids.entityId(4)]);
  });

  it('[PIC-10.6] revenue by source names the tier and expenses name entities', () => {
    const { state } = economySession();
    const snapshot = project(state, ids.ownerHandle(0));
    const balance = snapshot.owners[0]?.balance;
    expect(balance?.revenue_by_source).toEqual({ 'tier.9': 10 });
    expect(balance?.expenses_by_source).toEqual({ 'entity.3': 50 });
  });

  it('[PIC-10.6] an idle producer that still pays is listed', () => {
    const { state } = economySession();
    const snapshot = project(state, ids.ownerHandle(0));
    expect(snapshot.owners[0]?.balance?.idle_paying_entities).toEqual([ids.entityId(3)]);
  });

  it('[PIC-10.6] a processing producer is not idle-paying', () => {
    const { state } = economySession();
    const producer = state.world.stores.get<Producer>('producer').get(ids.entityId(3));
    if (producer === undefined) throw new Error('producer missing');
    state.world.stores
      .get<Producer>('producer')
      .set(ids.entityId(3), { ...producer, state: 'processing' });
    const snapshot = project(state, ids.ownerHandle(0));
    expect(snapshot.owners[0]?.balance?.idle_paying_entities).toEqual([]);
  });

  it('[PIC-9.2] a balance change appears in the delta', () => {
    const { state } = economySession();
    const before = project(state, ids.ownerHandle(0));
    const current = state.world.owners.owners[0];
    if (current === undefined) throw new Error('owner missing');
    state.world.owners = {
      owners: [
        {
          handle: current.handle,
          knowledge: current.knowledge,
          accounts: [],
          purposeLocks: current.purposeLocks,
          unlocks: current.unlocks,
          deficitPaused: current.deficitPaused,
        },
      ],
    };
    state.revision = 1;
    const after = project(state, ids.ownerHandle(0));
    const delta = diffProjection(before, after);
    expect(delta.owner_updates).toHaveLength(1);
    expect(delta.owner_updates?.[0]?.owner_id).toBe('owner.0');
  });

  it('[PIC-9.2] an unchanged owner is omitted', () => {
    const { state } = economySession();
    const before = project(state, ids.ownerHandle(0));
    const delta = diffProjection(before, before);
    expect(delta.owner_updates).toBeUndefined();
  });
});
