import { cloneWorld, createEmptyRegistry, ids, step, world as core } from '@aesfw/core';
import { runPhases } from '@aesfw/core/testing';
import { createTransactionWriter } from '@aesfw/core';
import type {
  Inventory,
  Registry,
  StorageProvider,
  ThroughputAllocation,
  ThroughputPool,
  TickInput,
  TickOutput,
  Transaction,
} from '@aesfw/core';
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

  it('[INV-01][GDD-7.5] a negative account of a non-balance resource is reported', () => {
    const working = world(resourceRegistry())
      .owner({
        handle: ids.ownerHandle(0),
        knowledge: [],
        accounts: [{ resource, amount: -5 }],
        purposeLocks: [],
        unlocks: [],
        deficitPaused: [],
      })
      .build();
    const before = cloneWorld(working);
    const output = step(working, resourceRegistry(), input);
    expect(
      checkInvariants(before, output, resourceRegistry()).map((finding) => finding.id),
    ).toContain('INV-01');
  });

  it('[INV-01][GDD-7.5] a negative account of a balance resource passes', () => {
    const balanceRegistry = expectContentOk(
      content()
        .define('resources', {
          id: 'test.r.credits',
          quantity: { precision: 'fixed', scale: 1000 },
          storage: { policy: 'normal', scope: 'owner' },
          transportable: false,
          allow_negative: true,
        })
        .build(),
    ).registry;
    const credits = balanceRegistry.handleOf('resource', ids.stringId('test.r.credits'));
    if (credits === null) throw new Error('balance resource missing');
    const working = world(balanceRegistry)
      .owner({
        handle: ids.ownerHandle(0),
        knowledge: [],
        accounts: [{ resource: credits, amount: -5 }],
        purposeLocks: [],
        unlocks: [],
        deficitPaused: [],
      })
      .build();
    const before = cloneWorld(working);
    const output = step(working, balanceRegistry, input);
    expect(checkInvariants(before, output, balanceRegistry)).toEqual([]);
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

describe('[VER-6] producer invariants', () => {
  const buildWorld = (state: 'processing' | 'blocked', blockReasons: readonly string[]) =>
    world()
      .store('producer', ids.entityId(1), {
        recipes: [],
        recipe: null,
        processSlots: 1,
        location: null,
        inputInventory: null,
        outputInventory: null,
        state,
        blockReasons,
        progress: 0,
        inputReservations: [],
        capacityReservations: [],
      })
      .build();

  it('[INV-22] a processing producer with a block reason is reported', () => {
    const working = buildWorld('processing', ['missing_input']);
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
      'INV-22',
    );
  });

  it('[INV-22] a consistent producer passes', () => {
    const working = buildWorld('processing', []);
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
      'INV-22',
    );
  });
});

describe('[VER-6] satisfaction invariants', () => {
  const buildWorld = (z: number) =>
    world().store('satisfaction', ids.entityId(1), { z, categories: [] }).build();

  it('[INV-08] a satisfaction above 1000 is reported', () => {
    const working = buildWorld(1200);
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
      'INV-08',
    );
  });

  it('[INV-09] a residence with a band table and satisfaction needs band state', () => {
    const bands = content()
      .define('resources', {
        id: 'test.r.a',
        quantity: { precision: 'fixed', scale: 1000 },
        storage: { policy: 'normal', scope: 'inventory' },
        transportable: true,
      })
      .define('satisfaction_bands', {
        id: 'test.bands.default',
        bands: [{ min: 0, effects: [] }],
      })
      .build();
    const built = expectContentOk(bands);
    const bandHandle = built.registry.handleOf('band', ids.stringId('test.bands.default'));
    if (bandHandle === null) throw new Error('band handle missing');
    const working = world(built.registry)
      .store('satisfaction', ids.entityId(1), { z: 500, categories: [] })
      .store('residence', ids.entityId(1), {
        tier: ids.definitionHandle(9),
        capacity: 10,
        location: null,
        growthPolicy: null,
        consumptionFactor: 1000,
        outputs: [],
        bands: bandHandle,
      })
      .build();
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
    expect(checkInvariants(before, output, built.registry).map((finding) => finding.id)).toContain(
      'INV-09',
    );
  });

  it('[INV-08] a bounded satisfaction passes', () => {
    const working = buildWorld(500);
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
      'INV-08',
    );
  });
});

