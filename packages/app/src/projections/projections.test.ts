import { describe, expect, it } from 'vitest';
import { instantiateWorld, ids } from '@aesfw/core';
import type {
  ConnectivityNode,
  Footprint,
  LogicalTransform,
  Producer,
  Registry,
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
