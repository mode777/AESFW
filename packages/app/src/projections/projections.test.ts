import { describe, expect, it } from 'vitest';
import { instantiateWorld, ids } from '@aesfw/core';
import type { Producer, Registry } from '@aesfw/core';
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
  state.world.stores.get<Producer>('producer').set(ids.entityId(3), producer());
  state.world.stores
    .get<{ definition: ReturnType<typeof ids.definitionHandle> }>('definition')
    .set(ids.entityId(3), { definition: ids.definitionHandle(9) });
  return state;
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
