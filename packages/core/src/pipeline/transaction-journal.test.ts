import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, ownerHandle, stringId } from '../ids/index.js';
import type { Registry } from '../registry/types.js';
import { stores } from '../testing.js';
import { createWorld } from '../world/create.js';
import type { Inventory } from '../tx/inventory.js';
import { hashWorld } from '../world/codec.js';
import type { World } from '../world/types.js';
import { runSystem } from './step.js';
import type { SystemDescriptor, TickInput } from './types.js';

const registry: Registry = {
  stringIdOf: (type, handle) =>
    type === 'resource' && handle === definitionHandle(0) ? stringId('test.r.a') : null,
  handleOf: (type, id) =>
    type === 'resource' && id === stringId('test.r.a') ? definitionHandle(0) : null,
};
const res = (value: number) => definitionHandle(value);
const ent = (value: number) => entityId(value);

const makeWorld = (): World => {
  const result = createWorld(registry, {
    seed: [1, 2],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
  });
  if (!result.ok) throw new Error('createWorld returned an error');
  const world = result.value;
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
    .get<Inventory>('inventory')
    .set(ent(1), {
      owner: ownerHandle(0),
      policy: 'framework.inventory.shared_location',
      revision: 0,
      entries: [{ resource: res(0), quantity: 1000 }],
      capacity: { total: null, perResource: null },
      acceptance: { accepts: [] },
    });
  return world;
};

const descriptor: SystemDescriptor = {
  phase: 11,
  name: 'test.reserveAndCommit',
  reads: ['inventory'],
  writes: ['inventory'],
  run: (ctx) => {
    const reserved = ctx.tx.reserve({
      inventory: ent(1),
      resource: res(0),
      quantity: 300,
      purpose: 'production_input',
      holder: ent(1),
    });
    if (reserved.ok) ctx.tx.atomic((builder) => builder.commit(reserved.value.id, 100));
  },
};

const input = (journal: boolean): TickInput => ({
  commands: [],
  options: { journal, hash: false },
});

describe('[TDS-12.4][TDS-10.1] pipeline transaction journal', () => {
  it('[TDS-12.4] a system transactions reach the output journal', () => {
    const world = makeWorld();
    const output = runSystem(descriptor, world, registry, input(true));
    expect(output.journal?.map((transaction) => transaction.kind)).toEqual(['reserve', 'commit']);
  });

  it('[TDS-10.1] journaling off yields a null journal with the same state', () => {
    const journaledWorld = makeWorld();
    const journaled = runSystem(descriptor, journaledWorld, registry, input(true));
    const plainWorld = makeWorld();
    const plain = runSystem(descriptor, plainWorld, registry, input(false));
    expect(plain.journal).toBeNull();
    expect(hashWorld(plain.world, registry)).toBe(hashWorld(journaled.world, registry));
  });
});
