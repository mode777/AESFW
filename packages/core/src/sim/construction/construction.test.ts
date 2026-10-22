import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, ownerHandle, tick } from '../../ids/index.js';
import type { ReservationId } from '../../ids/index.js';
import { runPhases } from '../../pipeline/step.js';
import type { TickInput } from '../../pipeline/types.js';
import { createEmptyRegistry } from '../../registry/types.js';
import { createTransactionWriter } from '../../tx/index.js';
import type { Inventory } from '../../tx/inventory.js';
import { stores } from '../../testing.js';
import { createWorld } from '../../world/create.js';
import type { World } from '../../world/types.js';
import { lifecycleOf, setLifecycle } from './lifecycle.js';
import { constructionPlanOf, constructionProgressOf, createConstructionPlan } from './plan.js';
import { requestCancellation, requestDeconstruction } from './seams.js';
import type {
  ConstructionCost,
  ConstructionPlan,
  ConstructionProgress,
  DeconstructPolicy,
} from './types.js';
import type { Producer } from '../production/index.js';

const registry = createEmptyRegistry();
const input: TickInput = { commands: [], options: { journal: false, hash: false } };
const res = (value: number) => definitionHandle(value);

const makeWorld = (): World => {
  const result = createWorld(registry, {
    seed: [1, 2],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
  });
  if (!result.ok) throw new Error('createWorld returned an error');
  const world = result.value;
  world.nextEntityId = entityId(100);
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
  return world;
};

const setInventory = (world: World, entity: number, entries: readonly ConstructionCost[]): void => {
  stores(world)
    .get<Inventory>('inventory')
    .set(entityId(entity), {
      owner: ownerHandle(0),
      policy: 'framework.inventory.shared_location',
      revision: 0,
      entries: entries.map((entry) => ({ resource: entry.resource, quantity: entry.quantity })),
      capacity: { total: null, perResource: null },
      acceptance: { accepts: [] },
    });
};

const stock = (world: World, inventory: number, resource: number): number =>
  stores(world)
    .get<Inventory>('inventory')
    .get(entityId(inventory))
    ?.entries.find((entry) => entry.resource === resource)?.quantity ?? 0;

const cost = (resource: number, quantity: number): ConstructionCost => ({
  resource: res(resource),
  quantity,
});

const plan = (overrides: Partial<ConstructionPlan> = {}): ConstructionPlan => ({
  duration: 5,
  costs: [cost(0, 1000)],
  commitPolicy: 'completion',
  inventory: entityId(2),
  deconstruct: null,
  ...overrides,
});

const setProducer = (world: World, entity: number, state: Producer['state']): void => {
  stores(world).get<Producer>('producer').set(entityId(entity), {
    recipes: [],
    recipe: null,
    processSlots: 1,
    location: null,
    inputInventory: null,
    outputInventory: null,
    state,
    blockReasons: [],
    progress: 0,
    inputReservations: [],
    capacityReservations: [],
  });
};

const reserve = (world: World, holder: number, quantity: number): ReservationId => {
  const writer = createTransactionWriter(world, null);
  const result = writer.reserve({
    inventory: entityId(2),
    resource: res(0),
    quantity,
    purpose: 'construction',
    holder: entityId(holder),
  });
  if (!result.ok) throw new Error('reserve failed');
  return result.value.id;
};

const run = (world: World, phases: readonly (3 | 30)[]): void => {
  runPhases(world, registry, phases, input);
};