describe('[VER-6] population invariants', () => {
  const buildWorld = (count: number, capacity: number) =>
    world()
      .store('populationGroup', ids.entityId(1), {
        tier: ids.definitionHandle(0),
        count,
        capacity,
      })
      .build();

  const outputOf = (working: core.World, before: core.World): TickOutput => ({
    world: working,
    tick: ids.tick(before.tick + 1),
    events: [],
    outcomes: [],
    journal: null,
    hash: null,
    metrics: {},
  });

  it('[INV-07] a population above capacity is reported', () => {
    const working = buildWorld(20, 10);
    const before = cloneWorld(working);
    expect(
      checkInvariants(before, outputOf(working, before), registry).map((finding) => finding.id),
    ).toContain('INV-07');
  });

  it('[INV-07] a bounded population passes', () => {
    const working = buildWorld(5, 10);
    const before = cloneWorld(working);
    expect(
      checkInvariants(before, outputOf(working, before), registry).map((finding) => finding.id),
    ).not.toContain('INV-07');
  });
});

describe('[GDD-20.2][INV-23] owner balance conservation', () => {
  const journallingInput: TickInput = {
    commands: [],
    options: { journal: true, hash: false },
  };

  it('[INV-23] a journalled account charge passes', () => {
    const balanceRegistry = expectContentOk(
      content()
        .define('resources', {
          id: 'test.r.credits',
          quantity: { precision: 'fixed', scale: 1000 },
          storage: { policy: 'normal', scope: 'owner' },
          transportable: false,
          allow_negative: true,
        })
        .build(),
    );
    const registry2 = balanceRegistry.registry;
    const credits = registry2.handleOf('resource', ids.stringId('test.r.credits'));
    if (credits === null) throw new Error('credits missing');
    const working = world(registry2)
      .owner({
        handle: ids.ownerHandle(0),
        knowledge: [],
        accounts: [{ resource: credits, amount: 1000 }],
        purposeLocks: [],
        unlocks: [],
        deficitPaused: [],
      })
      .build();
    const before = cloneWorld(working);
    const writer = createTransactionWriter(working, null);
    const applied = writer.atomic((builder) => {
      builder.account({
        owner: ids.ownerHandle(0),
        resource: credits,
        delta: -500,
        reason: 'maintenance',
      });
    });
    expect(applied.ok).toBe(true);
    const output = step(working, registry2, journallingInput);
    // The journal records the pipeline's account transaction for the charge.
    if (output.journal === null) throw new Error('journal missing');
    (output.journal as Transaction[]).push({
      kind: 'account',
      seq: 0,
      owner: ids.ownerHandle(0),
      resource: credits,
      delta: -500,
      reason: 'maintenance',
    });
    expect(
      checkInvariants(before, output, registry2).some((finding) => finding.id === 'INV-23'),
    ).toBe(false);
  });

  it('[INV-23] an unexplained account change is reported', () => {
    const working = world(resourceRegistry()).build();
    const before = cloneWorld(working);
    working.owners = {
      owners: [
        {
          handle: ids.ownerHandle(0),
          knowledge: [],
          accounts: [{ resource, amount: 50 }],
          purposeLocks: [],
          unlocks: [],
          deficitPaused: [],
        },
      ],
    };
    const output = step(working, resourceRegistry(), journallingInput);
    expect(
      checkInvariants(before, output, resourceRegistry()).map((finding) => finding.id),
    ).toContain('INV-23');
  });
});

