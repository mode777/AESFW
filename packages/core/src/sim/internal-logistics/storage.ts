/**
 * Storage-provider expansion (GDD-9.7, CONT-6.8). A storage provider adds
 * inventory capacity and internal-logistics throughput while it is active. The
 * bonuses are derived from the `modifierSet` store so no inventory component is
 * mutated and removal needs no reversal.
 *
 * Source: GDD-9.7, GDD-8.1, GDD-6.6, TDS-8.3
 */
import type { Int } from '../../fx/index.js';
import type { DefinitionHandle, EntityId } from '../../ids/index.js';
import type { Registry } from '../../registry/types.js';
import type { Inventory } from '../../tx/inventory.js';
import type { World } from '../../world/types.js';
import { lifecycleOf } from '../construction/lifecycle.js';
import { locationHubOf } from '../location.js';
import { entityComponentsOf } from '../placement/definition.js';
import type { StorageProvider } from './types.js';

const ACTIVE_LIFECYCLES = new Set(['active', 'disabled', 'blocked']);

const asRecord = (value: unknown): { readonly [key: string]: unknown } | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as { readonly [key: string]: unknown })
    : null;

const asInt = (value: unknown): Int =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;

const modifierStore = (world: World) => world.stores.get('modifierSet');

const isStorageProvider = (value: unknown): value is StorageProvider =>
  typeof value === 'object' &&
  value !== null &&
  (value as { readonly kind?: unknown }).kind === 'storage_provider';

/** True when a provider's entity contributes its bonuses (D3). */
export function storageProviderIsActive(world: World, entity: EntityId): boolean {
  const lifecycle = lifecycleOf(world, entity);
  return lifecycle === undefined || ACTIVE_LIFECYCLES.has(lifecycle);
}

/** The effective total and per-resource capacity of an inventory. */
export function effectiveInventoryCapacity(
  world: World,
  inventory: EntityId,
): { readonly total: Int | null; readonly perResource: Int | null } {
  const component = world.stores.get<Inventory>('inventory').get(inventory);
  if (component === undefined) return { total: null, perResource: null };
  let totalBonus = 0;
  let perResourceBonus = 0;
  const store = modifierStore(world);
  for (const entity of store.ids()) {
    const provider = store.get(entity) as unknown;
    if (!isStorageProvider(provider) || provider.inventory !== inventory) continue;
    if (!storageProviderIsActive(world, entity)) continue;
    totalBonus += provider.capacityTotal;
    perResourceBonus += provider.capacityPerResource;
  }
  return {
    total: component.capacity.total === null ? null : component.capacity.total + totalBonus,
    perResource:
      component.capacity.perResource === null
        ? null
        : component.capacity.perResource + perResourceBonus,
  };
}

/** The throughput bonus of active storage providers at a location. */
export function storageThroughputBonus(world: World, location: EntityId): Int {
  let total = 0;
  const store = modifierStore(world);
  for (const entity of store.ids()) {
    const provider = store.get(entity) as unknown;
    if (!isStorageProvider(provider) || provider.location !== location) continue;
    if (!storageProviderIsActive(world, entity)) continue;
    total += provider.throughput;
  }
  return total;
}

const resolveInventory = (world: World, location: EntityId, reference: string): EntityId | null => {
  const hub = locationHubOf(world, location);
  if (hub === undefined) return null;
  const local = reference.startsWith('location.') ? reference.slice('location.'.length) : reference;
  void local;
  return hub.inventories[0] ?? null;
};

/**
 * Records a placed or instantiated entity's storage-provider component, if its
 * definition declares one (D5). Idempotent: an existing entry is replaced.
 *
 * Source: GDD-9.7, CONT-6.8
 */
export function applyStorageProvider(
  world: World,
  registry: Registry,
  definition: DefinitionHandle,
  entity: EntityId,
  location: EntityId,
): void {
  const components = entityComponentsOf(registry, definition);
  const raw = components?.['storage_provider'];
  const component = asRecord(raw);
  if (component === null) return;
  const reference = component['inventory'];
  if (typeof reference !== 'string') return;
  const inventory = resolveInventory(world, location, reference);
  if (inventory === null) return;
  const capacity = asRecord(component['capacity']);
  const provider: StorageProvider = {
    kind: 'storage_provider',
    inventory,
    location,
    capacityTotal: asInt(capacity?.['total']),
    capacityPerResource: asInt(capacity?.['per_resource']),
    throughput: asInt(component['throughput']),
  };
  modifierStore(world).set(entity, provider);
}
