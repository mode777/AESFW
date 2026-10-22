import { describe, expect, it } from 'vitest';
import { InvariantViolation } from '../../errors/invariant-violation.js';
import type { OwnerHandle } from '../../ids/index.js';
import { definitionHandle, entityId, ownerHandle, tick } from '../../ids/index.js';
import { runPhases } from '../../pipeline/step.js';
import type { TickInput } from '../../pipeline/types.js';
import { createEmptyRegistry } from '../../registry/types.js';
import type { Registry } from '../../registry/types.js';
import { stores } from '../../testing.js';
import { createWorld } from '../../world/create.js';
import type { OwnerState, World } from '../../world/types.js';
import { lifecycleOf } from '../construction/lifecycle.js';
import type { Producer } from '../production/types.js';
import type { Maintenance } from './types.js';

const registry: Registry = createEmptyRegistry();
const input: TickInput = { commands: [], options: { journal: false, hash: false } };
const CREDITS = definitionHandle(6);
const OWNER = ownerHandle(0);
const ENTITY = entityId(1);

const makeOwner = (
  accounts: OwnerState['accounts'],
  deficitPaused: OwnerState['deficitPaused'] = [],
): OwnerState => ({
  handle: OWNER,
  knowledge: [],
  accounts,
  purposeLocks: [],
  unlocks: [],
  deficitPaused,
});

const producer = (state: Producer['state']): Producer => ({
  recipes: [],
  recipe: null,
  processSlots: 1,
  location: null,
  inputInventory: null,
  outputInventory: null,
  state,
  blockReasons: state === 'blocked' ? ['missing_input'] : [],
  progress: 0,
  inputReservations: [],
  capacityReservations: [],
});

interface WorldOptions {
  readonly maintenance: Maintenance;
  readonly accounts?: OwnerState['accounts'];
  readonly deficitPaused?: OwnerState['deficitPaused'];
  readonly producerState?: Producer['state'] | null;
  readonly enabled?: boolean | null;
  readonly lifecycle?: string | null;
  readonly withOwner?: boolean;
  readonly startTick?: number;
}

const makeWorld = (options: WorldOptions): World => {
  const result = createWorld(registry, {
    seed: [1, 2],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
  });
  if (!result.ok) throw new Error('createWorld returned an error');
  const world = result.value;
  world.owners = { owners: [makeOwner(options.accounts ?? [], options.deficitPaused)] };
  world.tick = tick(options.startTick ?? 9);
  if (options.withOwner !== false) {
    stores(world).get<{ owner: OwnerHandle }>('owner').set(ENTITY, { owner: OWNER });
  }
  if (options.producerState !== null) {
    stores(world)
      .get<Producer>('producer')
      .set(ENTITY, producer(options.producerState ?? 'idle'));
  }
  if (options.enabled !== null) {
    stores(world)
      .get<{ enabled: boolean }>('enabled')
      .set(ENTITY, { enabled: options.enabled ?? true });
  }
  if (options.lifecycle !== null) {
    stores(world)
      .get<{ lifecycle: string }>('lifecycle')
      .set(ENTITY, { lifecycle: options.lifecycle ?? 'active' });
  }
  stores(world).get<Maintenance>('maintenance').set(ENTITY, options.maintenance);
  return world;
};

const maintenanceOf = (overrides: Partial<Maintenance>): Maintenance => ({
  intervalTicks: 10,
  inputs: [{ resource: CREDITS, quantity: 500 }],
  chargePolicy: 'while_enabled',
  shortagePolicy: 'ignore',
  arrears: [],
  ...overrides,
});

const run = (world: World) => runPhases(world, registry, [26], input);

const accountOf = (world: World): number =>
  world.owners.owners[0]?.accounts.find((entry) => entry.resource === CREDITS)?.amount ?? 0;

const eventsOf = (world: World, output: ReturnType<typeof run>, type: string) =>
  output.events.filter((event) => event.type === type);

