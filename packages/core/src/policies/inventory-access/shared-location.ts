/**
 * The `shared_location` inventory-access policy (ARCH-12). Every entity at a
 * location shares that location's inventories.
 *
 * Source: ARCH-12, GDD-8.2
 */
import type { DefinitionHandle, EntityId } from '../../ids/index.js';
import { locationHubOf } from '../../sim/location.js';
import { accepts } from '../../tx/inventory.js';
import type { Inventory } from '../../tx/inventory.js';
import type { Purpose, World } from '../../world/types.js';
import type { InventoryAccessPolicy } from './types.js';

/** The string id of the shared-location policy. */
export const SHARED_LOCATION_POLICY_ID = 'framework.inventory.shared_location';

/** True when the inventory's owner locked `(resource, purpose)` on it (GDD-8.5). */
const lockedFor = (
  world: World,
  inventory: EntityId,
  owner: number | null,
  resource: DefinitionHandle,
  purpose: Purpose,
): boolean => {
  if (owner === null) return false;
  const state = world.owners.owners[owner];
  if (state === undefined) return false;
  return state.purposeLocks.some(
    (lock) =>
      lock.inventory === inventory && lock.resource === resource && lock.purpose === purpose,
  );
};

const accessibleInventories = (
  world: World,
  location: EntityId,
  resource: DefinitionHandle,
  purpose: Purpose,
): readonly EntityId[] => {
  const hub = locationHubOf(world, location);
  if (hub === undefined) return [];
  const store = world.stores.get<Inventory>('inventory');
  const result: EntityId[] = [];
  for (const inventoryId of hub.inventories) {
    const inventory = store.get(inventoryId);
    if (inventory === undefined || !accepts(inventory, resource)) continue;
    if (lockedFor(world, inventoryId, inventory.owner, resource, purpose)) continue;
    result.push(inventoryId);
  }
  result.sort((left, right) => left - right);
  return result;
};

/** The shared-location inventory-access policy. */
export const sharedLocationPolicy: InventoryAccessPolicy = {
  id: SHARED_LOCATION_POLICY_ID,
  accessibleInventories,
};

const POLICIES: Readonly<Record<string, InventoryAccessPolicy>> = {
  [SHARED_LOCATION_POLICY_ID]: sharedLocationPolicy,
};

/** Resolves an inventory-access policy by id, or `null` when unknown. */
export function resolveInventoryAccessPolicy(id: string): InventoryAccessPolicy | null {
  return POLICIES[id] ?? null;
}
