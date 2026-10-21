import { ids } from '@aesfw/core';
import { describe, expect, it } from 'vitest';
import { world } from './world-builder.js';

describe('[VER-5.2] store-level world builder', () => {
  it('[VER-5.2] the builder produces the requested state', () => {
    const built = world()
      .seed([3, 4])
      .tick(10)
      .owner({
        handle: ids.ownerHandle(1),
        knowledge: [],
        accounts: [],
        purposeLocks: [],
        unlocks: [],
        deficitPaused: [],
      })
      .store('producer', ids.entityId(1), { state: 'idle' })
      .build();

    expect(built.rng.seed).toEqual([3, 4]);
    expect(built.tick).toBe(10);
    expect(built.owners.owners).toHaveLength(1);
    expect(built.stores.get('producer').get(ids.entityId(1))).toEqual({ state: 'idle' });
  });
});