describe('[GDD-20.1] maintenance charging', () => {
  it('[GDD-4.8] a charge debits the owner account on the interval boundary', () => {
    const world = makeWorld({
      maintenance: maintenanceOf({}),
      accounts: [{ resource: CREDITS, amount: 10000 }],
    });
    const output = run(world);
    expect(world.tick).toBe(tick(10));
    expect(accountOf(world)).toBe(9500);
    const charged = eventsOf(world, output, 'MaintenanceCharged');
    expect(charged).toHaveLength(1);
    expect(charged[0]?.owner).toBe(OWNER);
    expect(charged[0]?.payload).toEqual({ resource: CREDITS, amount: 500 });
  });

  it('[GDD-20.1] no charge between interval boundaries', () => {
    const world = makeWorld({
      maintenance: maintenanceOf({}),
      accounts: [{ resource: CREDITS, amount: 10000 }],
      startTick: 10,
    });
    const output = run(world);
    expect(accountOf(world)).toBe(10000);
    expect(output.events).toEqual([]);
  });

  it('[GDD-20.1] an entity without an owner is not charged', () => {
    const world = makeWorld({
      maintenance: maintenanceOf({}),
      accounts: [{ resource: CREDITS, amount: 10000 }],
      withOwner: false,
    });
    const output = run(world);
    expect(accountOf(world)).toBe(10000);
    expect(output.events).toEqual([]);
  });

  it('[GDD-20.1] while_enabled charges an idle and a blocked producer', () => {
    for (const state of ['idle', 'blocked'] as const) {
      const world = makeWorld({
        maintenance: maintenanceOf({ chargePolicy: 'while_enabled' }),
        accounts: [{ resource: CREDITS, amount: 1000 }],
        producerState: state,
      });
      run(world);
      expect(accountOf(world)).toBe(500);
    }
  });

  it('[GDD-20.1] while_enabled does not charge a disabled entity', () => {
    const world = makeWorld({
      maintenance: maintenanceOf({ chargePolicy: 'while_enabled' }),
      accounts: [{ resource: CREDITS, amount: 1000 }],
      enabled: false,
      lifecycle: 'disabled',
    });
    const output = run(world);
    expect(accountOf(world)).toBe(1000);
    expect(output.events).toEqual([]);
  });

  it('[GDD-20.1] while_exists charges a disabled entity', () => {
    const world = makeWorld({
      maintenance: maintenanceOf({ chargePolicy: 'while_exists' }),
      accounts: [{ resource: CREDITS, amount: 1000 }],
      enabled: false,
      lifecycle: 'disabled',
    });
    run(world);
    expect(accountOf(world)).toBe(500);
  });

  it('[GDD-20.1] while_active does not charge a blocked producer', () => {
    const world = makeWorld({
      maintenance: maintenanceOf({ chargePolicy: 'while_active' }),
      accounts: [{ resource: CREDITS, amount: 1000 }],
      producerState: 'blocked',
    });
    const output = run(world);
    expect(accountOf(world)).toBe(1000);
    expect(output.events).toEqual([]);
  });

  it('[GDD-20.1] while_active charges an idle producer', () => {
    const world = makeWorld({
      maintenance: maintenanceOf({ chargePolicy: 'while_active' }),
      accounts: [{ resource: CREDITS, amount: 1000 }],
      producerState: 'idle',
    });
    run(world);
    expect(accountOf(world)).toBe(500);
  });

  it('[GDD-20.1] while_processing charges only a processing producer', () => {
    const idle = makeWorld({
      maintenance: maintenanceOf({ chargePolicy: 'while_processing' }),
      accounts: [{ resource: CREDITS, amount: 1000 }],
      producerState: 'idle',
    });
    run(idle);
    expect(accountOf(idle)).toBe(1000);

    const processing = makeWorld({
      maintenance: maintenanceOf({ chargePolicy: 'while_processing' }),
      accounts: [{ resource: CREDITS, amount: 1000 }],
      producerState: 'processing',
    });
    run(processing);
    expect(accountOf(processing)).toBe(500);
  });

  it('[GDD-20.1][INV-11] a deficit-paused entity pays no maintenance under any policy', () => {
    const world = makeWorld({
      maintenance: maintenanceOf({ chargePolicy: 'while_exists' }),
      accounts: [{ resource: CREDITS, amount: 1000 }],
      deficitPaused: [ENTITY],
    });
    const output = run(world);
    expect(accountOf(world)).toBe(1000);
    expect(output.events).toEqual([]);
  });

  it('[GDD-20.1] an entity under construction pays no maintenance', () => {
    const world = makeWorld({
      maintenance: maintenanceOf({ chargePolicy: 'while_exists' }),
      accounts: [{ resource: CREDITS, amount: 1000 }],
      lifecycle: 'constructing',
    });
    run(world);
    expect(accountOf(world)).toBe(1000);
    expect(lifecycleOf(world, ENTITY)).toBe('constructing');
  });
});

