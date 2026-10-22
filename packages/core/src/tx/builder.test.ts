import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, ownerHandle, reservationId, tick } from '../ids/index.js';
import { createEmptyRegistry } from '../registry/types.js';
import type { Registry } from '../registry/types.js';
import { stores } from '../testing.js';
import { createWorld } from '../world/create.js';
import type { OwnerState, World } from '../world/types.js';
import { createTransactionWriter } from './builder.js';
import { txEnvironmentFor } from './environment.js';
import { quantityOf } from './inventory.js';
import type { Inventory } from './inventory.js';
import { findReservation } from './ledger.js';
import type { TxEnvironment } from './types.js';

const res = (value: number) => definitionHandle(value);
const ent = (value: number) => entityId(value);

const makeOwner = (
  handle: number,
  purposeLocks: OwnerState['purposeLocks'] = [],
  accounts: OwnerState['accounts'] = [],
): OwnerState => ({
  handle: ownerHandle(handle),
  knowledge: [],
  accounts,
  purposeLocks,
  unlocks: [],
  deficitPaused: [],
});

const makeInventory = (
  owner: number,
  entries: Inventory['entries'] = [],
  capacity: Inventory['capacity'] = { total: null, perResource: null },
  acceptance: Inventory['acceptance'] = { accepts: [] },
): Inventory => ({
  owner: ownerHandle(owner),
  policy: 'framework.inventory.shared_location',
  revision: 0,
  entries,
  capacity,
  acceptance,
});

const makeWorld = (
  inventories: Record<number, Inventory>,
  owners: OwnerState[] = [makeOwner(0)],
): World => {
  const result = createWorld(createEmptyRegistry(), {
    seed: [1, 2],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
  });
  if (!result.ok) throw new Error('createWorld returned an error');
  const world = result.value;
  world.owners = { owners };
  const store = stores(world).get<Inventory>('inventory');
  for (const [id, inventory] of Object.entries(inventories)) {
    store.set(ent(Number(id)), inventory);
  }
  return world;
};

const writerFor = (world: World, environment?: TxEnvironment) =>
  createTransactionWriter(world, null, environment);

