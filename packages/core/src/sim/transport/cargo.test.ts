import { describe, expect, it } from 'vitest';
import { definitionHandle } from '../../ids/index.js';
import {
  cargoFreeCapacity,
  cargoQuantity,
  cargoSlotsValid,
  cargoTotal,
  loadCargo,
  unloadCargo,
} from './cargo.js';
import type { Cargo } from './types.js';

const resource = definitionHandle(1);
const other = definitionHandle(2);

const typed = (): Cargo => ({
  policy: 'typed_slots',
  slotCapacity: 100,
  slots: [
    { resource: null, quantity: 0 },
    { resource: null, quantity: 0 },
  ],
  entries: [],
  accepts: [],
});

describe('[GDD-15.4][INV-16] cargo compartments', () => {
  it('[GDD-15.4] typed slots fill one resource type per slot', () => {
    const first = loadCargo(typed(), resource, 100);
    expect(first.loaded).toBe(100);
    expect(first.cargo.slots).toEqual([
      { resource, quantity: 100 },
      { resource: null, quantity: 0 },
    ]);
    const second = loadCargo(first.cargo, other, 100);
    expect(second.loaded).toBe(100);
    expect(second.cargo.slots[1]).toEqual({ resource: other, quantity: 100 });
    expect(loadCargo(second.cargo, resource, 10).loaded).toBe(0);
  });

  it('[INV-16] a typed cargo remains valid after loading and unloading', () => {
    const loaded = loadCargo(typed(), resource, 120).cargo;
    expect(cargoSlotsValid(loaded)).toBe(true);
    const unloaded = unloadCargo(loaded, resource, 100).cargo;
    expect(cargoSlotsValid(unloaded)).toBe(true);
    expect(cargoQuantity(unloaded, resource)).toBe(20);
  });

  it('[GDD-15.4] unrestricted cargo shares one capacity', () => {
    const cargo: Cargo = {
      policy: 'unrestricted',
      slotCapacity: 100,
      slots: [],
      entries: [],
      accepts: [],
    };
    const loaded = loadCargo(cargo, resource, 80).cargo;
    expect(cargoFreeCapacity(loaded, other)).toBe(20);
    const second = loadCargo(loaded, other, 50);
    expect(second.loaded).toBe(20);
    expect(cargoTotal(second.cargo)).toBe(100);
  });

  it('[GDD-15.4] per-resource cargo limits each resource independently', () => {
    const cargo: Cargo = {
      policy: 'per_resource',
      slotCapacity: 100,
      slots: [],
      entries: [],
      accepts: [],
    };
    const loaded = loadCargo(cargo, resource, 120).cargo;
    expect(cargoQuantity(loaded, resource)).toBe(100);
    expect(cargoFreeCapacity(loaded, other)).toBe(100);
  });

  it('[GDD-15.4] a rejected resource cannot be loaded', () => {
    const cargo: Cargo = { ...typed(), accepts: [other] };
    expect(loadCargo(cargo, resource, 10).loaded).toBe(0);
  });
});