describe('[GDD-20.1] shortage policies', () => {
  it('[GDD-20.1] deactivate_entity disables a shorted entity', () => {
    const world = makeWorld({
      maintenance: maintenanceOf({ shortagePolicy: 'deactivate_entity' }),
      accounts: [{ resource: CREDITS, amount: 100 }],
    });
    const output = run(world);
    expect(accountOf(world)).toBe(100);
    expect(stores(world).get<{ enabled: boolean }>('enabled').get(ENTITY)?.enabled).toBe(false);
    const shortages = eventsOf(world, output, 'MaintenanceShortage');
    expect(shortages).toHaveLength(1);
    expect(shortages[0]?.payload).toEqual({
      resource: CREDITS,
      due: 500,
      policy: 'deactivate_entity',
    });
  });

  it('[GDD-20.1] scale charges the affordable part', () => {
    const world = makeWorld({
      maintenance: maintenanceOf({ shortagePolicy: 'scale' }),
      accounts: [{ resource: CREDITS, amount: 300 }],
    });
    const output = run(world);
    expect(accountOf(world)).toBe(0);
    const shortages = eventsOf(world, output, 'MaintenanceShortage');
    expect(shortages[0]?.payload).toEqual({
      resource: CREDITS,
      due: 500,
      charged: 300,
      policy: 'scale',
    });
  });

  it('[GDD-20.1] accumulate_debt accrues arrears and repays them later', () => {
    const shorted = makeWorld({
      maintenance: maintenanceOf({ shortagePolicy: 'accumulate_debt' }),
      accounts: [{ resource: CREDITS, amount: 0 }],
    });
    run(shorted);
    expect(accountOf(shorted)).toBe(0);
    const stored = stores(shorted).get<Maintenance>('maintenance').get(ENTITY);
    expect(stored?.arrears).toEqual([{ resource: CREDITS, quantity: 500 }]);

    const recovered = makeWorld({
      maintenance: maintenanceOf({
        shortagePolicy: 'accumulate_debt',
        arrears: [{ resource: CREDITS, quantity: 500 }],
      }),
      accounts: [{ resource: CREDITS, amount: 1000 }],
    });
    const output = run(recovered);
    expect(accountOf(recovered)).toBe(0);
    const charged = eventsOf(recovered, output, 'MaintenanceCharged');
    expect(charged[0]?.payload).toEqual({ resource: CREDITS, amount: 1000 });
    const cleared = stores(recovered).get<Maintenance>('maintenance').get(ENTITY);
    expect(cleared?.arrears).toEqual([]);
  });

  it('[GDD-20.1] ignore leaves the balance untouched', () => {
    const world = makeWorld({
      maintenance: maintenanceOf({ shortagePolicy: 'ignore' }),
      accounts: [{ resource: CREDITS, amount: 100 }],
    });
    const output = run(world);
    expect(accountOf(world)).toBe(100);
    expect(stores(world).get<{ enabled: boolean }>('enabled').get(ENTITY)?.enabled).toBe(true);
    expect(eventsOf(world, output, 'MaintenanceShortage')).toHaveLength(1);
  });

  it('[GDD-20.1] owner_deficit_policy emits the shortage event', () => {
    const world = makeWorld({
      maintenance: maintenanceOf({ shortagePolicy: 'owner_deficit_policy' }),
      accounts: [{ resource: CREDITS, amount: 100 }],
    });
    const output = run(world);
    expect(accountOf(world)).toBe(100);
    const shortages = eventsOf(world, output, 'MaintenanceShortage');
    expect(shortages[0]?.payload).toEqual({
      resource: CREDITS,
      due: 500,
      policy: 'owner_deficit_policy',
    });
  });

  it('[GDD-20.1] an unsupported shortage policy reaching runtime is a defect', () => {
    const world = makeWorld({
      maintenance: maintenanceOf({ shortagePolicy: 'trigger_transition' }),
      accounts: [{ resource: CREDITS, amount: 100 }],
    });
    expect(() => run(world)).toThrow(InvariantViolation);
  });
});
