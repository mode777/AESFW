import { cloneWorld, createEmptyRegistry, ids, step, world as core } from '@aesfw/core';
import { createTransactionWriter } from '@aesfw/core';
import type { Inventory, Registry, TickInput, TickOutput, Transaction } from '@aesfw/core';
import { describe, expect, it } from 'vitest';
import { content, expectContentOk } from './content-builder.js';
import { checkInvariants, expectInvariants } from './invariants.js';
import { world } from './world-builder.js';

const registry: Registry = createEmptyRegistry();
const input: TickInput = { commands: [], options: { journal: false, hash: false } };

const resourceRegistry = (): Registry =>
  expectContentOk(
    content()
      .define('resources', {
        id: 'test.r.a',
        quantity: { precision: 'fixed', scale: 1000 },
        storage: { policy: 'normal', scope: 'inventory' },
        transportable: true,
      })
      .build(),
  ).registry;

const resource = ids.definitionHandle(0);

const inventory = (
  entries: Inventory['entries'],
  capacity: Inventory['capacity'] = { total: null, perResource: null },
): Inventory => ({
  owner: ids.ownerHandle(0),
  policy: 'framework.inventory.shared_location',
  revision: 0,
  entries,
  capacity,
  acceptance: { accepts: [] },
});

const stepSnapshot = (): { before: core.World; output: TickOutput } => {
  const working = world().store('producer', ids.entityId(1), { state: 'idle' }).build();
  const before = cloneWorld(working);
  const output = step(working, registry, input);
  return { before, output };
};

describe('[VER-6] invariant checker', () => {
  it('[VER-6] a valid empty world has no findings', () => {
    const { before, output } = stepSnapshot();
    expect(checkInvariants(before, output, registry)).toEqual([]);
    expect(() => expectInvariants(before, output, registry)).not.toThrow();
  });

  it('[INV-10] an entity ID at or beyond nextEntityId is reported', () => {
    const working = world().build();
    working.stores.get('producer').set(ids.entityId(9), { state: 'idle' });
    const before = cloneWorld(working);
    const output = step(working, registry, input);
    const idsReported = checkInvariants(before, output, registry).map((finding) => finding.id);
    expect(idsReported).toContain('INV-10');
  });

  it('[INV-21] a tick that did not advance is reported', () => {
    const { before, output } = stepSnapshot();
    const tampered: TickOutput = { ...output, tick: ids.tick(99) };
    expect(checkInvariants(before, tampered, registry).map((finding) => finding.id)).toContain(
      'INV-21',
    );
  });

  it('[INV-24] non-ascending store iteration is reported', () => {
    const { before, output } = stepSnapshot();
    const fakeStore = {
      kind: 'producer' as const,
      has: () => true,
      get: () => null,
      getOrThrow: () => null,
      set: () => undefined,
      markRemoved: () => undefined,
      ids: () => [ids.entityId(2), ids.entityId(1)],
      size: () => 2,
      compact: () => undefined,
    };
    const fakeStores = {
      kinds: ['producer'],
      get: () => fakeStore,
    } as unknown as core.ComponentStores;
    const tampered: TickOutput = { ...output, world: { ...output.world, stores: fakeStores } };
    expect(checkInvariants(before, tampered, registry).map((finding) => finding.id)).toContain(
      'INV-24',
    );
  });

  it('[INV-18] a populated world round-trips without a persistence finding', () => {
    const { before, output } = stepSnapshot();
    const findings = checkInvariants(before, output, registry);
    expect(findings.some((finding) => finding.id === 'INV-18')).toBe(false);
  });
});

