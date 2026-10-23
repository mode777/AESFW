/**
 * Pure cargo-compartment operations (GDD-15.4, INV-16). Typed slots hold one
 * resource type each; unrestricted cargo shares one capacity; per-resource
 * cargo limits each resource independently. Loading and unloading never
 * exceed capacity and are deterministic in ascending slot or resource order.
 *
 * Source: GDD-15.4, INV-16
 */
import type { Int } from '../../fx/index.js';
import type { DefinitionHandle } from '../../ids/index.js';
import type { Cargo, CargoEntry, CargoSlot } from './types.js';

/** True when the cargo accepts `resource`. */
export function cargoAccepts(cargo: Cargo, resource: DefinitionHandle): boolean {
  return cargo.accepts.length === 0 || cargo.accepts.includes(resource);
}

/** The total quantity held by the cargo. */
export function cargoTotal(cargo: Cargo): Int {
  let total = 0;
  for (const slot of cargo.slots) total += slot.quantity;
  for (const entry of cargo.entries) total += entry.quantity;
  return total;
}

/** The quantity of one resource held by the cargo. */
export function cargoQuantity(cargo: Cargo, resource: DefinitionHandle): Int {
  if (cargo.policy === 'typed_slots') {
    let total = 0;
    for (const slot of cargo.slots) {
      if (slot.resource === resource) total += slot.quantity;
    }
    return total;
  }
  for (const entry of cargo.entries) {
    if (entry.resource === resource) return entry.quantity;
  }
  return 0;
}

/** The free capacity for one resource. */
export function cargoFreeCapacity(cargo: Cargo, resource: DefinitionHandle): Int {
  if (!cargoAccepts(cargo, resource)) return 0;
  if (cargo.policy === 'unrestricted') {
    return Math.max(0, cargo.slotCapacity - cargoTotal(cargo));
  }
  if (cargo.policy === 'per_resource') {
    return Math.max(0, cargo.slotCapacity - cargoQuantity(cargo, resource));
  }
  let capacity = 0;
  for (const slot of cargo.slots) {
    if (slot.resource === null || slot.resource === resource) {
      capacity += cargo.slotCapacity - slot.quantity;
    }
  }
  return capacity;
}

const entriesWith = (
  entries: readonly CargoEntry[],
  resource: DefinitionHandle,
  quantity: Int,
): CargoEntry[] => {
  const map = new Map<number, number>();
  for (const entry of entries) map.set(entry.resource, entry.quantity);
  if (quantity === 0) map.delete(resource);
  else map.set(resource, quantity);
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([handle, amount]) => ({
      resource: handle as DefinitionHandle,
      quantity: amount,
    }));
};

/** Loads up to `quantity` and returns the new cargo and the loaded amount. */
export function loadCargo(
  cargo: Cargo,
  resource: DefinitionHandle,
  quantity: Int,
): { readonly cargo: Cargo; readonly loaded: Int } {
  const available = Math.min(quantity, cargoFreeCapacity(cargo, resource));
  if (available <= 0) return { cargo, loaded: 0 };
  if (cargo.policy === 'typed_slots') {
    let remaining = available;
    const slots: CargoSlot[] = [];
    for (const slot of cargo.slots) {
      if (remaining > 0 && slot.resource === resource && slot.quantity < cargo.slotCapacity) {
        const added = Math.min(remaining, cargo.slotCapacity - slot.quantity);
        slots.push({ resource, quantity: slot.quantity + added });
        remaining -= added;
        continue;
      }
      if (remaining > 0 && slot.resource === null) {
        const added = Math.min(remaining, cargo.slotCapacity);
        slots.push({ resource, quantity: added });
        remaining -= added;
        continue;
      }
      slots.push(slot);
    }
    return { cargo: { ...cargo, slots }, loaded: available - remaining };
  }
  const current = cargoQuantity(cargo, resource);
  return {
    cargo: { ...cargo, entries: entriesWith(cargo.entries, resource, current + available) },
    loaded: available,
  };
}

/** Unloads up to `quantity` and returns the new cargo and the unloaded amount. */
export function unloadCargo(
  cargo: Cargo,
  resource: DefinitionHandle,
  quantity: Int,
): { readonly cargo: Cargo; readonly unloaded: Int } {
  const available = Math.min(quantity, cargoQuantity(cargo, resource));
  if (available <= 0) return { cargo, unloaded: 0 };
  if (cargo.policy === 'typed_slots') {
    let remaining = available;
    const slots: CargoSlot[] = [];
    for (const slot of cargo.slots) {
      if (remaining > 0 && slot.resource === resource) {
        const removed = Math.min(remaining, slot.quantity);
        const left = slot.quantity - removed;
        remaining -= removed;
        slots.push({ resource: left === 0 ? null : resource, quantity: left });
        continue;
      }
      slots.push(slot);
    }
    return { cargo: { ...cargo, slots }, unloaded: available };
  }
  return {
    cargo: {
      ...cargo,
      entries: entriesWith(cargo.entries, resource, cargoQuantity(cargo, resource) - available),
    },
    unloaded: available,
  };
}

/** True when every typed slot holds at most one resource and within capacity (INV-16). */
export function cargoSlotsValid(cargo: Cargo): boolean {
  if (cargo.policy !== 'typed_slots') return true;
  for (const slot of cargo.slots) {
    if (slot.quantity < 0 || slot.quantity > cargo.slotCapacity) return false;
    if (slot.resource === null && slot.quantity !== 0) return false;
  }
  return true;
}