describe('[GDD-9.1] generic lifecycle', () => {
  it('[GDD-9.1] a planned entity with available costs starts constructing', () => {
    const world = makeWorld();
    setInventory(world, 2, [cost(0, 1000)]);
    createConstructionPlan(world, entityId(3), plan({ duration: 5 }));
    const output = runPhases(world, registry, [3], input);
    expect(lifecycleOf(world, entityId(3))).toBe('constructing');
    expect(constructionProgressOf(world, entityId(3))?.progress).toBe(1);
    expect(output.events.some((event) => event.type === 'ConstructionStarted')).toBe(true);
  });

  it('[GDD-9.1] a planned entity without costs waits for resources', () => {
    const world = makeWorld();
    setInventory(world, 2, [cost(0, 999)]);
    createConstructionPlan(world, entityId(3), plan());
    run(world, [3]);
    expect(lifecycleOf(world, entityId(3))).toBe('awaiting_resources');
    expect(world.ledger.reservations).toHaveLength(0);
  });

  it('[GDD-9.1] an awaiting entity starts when resources arrive', () => {
    const world = makeWorld();
    setInventory(world, 2, [cost(0, 999)]);
    createConstructionPlan(world, entityId(3), plan());
    run(world, [3]);
    setInventory(world, 2, [cost(0, 1000)]);
    run(world, [3]);
    expect(lifecycleOf(world, entityId(3))).toBe('constructing');
    expect(world.ledger.reservations).toHaveLength(1);
  });

  it('[GDD-9.1] a constructing entity activates at its duration', () => {
    const world = makeWorld();
    setInventory(world, 2, [cost(0, 1000)]);
    createConstructionPlan(world, entityId(3), plan({ duration: 1 }));
    const output = runPhases(world, registry, [3], input);
    expect(constructionProgressOf(world, entityId(3))?.progress).toBe(1);
    expect(lifecycleOf(world, entityId(3))).toBe('active');
    expect(output.events.some((event) => event.type === 'ConstructionCompleted')).toBe(true);
  });

  it('[GDD-9.1] an active entity is disabled and re-enabled', () => {
    const world = makeWorld();
    createConstructionPlan(world, entityId(3), plan());
    setLifecycle(world, entityId(3), 'active');
    stores(world).get<{ enabled: boolean }>('enabled').set(entityId(3), { enabled: false });
    run(world, [3]);
    expect(lifecycleOf(world, entityId(3))).toBe('disabled');
    stores(world).get<{ enabled: boolean }>('enabled').set(entityId(3), { enabled: true });
    run(world, [3]);
    expect(lifecycleOf(world, entityId(3))).toBe('active');
  });

  it('[GDD-9.1] an active entity is blocked and unblocked', () => {
    const world = makeWorld();
    createConstructionPlan(world, entityId(3), plan());
    setLifecycle(world, entityId(3), 'active');
    setProducer(world, 3, 'blocked');
    run(world, [3]);
    expect(lifecycleOf(world, entityId(3))).toBe('blocked');
    setProducer(world, 3, 'idle');
    run(world, [3]);
    expect(lifecycleOf(world, entityId(3))).toBe('active');
  });

  it('[GDD-9.1] terminal states are not advanced', () => {
    const world = makeWorld();
    createConstructionPlan(world, entityId(3), plan());
    setLifecycle(world, entityId(3), 'cancelled');
    run(world, [3]);
    expect(lifecycleOf(world, entityId(3))).toBe('cancelled');
  });
});

describe('[GDD-18.1] construction plans and progress', () => {
  it('[GDD-18.1] progress advances one tick per run', () => {
    const world = makeWorld();
    setInventory(world, 2, [cost(0, 1000)]);
    createConstructionPlan(world, entityId(3), plan({ duration: 5 }));
    run(world, [3]);
    run(world, [3]);
    run(world, [3]);
    expect(constructionProgressOf(world, entityId(3))?.progress).toBe(3);
    expect(lifecycleOf(world, entityId(3))).toBe('constructing');
  });

  it('[GDD-18.1] a zero-duration plan activates immediately', () => {
    const world = makeWorld();
    createConstructionPlan(world, entityId(3), plan({ duration: 0, costs: [] }));
    const output = runPhases(world, registry, [3], input);
    expect(lifecycleOf(world, entityId(3))).toBe('active');
    expect(output.events.some((event) => event.type === 'ConstructionCompleted')).toBe(true);
  });

  it('[GDD-18.1] a plan with no costs starts without reservations', () => {
    const world = makeWorld();
    createConstructionPlan(world, entityId(3), plan({ duration: 3, costs: [] }));
    run(world, [3]);
    expect(lifecycleOf(world, entityId(3))).toBe('constructing');
    expect(constructionProgressOf(world, entityId(3))?.reservations).toEqual([]);
  });

  it('[GDD-18.1] competing plans reserve in ascending entity ID order', () => {
    const world = makeWorld();
    setInventory(world, 2, [cost(0, 1000)]);
    createConstructionPlan(world, entityId(3), plan());
    createConstructionPlan(world, entityId(4), plan());
    run(world, [3]);
    expect(lifecycleOf(world, entityId(3))).toBe('constructing');
    expect(lifecycleOf(world, entityId(4))).toBe('awaiting_resources');
  });
});