describe('[GDD-8.3][ARCH-12][TDS-12] quantity reservation', () => {
  it('[GDD-8.3] a reservation within stored quantity succeeds', () => {
    const world = makeWorld({ 1: makeInventory(0, [{ resource: res(0), quantity: 1000 }]) });
    const result = writerFor(world).reserve({
      inventory: ent(1),
      resource: res(0),
      quantity: 300,
      purpose: 'production_input',
      holder: ent(1),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.quantity).toBe(300);
    expect(result.value.capacity).toBe(false);
    expect(findReservation(world, result.value.id)).not.toBeNull();
  });

  it('[GDD-8.3] a reservation beyond stored quantity is rejected', () => {
    const world = makeWorld({ 1: makeInventory(0, [{ resource: res(0), quantity: 1000 }]) });
    const writer = writerFor(world);
    const first = writer.reserve({
      inventory: ent(1),
      resource: res(0),
      quantity: 600,
      purpose: 'production_input',
      holder: ent(1),
    });
    expect(first.ok).toBe(true);
    const second = writer.reserve({
      inventory: ent(1),
      resource: res(0),
      quantity: 500,
      purpose: 'production_input',
      holder: ent(1),
    });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error.code).toBe('insufficient_quantity');
    expect(world.ledger.reservations).toHaveLength(1);
  });

  it('[GDD-8.3] a non-positive reservation is rejected', () => {
    const world = makeWorld({ 1: makeInventory(0, [{ resource: res(0), quantity: 1000 }]) });
    const result = writerFor(world).reserve({
      inventory: ent(1),
      resource: res(0),
      quantity: 0,
      purpose: 'production_input',
      holder: ent(1),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('invalid_quantity');
  });

  it('[TDS-12.1] a reservation against an unknown inventory is rejected', () => {
    const world = makeWorld({});
    const result = writerFor(world).reserve({
      inventory: ent(9),
      resource: res(0),
      quantity: 10,
      purpose: 'production_input',
      holder: ent(1),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('unknown_inventory');
  });

  it('[GDD-8.5] a purpose-locked reservation is rejected', () => {
    const owner = makeOwner(0, [
      { inventory: ent(1), resource: res(0), purpose: 'production_input' },
    ]);
    const world = makeWorld({ 1: makeInventory(0, [{ resource: res(0), quantity: 1000 }]) }, [
      owner,
    ]);
    const result = writerFor(world).reserve({
      inventory: ent(1),
      resource: res(0),
      quantity: 10,
      purpose: 'production_input',
      holder: ent(1),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('purpose_locked');
  });

  it('[GDD-8.5] a locked resource is available to another purpose', () => {
    const owner = makeOwner(0, [
      { inventory: ent(1), resource: res(0), purpose: 'production_input' },
    ]);
    const world = makeWorld({ 1: makeInventory(0, [{ resource: res(0), quantity: 1000 }]) }, [
      owner,
    ]);
    const result = writerFor(world).reserve({
      inventory: ent(1),
      resource: res(0),
      quantity: 10,
      purpose: 'population_need',
      holder: ent(1),
    });
    expect(result.ok).toBe(true);
  });
});

describe('[GDD-8.4][TDS-12] output-capacity reservation', () => {
  it('[GDD-8.4] a capacity reservation within the per-resource cap succeeds', () => {
    const world = makeWorld({
      1: makeInventory(0, [{ resource: res(0), quantity: 400 }], { total: null, perResource: 500 }),
    });
    const result = writerFor(world).reserveCapacity({
      inventory: ent(1),
      resource: res(0),
      quantity: 100,
      holder: ent(1),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.capacity).toBe(true);
    expect(quantityOf(world.stores.get<Inventory>('inventory').getOrThrow(ent(1)), res(0))).toBe(
      400,
    );
  });

  it('[GDD-8.4] a capacity reservation beyond the cap is rejected', () => {
    const world = makeWorld({
      1: makeInventory(0, [{ resource: res(0), quantity: 400 }], { total: null, perResource: 500 }),
    });
    const result = writerFor(world).reserveCapacity({
      inventory: ent(1),
      resource: res(0),
      quantity: 101,
      holder: ent(1),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('insufficient_capacity');
  });

  it('[GDD-8.4] both capacity rules are enforced', () => {
    const world = makeWorld({
      1: makeInventory(0, [{ resource: res(0), quantity: 300 }], { total: 500, perResource: 400 }),
    });
    const writer = writerFor(world);
    const first = writer.reserveCapacity({
      inventory: ent(1),
      resource: res(1),
      quantity: 150,
      holder: ent(1),
    });
    expect(first.ok).toBe(true);
    const second = writer.reserveCapacity({
      inventory: ent(1),
      resource: res(1),
      quantity: 60,
      holder: ent(1),
    });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error.code).toBe('insufficient_capacity');
  });
});

describe('[GDD-8.3][TDS-12] release and expiry', () => {
  it('[GDD-8.3] release restores availability', () => {
    const world = makeWorld({ 1: makeInventory(0, [{ resource: res(0), quantity: 1000 }]) });
    const writer = writerFor(world);
    const reserved = writer.reserve({
      inventory: ent(1),
      resource: res(0),
      quantity: 300,
      purpose: 'production_input',
      holder: ent(1),
    });
    if (!reserved.ok) throw new Error('reserve failed');
    expect(writer.release(reserved.value.id).ok).toBe(true);
    expect(world.ledger.reservations).toHaveLength(0);
    const again = writer.reserve({
      inventory: ent(1),
      resource: res(0),
      quantity: 1000,
      purpose: 'production_input',
      holder: ent(1),
    });
    expect(again.ok).toBe(true);
  });

  it('[TDS-12.3] releasing an unknown reservation is rejected', () => {
    const world = makeWorld({ 1: makeInventory(0, [{ resource: res(0), quantity: 1000 }]) });
    const result = writerFor(world).release(reservationId(99));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('unknown_reservation');
  });

  it('[TDS-12.3] expired reservations are released', async () => {
    const { releaseExpiredReservations } = await import('./expire.js');
    const world = makeWorld({ 1: makeInventory(0, [{ resource: res(0), quantity: 1000 }]) });
    const writer = writerFor(world);
    writer.reserve({
      inventory: ent(1),
      resource: res(0),
      quantity: 100,
      purpose: 'production_input',
      holder: ent(1),
      expiryTick: tick(10),
    });
    writer.reserve({
      inventory: ent(1),
      resource: res(0),
      quantity: 100,
      purpose: 'production_input',
      holder: ent(1),
      expiryTick: tick(20),
    });
    expect(releaseExpiredReservations(world, tick(15))).toBe(1);
    expect(world.ledger.reservations).toHaveLength(1);
    expect(world.ledger.reservations[0]?.expiryTick).toBe(20);
  });
});

describe('[GDD-8.3][TDS-12] reservation commit', () => {
  it('[GDD-8.3] a partial commit reduces stored and reserved quantity', () => {
    const world = makeWorld({ 1: makeInventory(0, [{ resource: res(0), quantity: 1000 }]) });
    const writer = writerFor(world);
    const reserved = writer.reserve({
      inventory: ent(1),
      resource: res(0),
      quantity: 500,
      purpose: 'production_input',
      holder: ent(1),
    });
    if (!reserved.ok) throw new Error('reserve failed');
    const result = writer.atomic((b) => b.commit(reserved.value.id, 200));
    expect(result.ok).toBe(true);
    expect(quantityOf(world.stores.get<Inventory>('inventory').getOrThrow(ent(1)), res(0))).toBe(
      800,
    );
    expect(findReservation(world, reserved.value.id)?.quantity).toBe(300);
  });

  it('[GDD-8.3] a full commit removes the reservation', () => {
    const world = makeWorld({ 1: makeInventory(0, [{ resource: res(0), quantity: 1000 }]) });
    const writer = writerFor(world);
    const reserved = writer.reserve({
      inventory: ent(1),
      resource: res(0),
      quantity: 500,
      purpose: 'production_input',
      holder: ent(1),
    });
    if (!reserved.ok) throw new Error('reserve failed');
    writer.atomic((b) => b.commit(reserved.value.id, 500));
    expect(quantityOf(world.stores.get<Inventory>('inventory').getOrThrow(ent(1)), res(0))).toBe(
      500,
    );
    expect(world.ledger.reservations).toHaveLength(0);
  });

  it('[GDD-8.3] committing beyond the reservation is rejected', () => {
    const world = makeWorld({ 1: makeInventory(0, [{ resource: res(0), quantity: 1000 }]) });
    const writer = writerFor(world);
    const reserved = writer.reserve({
      inventory: ent(1),
      resource: res(0),
      quantity: 500,
      purpose: 'production_input',
      holder: ent(1),
    });
    if (!reserved.ok) throw new Error('reserve failed');
    const result = writer.atomic((b) => b.commit(reserved.value.id, 501));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('quantity_exceeds_reservation');
    expect(quantityOf(world.stores.get<Inventory>('inventory').getOrThrow(ent(1)), res(0))).toBe(
      1000,
    );
    expect(findReservation(world, reserved.value.id)?.quantity).toBe(500);
  });

  it('[TDS-12.1] committing a capacity reservation is rejected', () => {
    const world = makeWorld({
      1: makeInventory(0, [{ resource: res(0), quantity: 100 }], { total: null, perResource: 500 }),
    });
    const writer = writerFor(world);
    const reserved = writer.reserveCapacity({
      inventory: ent(1),
      resource: res(0),
      quantity: 100,
      holder: ent(1),
    });
    if (!reserved.ok) throw new Error('reserveCapacity failed');
    const result = writer.atomic((b) => b.commit(reserved.value.id, 10));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('reservation_mismatch');
  });
});

describe('[GDD-8.1][GDD-8.4] deposit', () => {
  it('[GDD-8.4] a deposit within capacity succeeds', () => {
    const world = makeWorld({ 1: makeInventory(0, [], { total: 1000, perResource: null }) });
    const result = writerFor(world).atomic((b) =>
      b.deposit({ inventory: ent(1), resource: res(0), quantity: 200, source: ent(1) }),
    );
    expect(result.ok).toBe(true);
    expect(quantityOf(world.stores.get<Inventory>('inventory').getOrThrow(ent(1)), res(0))).toBe(
      200,
    );
  });

  it('[GDD-8.4] a deposit beyond capacity is rejected', () => {
    const world = makeWorld({
      1: makeInventory(0, [{ resource: res(0), quantity: 900 }], {
        total: 1000,
        perResource: null,
      }),
    });
    const result = writerFor(world).atomic((b) =>
      b.deposit({ inventory: ent(1), resource: res(0), quantity: 200, source: ent(1) }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('insufficient_capacity');
    expect(quantityOf(world.stores.get<Inventory>('inventory').getOrThrow(ent(1)), res(0))).toBe(
      900,
    );
  });

  it('[GDD-8.2] a deposit of an unaccepted resource is rejected', () => {
    const world = makeWorld({
      1: makeInventory(0, [], { total: null, perResource: null }, { accepts: [res(0)] }),
    });
    const result = writerFor(world).atomic((b) =>
      b.deposit({ inventory: ent(1), resource: res(1), quantity: 10, source: ent(1) }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_acceptable');
  });

  it('[TDS-12.1] a deposit into an unknown inventory is rejected', () => {
    const world = makeWorld({});
    const result = writerFor(world).atomic((b) =>
      b.deposit({ inventory: ent(9), resource: res(0), quantity: 10, source: ent(1) }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('unknown_inventory');
  });
});

describe('[GDD-8.3][TDS-12] withdrawal', () => {
  it('[GDD-8.3] a withdrawal from unreserved quantity succeeds', () => {
    const world = makeWorld({ 1: makeInventory(0, [{ resource: res(0), quantity: 500 }]) });
    const writer = writerFor(world);
    writer.reserve({
      inventory: ent(1),
      resource: res(0),
      quantity: 200,
      purpose: 'production_input',
      holder: ent(1),
    });
    const result = writer.atomic((b) =>
      b.withdraw({
        inventory: ent(1),
        resource: res(0),
        quantity: 300,
        purpose: 'maintenance',
        sink: ent(1),
      }),
    );
    expect(result.ok).toBe(true);
    expect(quantityOf(world.stores.get<Inventory>('inventory').getOrThrow(ent(1)), res(0))).toBe(
      200,
    );
  });

  it('[GDD-8.3] a withdrawal into reserved quantity is rejected', () => {
    const world = makeWorld({ 1: makeInventory(0, [{ resource: res(0), quantity: 500 }]) });
    const writer = writerFor(world);
    writer.reserve({
      inventory: ent(1),
      resource: res(0),
      quantity: 200,
      purpose: 'production_input',
      holder: ent(1),
    });
    const result = writer.atomic((b) =>
      b.withdraw({
        inventory: ent(1),
        resource: res(0),
        quantity: 400,
        purpose: 'maintenance',
        sink: ent(1),
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('insufficient_quantity');
    expect(quantityOf(world.stores.get<Inventory>('inventory').getOrThrow(ent(1)), res(0))).toBe(
      500,
    );
  });

  it('[TDS-12.1] a non-positive withdrawal is rejected', () => {
    const world = makeWorld({ 1: makeInventory(0, [{ resource: res(0), quantity: 500 }]) });
    const result = writerFor(world).atomic((b) =>
      b.withdraw({
        inventory: ent(1),
        resource: res(0),
        quantity: 0,
        purpose: 'maintenance',
        sink: ent(1),
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('invalid_quantity');
  });
});

describe('[ARCH-6.1][TDS-12] transfer', () => {
  it('[ARCH-6.1] a transfer moves quantity between inventories', () => {
    const world = makeWorld({
      1: makeInventory(0, [{ resource: res(0), quantity: 1000 }]),
      2: makeInventory(0),
    });
    const result = writerFor(world).atomic((b) =>
      b.transfer({
        from: ent(1),
        to: ent(2),
        resource: res(0),
        quantity: 300,
        purpose: 'transport_load',
      }),
    );
    expect(result.ok).toBe(true);
    const store = world.stores.get<Inventory>('inventory');
    expect(quantityOf(store.getOrThrow(ent(1)), res(0))).toBe(700);
    expect(quantityOf(store.getOrThrow(ent(2)), res(0))).toBe(300);
  });

  it('[GDD-8.2] a transfer into a non-accepting inventory is rejected', () => {
    const world = makeWorld({
      1: makeInventory(0, [{ resource: res(0), quantity: 1000 }]),
      2: makeInventory(0, [], { total: null, perResource: null }, { accepts: [res(1)] }),
    });
    const result = writerFor(world).atomic((b) =>
      b.transfer({
        from: ent(1),
        to: ent(2),
        resource: res(0),
        quantity: 300,
        purpose: 'transport_load',
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_acceptable');
  });

  it('[GDD-8.3] a transfer beyond the source unreserved quantity is rejected', () => {
    const world = makeWorld({
      1: makeInventory(0, [{ resource: res(0), quantity: 500 }]),
      2: makeInventory(0),
    });
    const writer = writerFor(world);
    writer.reserve({
      inventory: ent(1),
      resource: res(0),
      quantity: 200,
      purpose: 'production_input',
      holder: ent(1),
    });
    const result = writer.atomic((b) =>
      b.transfer({
        from: ent(1),
        to: ent(2),
        resource: res(0),
        quantity: 400,
        purpose: 'transport_load',
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('insufficient_quantity');
  });
});

describe('[GDD-7.5][ARCH-6.3] owner account', () => {
  it('[GDD-7.5] a positive delta creates the account', () => {
    const world = makeWorld({}, [makeOwner(0)]);
    const result = writerFor(world).atomic((b) =>
      b.account({ owner: ownerHandle(0), resource: res(0), delta: 100 }),
    );
    expect(result.ok).toBe(true);
    expect(world.owners.owners[0]?.accounts).toEqual([{ resource: res(0), amount: 100 }]);
  });

  it('[GDD-7.5] a negative delta within the balance succeeds', () => {
    const world = makeWorld({}, [makeOwner(0, [], [{ resource: res(0), amount: 100 }])]);
    const result = writerFor(world).atomic((b) =>
      b.account({ owner: ownerHandle(0), resource: res(0), delta: -50 }),
    );
    expect(result.ok).toBe(true);
    expect(world.owners.owners[0]?.accounts).toEqual([{ resource: res(0), amount: 50 }]);
  });

  it('[GDD-7.5] a negative balance is rejected by default', () => {
    const world = makeWorld({}, [makeOwner(0, [], [{ resource: res(0), amount: 100 }])]);
    const result = writerFor(world).atomic((b) =>
      b.account({ owner: ownerHandle(0), resource: res(0), delta: -200 }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('insufficient_balance');
    expect(world.owners.owners[0]?.accounts).toEqual([{ resource: res(0), amount: 100 }]);
  });

  it('[ARCH-6.3] an allowed negative balance succeeds', () => {
    const world = makeWorld({}, [makeOwner(0, [], [{ resource: res(0), amount: 100 }])]);
    const writer = createTransactionWriter(world, null, { allowNegative: () => true });
    const result = writer.atomic((b) =>
      b.account({ owner: ownerHandle(0), resource: res(0), delta: -200 }),
    );
    expect(result.ok).toBe(true);
    expect(world.owners.owners[0]?.accounts).toEqual([{ resource: res(0), amount: -100 }]);
  });

  it('[GDD-7.5][TDS-12.2] an environment derived from content allows the negative balance', () => {
    const world = makeWorld({}, [makeOwner(0, [], [{ resource: res(0), amount: 100 }])]);
    const balanceRegistry: Registry = {
      stringIdOf: () => null,
      handleOf: () => null,
      definitionDataOf: (type, handle) =>
        type === 'resource' && handle === res(0)
          ? { id: 'test.resource.credits', allow_negative: true }
          : null,
    };
    const writer = createTransactionWriter(world, null, txEnvironmentFor(balanceRegistry));
    const result = writer.atomic((b) =>
      b.account({ owner: ownerHandle(0), resource: res(0), delta: -200 }),
    );
    expect(result.ok).toBe(true);
    expect(world.owners.owners[0]?.accounts).toEqual([{ resource: res(0), amount: -100 }]);
  });

  it('[TDS-12.1] an unknown owner is rejected', () => {
    const world = makeWorld({}, [makeOwner(0)]);
    const result = writerFor(world).atomic((b) =>
      b.account({ owner: ownerHandle(7), resource: res(0), delta: 100 }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('unknown_owner');
  });
});

describe('[ARCH-6.2][TDS-12.2] atomic composites', () => {
  it('[ARCH-6.2] a failing composite applies nothing', () => {
    const world = makeWorld({ 1: makeInventory(0, [], { total: 1000, perResource: null }) });
    const result = writerFor(world).atomic((b) => {
      b.deposit({ inventory: ent(1), resource: res(0), quantity: 200, source: ent(1) });
      b.withdraw({
        inventory: ent(1),
        resource: res(0),
        quantity: 500,
        purpose: 'maintenance',
        sink: ent(1),
      });
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('insufficient_quantity');
    expect(quantityOf(world.stores.get<Inventory>('inventory').getOrThrow(ent(1)), res(0))).toBe(0);
    expect(world.ledger.reservations).toHaveLength(0);
  });

  it('[INV-15] a valid composite applies every operation', () => {
    const world = makeWorld({ 1: makeInventory(0, [{ resource: res(0), quantity: 1000 }]) });
    const writer = writerFor(world);
    const reserved = writer.reserve({
      inventory: ent(1),
      resource: res(0),
      quantity: 300,
      purpose: 'production_input',
      holder: ent(1),
    });
    if (!reserved.ok) throw new Error('reserve failed');
    const result = writer.atomic((b) => {
      b.commit(reserved.value.id, 100);
      b.deposit({ inventory: ent(1), resource: res(1), quantity: 200, source: ent(1) });
    });
    expect(result.ok).toBe(true);
    const store = world.stores.get<Inventory>('inventory');
    expect(quantityOf(store.getOrThrow(ent(1)), res(0))).toBe(900);
    expect(quantityOf(store.getOrThrow(ent(1)), res(1))).toBe(200);
    expect(world.ledger.reservations).toHaveLength(1);
    expect(world.ledger.reservations[0]?.quantity).toBe(200);
  });
});
