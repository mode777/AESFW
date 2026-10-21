import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, ownerHandle } from '../ids/index.js';
import { createEmptyRegistry } from '../registry/types.js';
import { stores } from '../testing.js';
import { createWorld } from '../world/create.js';
import type { World } from '../world/types.js';
import { createTransactionWriter } from './builder.js';
import type { Inventory } from './inventory.js';
import type { Transaction } from './types.js';

const res = (value: number) => definitionHandle(value);
const ent = (value: number) => entityId(value);

const makeWorld = (): World => {
  const result = createWorld(createEmptyRegistry(), {
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

describe('[TDS-12.4][TDS-10.1] tick journal', () => {
  it('[TDS-12.4] applied transactions are journaled in order', () => {
    const world = makeWorld();
    const journal: Transaction[] = [];
    const writer = createTransactionWriter(world, journal);
    const reserved = writer.reserve({
      inventory: ent(1),
      resource: res(0),
      quantity: 300,
      purpose: 'production_input',
      holder: ent(1),
    });
    if (!reserved.ok) throw new Error('reserve failed');
    writer.atomic((b) => b.commit(reserved.value.id, 100));
    expect(journal.map((transaction) => transaction.kind)).toEqual(['reserve', 'commit']);
    expect(journal[0]?.seq).toBe(0);
    expect(journal[1]?.seq).toBe(1);
  });

  it('[TDS-12.4] journaling off yields no journal entries', () => {
    const world = makeWorld();
    const writer = createTransactionWriter(world, null);
    writer.reserve({
      inventory: ent(1),
      resource: res(0),
      quantity: 300,
      purpose: 'production_input',
      holder: ent(1),
    });
    expect(world.ledger.reservations).toHaveLength(1);
  });
});
