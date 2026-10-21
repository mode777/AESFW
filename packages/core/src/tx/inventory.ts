/**
 * Inventory runtime shape (GDD-8.1, GDD-8.2, TDS-8.3). The component is plain,
 * canonical data: entries are ordered by ascending resource handle, and the
 * revision counter increments on every applied change so later projections can
 * diff.
 *
 * Source: GDD-8.1, GDD-8.2, TDS-8.3
 */
import type { Int } from '../fx/index.js';
import type { DefinitionHandle, OwnerHandle } from '../ids/index.js';

/** A stored resource quantity. */
export type InventoryEntry = {
  readonly resource: DefinitionHandle;
  readonly quantity: Int;
};

/** Capacity rules; `null` means unlimited (GDD-8.1). */
export type InventoryCapacity = {
  readonly total: Int | null;
  readonly perResource: Int | null;
};

/** Acceptance rules; an empty list accepts every resource (GDD-8.2). */
export type InventoryAcceptance = {
  readonly accepts: readonly DefinitionHandle[];
};

/** An inventory component (GDD-8.1). */
export type Inventory = {
  readonly owner: OwnerHandle;
  readonly policy: string;
  readonly revision: number;
  readonly entries: readonly InventoryEntry[];
  readonly capacity: InventoryCapacity;
  readonly acceptance: InventoryAcceptance;
};

/** Returns the stored quantity of `resource`, or `0` when absent. */
export function quantityOf(inventory: Inventory, resource: DefinitionHandle): Int {
  for (const entry of inventory.entries) {
    if (entry.resource === resource) return entry.quantity;
  }
  return 0;
}

/** Returns true when the inventory accepts `resource` (GDD-8.2). */
export function accepts(inventory: Inventory, resource: DefinitionHandle): boolean {
  const list = inventory.acceptance.accepts;
  if (list.length === 0) return true;
  return list.includes(resource);
}