describe('[VER-6][INV-06] throughput invariants', () => {
  const throughputWorld = (
    capacity: number,
    allocations: readonly { entity: number; requested: number; granted: number }[],
  ): { before: core.World; output: TickOutput } => {
    const working = world(resourceRegistry()).build();
    const pool: ThroughputPool = {
      policy: 'framework.inventory.throughput_limited',
      baseCapacity: capacity,
      baseThroughputCapability: null,
      capacity,
      requested: allocations.reduce((total, entry) => total + entry.requested, 0),
      throttlePermille: 1000,
    };
    working.stores.get<ThroughputPool>('throughputPool').set(ids.entityId(1), pool);
    for (const entry of allocations) {
      const allocation: ThroughputAllocation = {
        location: ids.entityId(1),
        requested: entry.requested,
        granted: entry.granted,
        throttlePermille:
          entry.requested === 0 ? 1000 : Math.floor((1000 * entry.granted) / entry.requested),
      };
      working.stores
        .get<ThroughputAllocation>('throughputAllocation')
        .set(ids.entityId(entry.entity), allocation);
    }
    const before = cloneWorld(working);
    const output = runPhases(working, resourceRegistry(), [], input);
    return { before, output };
  };

  it('[INV-06] an over-capacity grant is reported', () => {
    const { before, output } = throughputWorld(1000, [
      { entity: 2, requested: 600, granted: 600 },
      { entity: 3, requested: 600, granted: 600 },
    ]);
    expect(
      checkInvariants(before, output, resourceRegistry()).map((finding) => finding.id),
    ).toContain('INV-06');
  });

  it('[INV-06] an exact allocation passes', () => {
    const { before, output } = throughputWorld(1000, [
      { entity: 2, requested: 600, granted: 600 },
      { entity: 3, requested: 400, granted: 400 },
    ]);
    expect(
      checkInvariants(before, output, resourceRegistry()).map((finding) => finding.id),
    ).not.toContain('INV-06');
  });
});

describe('[VER-6][INV-03] storage-provider capacity', () => {
  const capacityWorld = (stored: number) => {
    const working = world(resourceRegistry())
      .store(
        'inventory',
        ids.entityId(1),
        inventory([{ resource, quantity: stored }], { total: 1000, perResource: null }),
      )
      .build();
    const provider: StorageProvider = {
      kind: 'storage_provider',
      inventory: ids.entityId(1),
      location: null,
      capacityTotal: 500,
      capacityPerResource: 0,
      throughput: 0,
    };
    working.stores.get<StorageProvider>('modifierSet').set(ids.entityId(2), provider);
    const before = cloneWorld(working);
    const output = runPhases(working, resourceRegistry(), [], input);
    return { before, output };
  };

  it('[INV-03] stored quantity within the storage bonus passes', () => {
    const { before, output } = capacityWorld(1500);
    expect(
      checkInvariants(before, output, resourceRegistry()).map((finding) => finding.id),
    ).not.toContain('INV-03');
  });

  it('[INV-03] stored quantity above the effective capacity is reported', () => {
    const { before, output } = capacityWorld(1501);
    expect(
      checkInvariants(before, output, resourceRegistry()).map((finding) => finding.id),
    ).toContain('INV-03');
  });
});

describe('[INV-16] cargo-slot invariant', () => {
  it('[INV-16] an over-capacity typed slot is reported', () => {
    const working = world()
      .store('cargo', ids.entityId(1), {
        policy: 'typed_slots',
        slotCapacity: 100,
        slots: [{ resource: ids.definitionHandle(0), quantity: 150 }],
        entries: [],
        accepts: [],
      })
      .build();
    const before = cloneWorld(working);
    const output = step(working, registry, input);
    expect(checkInvariants(before, output, registry).map((finding) => finding.id)).toContain(
      'INV-16',
    );
  });

  it('[INV-16] a valid typed cargo has no finding', () => {
    const working = world()
      .store('cargo', ids.entityId(1), {
        policy: 'typed_slots',
        slotCapacity: 100,
        slots: [{ resource: ids.definitionHandle(0), quantity: 100 }],
        entries: [],
        accepts: [],
      })
      .build();
    const before = cloneWorld(working);
    const output = step(working, registry, input);
    expect(checkInvariants(before, output, registry).map((finding) => finding.id)).not.toContain(
      'INV-16',
    );
  });
});
