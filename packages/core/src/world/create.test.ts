import { describe, expect, it } from 'vitest';
import { createEmptyRegistry } from '../registry/types.js';
import { ownerHandle, stringId } from '../ids/index.js';
import { allocateEntity, allocateReservation, createWorld } from './create.js';
import type { World, WorldSetup } from './types.js';

const setup: WorldSetup = {
  seed: [1, 2],
  tickDurationMs: 1000,
  world: null,
  enabledModules: [],
};

const makeWorld = (overrides: Partial<WorldSetup> = {}): World => {
  const result = createWorld(createEmptyRegistry(), { ...setup, ...overrides });
  if (!result.ok) throw new Error('createWorld returned an error');
  return result.value;
};

describe('[TDS-8.1][ARCH-4.2] world creation', () => {
  it('[TDS-8.1] an empty world is initialized', () => {
    const world = makeWorld();
    expect(world.formatVersion).toBe(1);
    expect(world.tick).toBe(0);
    expect(world.nextEntityId).toBe(1);
    expect(world.nextReservationId).toBe(1);
    expect(world.owners.owners).toEqual([]);
    expect(world.ledger.reservations).toEqual([]);
    expect(world.caches.dirty).toBe(true);
  });

  it('[TDS-8.1] enabled modules are recorded', () => {
    const world = makeWorld({
      enabledModules: [stringId('test.module.b'), stringId('test.module.a')],
    });
    expect(world.modules.enabled).toEqual(['test.module.a', 'test.module.b']);
  });

  it('[TDS-8.1] owner state is stored by ascending handle', () => {
    const world = makeWorld();
    world.owners = {
      owners: [
        {
          handle: ownerHandle(1),
          knowledge: [],
          accounts: [],
          purposeLocks: [],
          unlocks: [],
          deficitPaused: [],
        },
        {
          handle: ownerHandle(2),
          knowledge: [],
          accounts: [],
          purposeLocks: [],
          unlocks: [],
          deficitPaused: [],
        },
      ],
    };
    expect(world.owners.owners.map((owner) => owner.handle)).toEqual([1, 2]);
  });
});

describe('[TDS-7][INV-10] allocation', () => {
  it('[TDS-7][INV-10] entity allocation is monotonic', () => {
    const world = makeWorld();
    expect(allocateEntity(world)).toBe(1);
    expect(allocateEntity(world)).toBe(2);
    expect(world.nextEntityId).toBe(3);
  });

  it('[TDS-7][INV-10] reservation allocation is monotonic', () => {
    const world = makeWorld();
    expect(allocateReservation(world)).toBe(1);
    expect(allocateReservation(world)).toBe(2);
    expect(world.nextReservationId).toBe(3);
  });
});
