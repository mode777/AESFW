import { describe, expect, it } from 'vitest';
import { createWorld } from '../../world/create.js';
import { createEmptyRegistry } from '../../registry/types.js';
import { definitionHandle, entityId, ownerHandle } from '../../ids/index.js';
import type { Inventory } from '../../tx/inventory.js';
import { actionTarget } from './orders.js';
import type { Cargo, QuantityRule, StationAction } from './types.js';

const resource = definitionHandle(0);

const setup = (cargo: Cargo, inventoryQuantity: number) => {
  const created = createWorld(createEmptyRegistry(), {
    seed: [0, 0],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
  });
  if (!created.ok) throw new Error('world creation failed');
  const world = created.value;
  world.stores.get<Inventory>('inventory').set(entityId(1), {
    owner: ownerHandle(0),
    policy: 'framework.inventory.shared_location',
    revision: 0,
    entries: [{ resource, quantity: inventoryQuantity }],
    capacity: { total: 1000, perResource: null },
    acceptance: { accepts: [] },
  });
  world.stores.get<Cargo>('cargo').set(entityId(2), cargo);
  return world;
};

const cargoWith = (quantity: number): Cargo => ({
  policy: 'unrestricted',
  slotCapacity: 200,
  slots: [],
  entries: quantity === 0 ? [] : [{ resource, quantity }],
  accepts: [],
});

const action = (kind: 'load' | 'unload', rule: QuantityRule): StationAction => ({
  resource,
  action: kind,
  rule,
});

const target = (
  kind: 'load' | 'unload',
  rule: QuantityRule,
  cargoQty: number,
  inventoryQty: number,
) =>
  actionTarget(
    setup(cargoWith(cargoQty), inventoryQty),
    entityId(2),
    action(kind, rule),
    entityId(1),
  );

describe('[GDD-15.3] transport quantity rules', () => {
  it('[GDD-15.3] fixed loads and unloads the configured quantity', () => {
    expect(target('load', { mode: 'fixed', quantity: 30 }, 0, 100)).toBe(30);
    expect(target('unload', { mode: 'fixed', quantity: 30 }, 40, 10)).toBe(30);
  });

  it('[GDD-15.3] up to capacity loads all free space', () => {
    expect(target('load', { mode: 'up_to_capacity' }, 150, 100)).toBe(50);
  });

  it('[GDD-15.3] all carried unloads the cargo', () => {
    expect(target('unload', { mode: 'all' }, 40, 10)).toBe(40);
  });

  it('[GDD-15.3] excess above origin reserve leaves the reserve', () => {
    expect(target('load', { mode: 'excess_above', quantity: 70 }, 0, 100)).toBe(30);
  });

  it('[GDD-15.3] maintain origin minimum leaves the minimum', () => {
    expect(target('load', { mode: 'maintain_origin_minimum', quantity: 70 }, 0, 100)).toBe(30);
    expect(target('unload', { mode: 'maintain_origin_minimum', quantity: 10 }, 40, 0)).toBe(30);
  });

  it('[GDD-15.3] deficit below destination target fills the destination deficit', () => {
    expect(target('unload', { mode: 'deficit_below', quantity: 70 }, 40, 10)).toBe(40);
    expect(target('unload', { mode: 'deficit_below', quantity: 70 }, 40, 50)).toBe(20);
  });

  it('[GDD-15.3] maintain destination target unloads only to the target', () => {
    expect(target('unload', { mode: 'maintain_destination_target', quantity: 70 }, 40, 50)).toBe(
      20,
    );
    expect(target('unload', { mode: 'maintain_destination_target', quantity: 70 }, 40, 80)).toBe(0);
  });

  it('[GDD-15.3] priority list chooses the first fitting quantity', () => {
    expect(target('load', { mode: 'priority_list', quantities: [80, 40, 10] }, 0, 50)).toBe(40);
    expect(target('unload', { mode: 'priority_list', quantities: [80, 40, 10] }, 50, 0)).toBe(40);
  });

  it('[GDD-15.3] a target never exceeds the available side', () => {
    expect(target('load', { mode: 'fixed', quantity: 500 }, 0, 50)).toBe(50);
    expect(target('unload', { mode: 'fixed', quantity: 500 }, 20, 0)).toBe(20);
  });
});