describe('[GDD-18.1][ARCH-6.2] atomic reservation', () => {
  it('[GDD-18.1] the full cost list is reserved', () => {
    const world = makeWorld();
    setInventory(world, 2, [cost(0, 500), cost(1, 300)]);
    createConstructionPlan(world, entityId(3), plan({ costs: [cost(0, 500), cost(1, 300)] }));
    run(world, [3]);
    const reservations = world.ledger.reservations;
    expect(reservations).toHaveLength(2);
    expect(reservations.every((reservation) => reservation.purpose === 'construction')).toBe(true);
    expect(reservations.map((reservation) => reservation.quantity).sort()).toEqual([300, 500]);
  });

  it('[ARCH-6.2] a partially available cost list reserves nothing', () => {
    const world = makeWorld();
    setInventory(world, 2, [cost(0, 500), cost(1, 299)]);
    createConstructionPlan(world, entityId(3), plan({ costs: [cost(0, 500), cost(1, 300)] }));
    run(world, [3]);
    expect(lifecycleOf(world, entityId(3))).toBe('awaiting_resources');
    expect(world.ledger.reservations).toHaveLength(0);
  });

  it('[GDD-18.1] exact stock is sufficient', () => {
    const world = makeWorld();
    setInventory(world, 2, [cost(0, 1000)]);
    createConstructionPlan(world, entityId(3), plan());
    run(world, [3]);
    expect(lifecycleOf(world, entityId(3))).toBe('constructing');
  });
});

describe('[CONT-6.8] commit policies', () => {
  it('[CONT-6.8] the start policy consumes at start', () => {
    const world = makeWorld();
    setInventory(world, 2, [cost(0, 1000)]);
    createConstructionPlan(world, entityId(3), plan({ duration: 3, commitPolicy: 'start' }));
    run(world, [3]);
    expect(stock(world, 2, 0)).toBe(0);
    expect(constructionProgressOf(world, entityId(3))?.reservations).toEqual([]);
  });

  it('[CONT-6.8] the completion policy consumes at completion', () => {
    const world = makeWorld();
    setInventory(world, 2, [cost(0, 1000)]);
    createConstructionPlan(world, entityId(3), plan({ duration: 3, commitPolicy: 'completion' }));
    run(world, [3]);
    expect(stock(world, 2, 0)).toBe(1000);
    expect(world.ledger.reservations).toHaveLength(1);
    run(world, [3]);
    run(world, [3]);
    expect(stock(world, 2, 0)).toBe(0);
    expect(world.ledger.reservations).toHaveLength(0);
    expect(lifecycleOf(world, entityId(3))).toBe('active');
  });

  it('[CONT-6.8] the continuous policy consumes incrementally', () => {
    const world = makeWorld();
    setInventory(world, 2, [cost(0, 1000)]);
    createConstructionPlan(world, entityId(3), plan({ duration: 4, commitPolicy: 'continuous' }));
    run(world, [3]);
    expect(stock(world, 2, 0)).toBe(750);
    run(world, [3]);
    expect(stock(world, 2, 0)).toBe(500);
    run(world, [3]);
    expect(stock(world, 2, 0)).toBe(250);
    run(world, [3]);
    expect(stock(world, 2, 0)).toBe(0);
    expect(lifecycleOf(world, entityId(3))).toBe('active');
  });

  it('[CONT-6.8] continuous rounding sums exactly', () => {
    const world = makeWorld();
    setInventory(world, 2, [cost(0, 1000)]);
    createConstructionPlan(world, entityId(3), plan({ duration: 3, commitPolicy: 'continuous' }));
    run(world, [3]);
    run(world, [3]);
    run(world, [3]);
    expect(stock(world, 2, 0)).toBe(0);
  });
});

describe('[GDD-9.1][TDS-12.3] cancellation', () => {
  it('[TDS-12.3] cancelling a constructing entity releases reservations', () => {
    const world = makeWorld();
    setInventory(world, 2, [cost(0, 1000)]);
    createConstructionPlan(world, entityId(3), plan({ duration: 5, commitPolicy: 'completion' }));
    run(world, [3]);
    expect(requestCancellation(world, entityId(3))).toBe(true);
    const output = runPhases(world, registry, [30], input);
    expect(stock(world, 2, 0)).toBe(1000);
    expect(world.ledger.reservations).toHaveLength(0);
    expect(output.events.some((event) => event.type === 'ConstructionCancelled')).toBe(true);
    expect(stores(world).get('lifecycle').has(entityId(3))).toBe(false);
  });

  it('[GDD-9.1] cancelling after a partial commit keeps the committed part', () => {
    const world = makeWorld();
    setInventory(world, 2, [cost(0, 1000)]);
    createConstructionPlan(world, entityId(3), plan({ duration: 4, commitPolicy: 'continuous' }));
    run(world, [3]);
    run(world, [3]);
    expect(stock(world, 2, 0)).toBe(500);
    expect(requestCancellation(world, entityId(3))).toBe(true);
    run(world, [30]);
    expect(stock(world, 2, 0)).toBe(500);
    expect(stores(world).get('lifecycle').has(entityId(3))).toBe(false);
  });

  it('[GDD-9.1] an active entity cannot be cancelled', () => {
    const world = makeWorld();
    createConstructionPlan(world, entityId(3), plan());
    setLifecycle(world, entityId(3), 'active');
    expect(requestCancellation(world, entityId(3))).toBe(false);
    expect(lifecycleOf(world, entityId(3))).toBe('active');
  });
});

