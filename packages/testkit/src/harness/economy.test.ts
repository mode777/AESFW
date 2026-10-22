import { cloneWorld, createTransactionWriter, ids, step, txEnvironmentFor } from '@aesfw/core';
import type { Registry, TickInput, World } from '@aesfw/core';
import { describe, expect, it } from 'vitest';
import { content, expectContentOk } from './content-builder.js';
import { cloneRun, doubleRun } from './harnesses.js';
import { checkInvariants, expectInvariants } from './invariants.js';
import { world } from './world-builder.js';

const input: TickInput = { commands: [], options: { journal: false, hash: false } };

const economy = (): { registry: Registry; credits: ReturnType<typeof ids.definitionHandle> } => {
  const result = expectContentOk(
    content()
      .define('resources', {
        id: 'test.r.credits',
        tags: ['balance'],
        quantity: { precision: 'fixed', scale: 1000 },
        storage: { policy: 'normal', scope: 'owner' },
        transportable: false,
        allow_negative: true,
      })
      .define('curves', {
        id: 'test.curve.income',
        type: 'piecewise_linear',
        points: [
          [0, 0],
          [1000, 1000],
        ],
        extrapolation: 'clamp',
      })
      .define('population_tiers', {
        id: 'test.tier.a',
        consumption_factor: 1000,
        need_categories: [],
        outputs: [
          {
            resource: 'test.r.credits',
            scope: 'owner',
            rate_per_population_per_tick: 100,
            satisfaction_curve: 'test.curve.income',
          },
        ],
      })
      .build(),
  );
  const registry = result.registry;
  const credits = registry.handleOf('resource', ids.stringId('test.r.credits'));
  if (credits === null) throw new Error('credits resource missing');
  return { registry, credits };
};

const economyWorld = (registry: Registry, credits: ReturnType<typeof ids.definitionHandle>) =>
  world(registry)
    .owner({
      handle: ids.ownerHandle(0),
      knowledge: [],
      accounts: [],
      purposeLocks: [],
      unlocks: [],
      deficitPaused: [],
    })
    .store('location', ids.entityId(1), {
      template: ids.definitionHandle(0),
      spatialPolicy: 'framework.spatial.abstract_capacity',
      capacity: 100,
      used: 0,
      properties: [],
      region: null,
      active: true,
      owner: ids.ownerHandle(0),
    })
    .store('residence', ids.entityId(2), {
      tier: ids.definitionHandle(0),
      capacity: 10,
      location: ids.entityId(1),
      growthPolicy: null,
      consumptionFactor: 1000,
      outputs: [
        {
          resource: credits,
          ratePerPopulationPerTick: 100,
          scope: 'owner',
          satisfactionCurve: registry.handleOf('curve', ids.stringId('test.curve.income')),
        },
      ],
    })
    .store('populationGroup', ids.entityId(2), {
      tier: ids.definitionHandle(0),
      count: 10,
      capacity: 10,
    })
    .build();

describe('[GDD-7.5][GDD-20.2] owner economy integration', () => {
  it('[GDD-20.2] the full pipeline credits income and keeps invariants green', () => {
    const { registry, credits } = economy();
    const working = economyWorld(registry, credits);
    const before = cloneWorld(working);
    const output = step(working, registry, input);
    const account = output.world.owners.owners[0]?.accounts[0];
    expect(account).toEqual({ resource: credits, amount: 1000 });
    expect(checkInvariants(before, output, registry)).toEqual([]);
  });

  it('[GDD-7.5] a negative balance persists and keeps invariants green', () => {
    const { registry, credits } = economy();
    const working = economyWorld(registry, credits);
    const overdraw = createTransactionWriter(working, null, txEnvironmentFor(registry));
    const applied = overdraw.atomic((builder) => {
      builder.account({
        owner: ids.ownerHandle(0),
        resource: credits,
        delta: -1500,
        reason: 'population_income',
      });
    });
    expect(applied.ok).toBe(true);
    const before = cloneWorld(working);
    const output = step(working, registry, input);
    const account = output.world.owners.owners[0]?.accounts[0];
    expect(account).toEqual({ resource: credits, amount: -500 });
    expect(checkInvariants(before, output, registry)).toEqual([]);
  });

  it('[VER-8.1] the economy world is deterministic in clone-run and double-run', () => {
    const { registry, credits } = economy();
    const working = economyWorld(registry, credits);
    expect(cloneRun(working, registry, input).ok).toBe(true);
    expect(doubleRun(working, registry, 20).ok).toBe(true);
  });

  it('[GDD-20.2] expectInvariants passes across ten income ticks', () => {
    const { registry, credits } = economy();
    let current: World = economyWorld(registry, credits);
    for (let index = 0; index < 10; index += 1) {
      const before = cloneWorld(current);
      const output = step(current, registry, input);
      expectInvariants(before, output, registry);
      current = output.world;
    }
    const total = current.owners.owners[0]?.accounts[0]?.amount ?? 0;
    expect(total).toBe(10000);
  });
});
