import { cloneWorld, createConstructionPlan, ids, requestCancellation } from '@aesfw/core';
import type { Inventory, Registry, TickInput } from '@aesfw/core';
import { runPhases } from '@aesfw/core/testing';
import { describe, it } from 'vitest';
import { content, expectContentOk } from './content-builder.js';
import { expectInvariants } from './invariants.js';
import { world } from './world-builder.js';

const registry: Registry = expectContentOk(
  content()
    .define('resources', {
      id: 'test.r.a',
      quantity: { precision: 'fixed', scale: 1000 },
      storage: { policy: 'normal', scope: 'inventory' },
      transportable: true,
    })
    .build(),
).registry;
const input: TickInput = { commands: [], options: { journal: true, hash: false } };
const resource = ids.definitionHandle(0);

const build = () =>
  world(registry)
    .owner({
      handle: ids.ownerHandle(0),
      knowledge: [],
      accounts: [],
      purposeLocks: [],
      unlocks: [],
      deficitPaused: [],
    })
    .store<Inventory>('inventory', ids.entityId(2), {
      owner: ids.ownerHandle(0),
      policy: 'framework.inventory.shared_location',
      revision: 0,
      entries: [{ resource, quantity: 1000 }],
      capacity: { total: null, perResource: null },
      acceptance: { accepts: [] },
    })
    .build();

const plan = {
  duration: 2,
  costs: [{ resource, quantity: 1000 }],
  commitPolicy: 'completion' as const,
  inventory: ids.entityId(2),
  deconstruct: null,
};

describe('[INV-18][INV-24] construction invariants', () => {
  it('[INV-24] invariants hold while construction reserves and commits', () => {
    const w = build();
    createConstructionPlan(w, ids.entityId(1), plan);
    const before = cloneWorld(w);
    const first = runPhases(w, registry, [3], input);
    expectInvariants(before, first, registry);
    const second = cloneWorld(w);
    const completed = runPhases(w, registry, [3], input);
    expectInvariants(second, completed, registry);
  });

  it('[INV-24] invariants hold when a cancelled entity is removed', () => {
    const w = build();
    createConstructionPlan(w, ids.entityId(1), plan);
    runPhases(w, registry, [3], input);
    requestCancellation(w, ids.entityId(1));
    const before = cloneWorld(w);
    const output = runPhases(w, registry, [30], input);
    expectInvariants(before, output, registry);
  });
});