describe('[VER-6] transaction invariants', () => {
  const buildWorld = (
    entries: Inventory['entries'],
    capacity: Inventory['capacity'] = { total: null, perResource: null },
  ) =>
    world(resourceRegistry())
      .store('inventory', ids.entityId(1), inventory(entries, capacity))
      .build();

  it('[INV-01] a negative stored quantity is reported', () => {
    const working = buildWorld([{ resource, quantity: -5 }]);
    const before = cloneWorld(working);
    const output = step(working, resourceRegistry(), input);
    expect(
      checkInvariants(before, output, resourceRegistry()).map((finding) => finding.id),
    ).toContain('INV-01');
  });

  it('[INV-02] reservations exceeding stored quantity are reported', () => {
    const working = buildWorld([{ resource, quantity: 100 }]);
    working.ledger = {
      reservations: [
        {
          id: ids.reservationId(1),
          inventory: ids.entityId(1),
          resource,
          quantity: 200,
          purpose: 'production_input',
          holder: ids.entityId(1),
          expiryTick: null,
          capacity: false,
        },
      ],
    };
    const before = cloneWorld(working);
    const output = step(working, resourceRegistry(), input);
    expect(
      checkInvariants(before, output, resourceRegistry()).map((finding) => finding.id),
    ).toContain('INV-02');
  });

  it('[INV-03] a capacity overrun is reported', () => {
    const working = buildWorld([{ resource, quantity: 80 }], { total: 100, perResource: null });
    working.ledger = {
      reservations: [
        {
          id: ids.reservationId(1),
          inventory: ids.entityId(1),
          resource,
          quantity: 50,
          purpose: 'production_input',
          holder: ids.entityId(1),
          expiryTick: null,
          capacity: true,
        },
      ],
    };
    const before = cloneWorld(working);
    const output = step(working, resourceRegistry(), input);
    expect(
      checkInvariants(before, output, resourceRegistry()).map((finding) => finding.id),
    ).toContain('INV-03');
  });

  it('[INV-04] a consistent journal passes conservation', () => {
    const working = buildWorld([{ resource, quantity: 1000 }]);
    working.ledger = {
      reservations: [
        {
          id: ids.reservationId(1),
          inventory: ids.entityId(1),
          resource,
          quantity: 50,
          purpose: 'production_input',
          holder: ids.entityId(1),
          expiryTick: null,
          capacity: false,
        },
      ],
    };
    const before = cloneWorld(working);
    const journal: Transaction[] = [];
    const writer = createTransactionWriter(working, journal);
    const result = writer.atomic((builder) => {
      builder.commit(ids.reservationId(1), 50);
      builder.deposit({
        inventory: ids.entityId(1),
        resource,
        quantity: 200,
        source: ids.entityId(1),
      });
    });
    expect(result.ok).toBe(true);
    const output: TickOutput = {
      world: working,
      tick: ids.tick(before.tick + 1),
      events: [],
      outcomes: [],
      journal,
      hash: null,
      metrics: {},
    };
    const findings = checkInvariants(before, output, resourceRegistry());
    expect(findings.some((finding) => finding.id === 'INV-04')).toBe(false);
  });

  it('[INV-04] a journal conservation violation is reported', () => {
    const working = buildWorld([{ resource, quantity: 1000 }]);
    working.ledger = {
      reservations: [
        {
          id: ids.reservationId(1),
          inventory: ids.entityId(1),
          resource,
          quantity: 50,
          purpose: 'production_input',
          holder: ids.entityId(1),
          expiryTick: null,
          capacity: false,
        },
      ],
    };
    const before = cloneWorld(working);
    const journal: Transaction[] = [];
    const writer = createTransactionWriter(working, journal);
    writer.atomic((builder) => {
      builder.commit(ids.reservationId(1), 50);
      builder.deposit({
        inventory: ids.entityId(1),
        resource,
        quantity: 200,
        source: ids.entityId(1),
      });
    });
    const output: TickOutput = {
      world: working,
      tick: ids.tick(before.tick + 1),
      events: [],
      outcomes: [],
      journal: journal.filter((transaction) => transaction.kind !== 'commit'),
      hash: null,
      metrics: {},
    };
    expect(
      checkInvariants(before, output, resourceRegistry()).map((finding) => finding.id),
    ).toContain('INV-04');
  });
});

describe('[VER-6] capability invariants', () => {
  const buildWorld = (granted: number, supply: number) =>
    world()
      .store('capabilityProvider', ids.entityId(1), {
        capability: ids.definitionHandle(0),
        scope: 'location',
        location: ids.entityId(9),
        rate: supply,
      })
      .store('capabilityConsumer', ids.entityId(2), {
        capability: ids.definitionHandle(0),
        substitutes: [],
        scope: 'location',
        location: ids.entityId(9),
        model: 'proportional',
        priority: 0,
        weight: 1000,
        request: granted,
      })
      .store('capabilityAllocation', ids.entityId(2), {
        capability: ids.definitionHandle(0),
        granted,
        shortage: 0,
      })
      .build();

  it('[INV-05] a capability over-allocation is reported', () => {
    const working = buildWorld(50, 10);
    const before = cloneWorld(working);
    const output: TickOutput = {
      world: working,
      tick: ids.tick(before.tick + 1),
      events: [],
      outcomes: [],
      journal: null,
      hash: null,
      metrics: {},
    };
    expect(checkInvariants(before, output, registry).map((finding) => finding.id)).toContain(
      'INV-05',
    );
  });

  it('[INV-05] a matching capability allocation passes', () => {
    const working = buildWorld(100, 100);
    const before = cloneWorld(working);
    const output: TickOutput = {
      world: working,
      tick: ids.tick(before.tick + 1),
      events: [],
      outcomes: [],
      journal: null,
      hash: null,
      metrics: {},
    };
    expect(checkInvariants(before, output, registry).map((finding) => finding.id)).not.toContain(
      'INV-05',
    );
  });
});