describe('[GDD-18.3] deconstruction', () => {
  const deconstruct = (overrides: Partial<DeconstructPolicy> = {}): DeconstructPolicy => ({
    duration: 2,
    returns: [cost(0, 400)],
    cancelReservations: false,
    ...overrides,
  });

  it('[GDD-18.3] deconstruction deposits returned resources at the deadline', () => {
    const world = makeWorld();
    setInventory(world, 2, []);
    createConstructionPlan(world, entityId(3), plan({ costs: [], deconstruct: deconstruct() }));
    setLifecycle(world, entityId(3), 'active');
    expect(requestDeconstruction(world, entityId(3), tick(0))).toBe(true);
    run(world, [30]);
    expect(stock(world, 2, 0)).toBe(0);
    expect(lifecycleOf(world, entityId(3))).toBe('active');
    const output = runPhases(world, registry, [30], input);
    expect(stock(world, 2, 0)).toBe(400);
    expect(output.events.some((event) => event.type === 'EntityDeconstructed')).toBe(true);
    expect(stores(world).get('lifecycle').has(entityId(3))).toBe(false);
  });

  it('[GDD-18.3] deconstruction completes only at the deadline', () => {
    const world = makeWorld();
    setInventory(world, 2, []);
    createConstructionPlan(world, entityId(3), plan({ costs: [], deconstruct: deconstruct() }));
    setLifecycle(world, entityId(3), 'active');
    requestDeconstruction(world, entityId(3), tick(0));
    run(world, [30]);
    expect(lifecycleOf(world, entityId(3))).toBe('active');
    expect(stock(world, 2, 0)).toBe(0);
  });

  it('[GDD-18.3] reservation cancellation on deconstruction', () => {
    const world = makeWorld();
    setInventory(world, 2, [cost(0, 300)]);
    createConstructionPlan(
      world,
      entityId(3),
      plan({ costs: [], deconstruct: deconstruct({ cancelReservations: true }) }),
    );
    setLifecycle(world, entityId(3), 'active');
    const reservation = reserve(world, 3, 300);
    const progress = constructionProgressOf(world, entityId(3));
    if (progress === undefined) throw new Error('missing progress');
    stores(world)
      .get<ConstructionProgress>('constructionProgress')
      .set(entityId(3), { ...progress, reservations: [reservation] });
    requestDeconstruction(world, entityId(3), tick(0));
    run(world, [30]);
    run(world, [30]);
    expect(world.ledger.reservations).toHaveLength(0);
    expect(stores(world).get('lifecycle').has(entityId(3))).toBe(false);
  });

  it('[GDD-18.3] a terminal entity cannot be deconstructed', () => {
    const world = makeWorld();
    createConstructionPlan(world, entityId(3), plan({ deconstruct: deconstruct() }));
    setLifecycle(world, entityId(3), 'cancelled');
    expect(requestDeconstruction(world, entityId(3), tick(0))).toBe(false);
    expect(lifecycleOf(world, entityId(3))).toBe('cancelled');
  });
});

describe('[TDS-12.3][INV-24] phase 30 finalization', () => {
  it('[TDS-12.3] an expired reservation is released', () => {
    const world = makeWorld();
    setInventory(world, 2, [cost(0, 300)]);
    const writer = createTransactionWriter(world, null);
    const result = writer.reserve({
      inventory: entityId(2),
      resource: res(0),
      quantity: 300,
      purpose: 'construction',
      holder: entityId(3),
      expiryTick: tick(10),
    });
    expect(result.ok).toBe(true);
    world.tick = tick(9);
    run(world, [30]);
    expect(world.ledger.reservations).toHaveLength(0);
  });

  it('[INV-24] a removed entity leaves no tombstone', () => {
    const world = makeWorld();
    setInventory(world, 2, [cost(0, 1000)]);
    createConstructionPlan(world, entityId(3), plan());
    run(world, [3]);
    requestCancellation(world, entityId(3));
    run(world, [30]);
    for (const kind of stores(world).kinds) {
      expect(stores(world).get(kind).has(entityId(3))).toBe(false);
    }
    expect(constructionPlanOf(world, entityId(3))).toBeUndefined();
  });

  it('[INV-24] removing an entity marks the caches dirty', () => {
    const world = makeWorld();
    setInventory(world, 2, [cost(0, 1000)]);
    createConstructionPlan(world, entityId(3), plan());
    run(world, [3]);
    requestCancellation(world, entityId(3));
    world.caches.dirty = false;
    run(world, [30]);
    expect(world.caches.dirty).toBe(true);
  });
});
