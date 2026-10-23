/**
 * Unit tests for the `SetResourcePurposeLock` command (GDD-8.5, TDS-16.2).
 *
 * Source: GDD-8.5, TDS-16.2
 */
import { describe, expect, it } from 'vitest';

import { createWorld } from '../world/create.js';
import { createEmptyRegistry } from '../registry/types.js';
import { definitionHandle, entityId, ownerHandle, stringId, tick } from '../ids/index.js';
import { stores } from '../testing.js';
import type { Inventory } from '../tx/inventory.js';
import type { OwnerState, ScheduledCommand } from '../world/types.js';
import type { Registry, World } from '../index.js';
import { phase01ApplyCommands } from './phase-01-apply-commands.js';
import { runSystem } from '../testing.js';

const registry: Registry = {
  ...createEmptyRegistry(),
  stringIdOf: (type, handle) =>
    type === 'resource' && handle === definitionHandle(3)
      ? stringId('test.resource.planks')
      : type === 'resource' && handle === definitionHandle(7)
        ? stringId('test.resource.bricks')
        : null,
  handleOf: (type, id) =>
    type === 'resource' && id === stringId('test.resource.planks')
      ? definitionHandle(3)
      : type === 'resource' && id === stringId('test.resource.bricks')
        ? definitionHandle(7)
        : null,
};

const RESOURCE = definitionHandle(7);

const makeOwner = (handle: number): OwnerState => ({
  handle: ownerHandle(handle),
  knowledge: [],
  accounts: [],
  purposeLocks: [],
  unlocks: [],
  deficitPaused: [],
});

const makeWorld = (): World => {
  const result = createWorld(registry, {
    seed: [0, 0],
    tickDurationMs: 100,
    world: null,
    enabledModules: [],
  });
  if (!result.ok) throw new Error('world creation failed');
  const world = result.value;
  world.owners = { owners: [makeOwner(0), makeOwner(1)] };
  stores(world)
    .get<Inventory>('inventory')
    .set(entityId(2), {
      owner: ownerHandle(0),
      policy: 'framework.inventory.shared_location',
      revision: 0,
      entries: [],
      capacity: { total: null, perResource: null },
      acceptance: { accepts: [] },
    });
  stores(world)
    .get<Inventory>('inventory')
    .set(entityId(5), {
      owner: ownerHandle(0),
      policy: 'framework.inventory.shared_location',
      revision: 0,
      entries: [],
      capacity: { total: null, perResource: null },
      acceptance: { accepts: [] },
    });
  return world;
};

type LockCommand = Extract<ScheduledCommand['command'], { type: 'SetResourcePurposeLock' }>;

const command = (
  commandId: string,
  actor: number,
  overrides: Partial<LockCommand> = {},
): ScheduledCommand => ({
  commandId,
  actor: ownerHandle(actor),
  tick: tick(1),
  seq: 1,
  command: {
    type: 'SetResourcePurposeLock',
    inventory: entityId(2),
    resource: RESOURCE,
    purpose: 'population_transition' as const,
    locked: true,
    ...overrides,
  },
});

const submit = (world: World, scheduled: ScheduledCommand) => {
  world.commandQueue = [scheduled];
  return runSystem(phase01ApplyCommands, world, registry, {
    commands: [scheduled],
    options: { journal: false, hash: false },
  });
};

describe('[GDD-8.5][TDS-16.2] SetResourcePurposeLock', () => {
  it('[GDD-8.5] an owner sets a lock and the outcome is applied', () => {
    const world = makeWorld();
    const output = submit(world, command('c1', 0));
    expect(output.outcomes[0]?.status).toBe('applied');
    expect(world.owners.owners[0]?.purposeLocks).toEqual([
      { inventory: entityId(2), resource: RESOURCE, purpose: 'population_transition' },
    ]);
  });

  it('[GDD-8.5] setting twice and clearing twice are idempotent', () => {
    const world = makeWorld();
    submit(world, command('c1', 0));
    submit(world, command('c2', 0));
    expect(world.owners.owners[0]?.purposeLocks).toHaveLength(1);
    submit(world, command('c3', 0, { locked: false }));
    submit(world, command('c4', 0, { locked: false }));
    expect(world.owners.owners[0]?.purposeLocks).toEqual([]);
  });

  it('[GDD-8.5] an unknown inventory is rejected', () => {
    const world = makeWorld();
    const output = submit(world, command('c1', 0, { inventory: entityId(9) }));
    expect(output.outcomes[0]?.status).toBe('rejected');
    if (output.outcomes[0]?.status === 'rejected') {
      expect(output.outcomes[0].errors[0]?.code).toBe('unknown_inventory');
    }
  });

  it('[GDD-8.5] an unknown resource is rejected', () => {
    const world = makeWorld();
    const output = submit(world, command('c1', 0, { resource: definitionHandle(99) }));
    expect(output.outcomes[0]?.status).toBe('rejected');
    if (output.outcomes[0]?.status === 'rejected') {
      expect(output.outcomes[0].errors[0]?.code).toBe('unknown_resource');
    }
  });

  it('[GDD-8.5] an invalid purpose is rejected', () => {
    const world = makeWorld();
    const output = submit(world, command('c1', 0, { purpose: 'telepathy' as never }));
    expect(output.outcomes[0]?.status).toBe('rejected');
    if (output.outcomes[0]?.status === 'rejected') {
      expect(output.outcomes[0].errors[0]?.code).toBe('invalid_purpose');
    }
  });

  it('[GDD-8.5] a non-owner is rejected and no lock changes', () => {
    const world = makeWorld();
    const output = submit(world, command('c1', 1));
    expect(output.outcomes[0]?.status).toBe('rejected');
    if (output.outcomes[0]?.status === 'rejected') {
      expect(output.outcomes[0].errors[0]?.code).toBe('not_owner');
    }
    expect(world.owners.owners[0]?.purposeLocks).toEqual([]);
    expect(world.owners.owners[1]?.purposeLocks).toEqual([]);
  });

  it('[TDS-8.5] locks stay ordered by (inventory, resource, purpose) and persist', () => {
    const world = makeWorld();
    submit(world, command('c1', 0, { resource: definitionHandle(7) }));
    submit(world, command('c2', 0, { resource: definitionHandle(3) }));
    submit(world, command('c3', 0, { inventory: entityId(5) }));
    const locks = world.owners.owners[0]?.purposeLocks ?? [];
    expect(locks.map((lock) => [lock.inventory, lock.resource])).toEqual([
      [entityId(2), definitionHandle(3)],
      [entityId(2), definitionHandle(7)],
      [entityId(5), definitionHandle(7)],
    ]);
  });
});

describe('[TDS-8.5][TDS-12.3] purpose-lock persistence', () => {
  it('[TDS-12.3] locks persist through save, load, and continue with equal hashes', async () => {
    const { encodeWorld, decodeWorld, hashWorld, step } = await import('../index.js');
    const world = makeWorld();
    submit(world, command('c1', 0));

    const encoded = encodeWorld(world, registry);
    const decoded = decodeWorld(registry, encoded);
    if (!decoded.ok) throw new Error('decode failed');
    expect(decoded.value.owners.owners[0]?.purposeLocks).toEqual(
      world.owners.owners[0]?.purposeLocks,
    );

    const input = { commands: [], options: { journal: false, hash: false } };
    step(decoded.value, registry, input);
    const uninterrupted = makeWorld();
    submit(uninterrupted, command('c1', 0));
    step(uninterrupted, registry, input);
    expect(hashWorld(decoded.value, registry)).toBe(hashWorld(uninterrupted, registry));
  });
});
