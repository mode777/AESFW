/**
 * Default world instantiation (CONT-6.6). Turns a plain `WorldPlan` into
 * location and inventory entities for a single owner, allocating IDs through
 * the world allocator so the result is deterministic.
 *
 * Source: CONT-6.4, CONT-6.6, ARCH-3.1
 */
import type { Int } from '../fx/index.js';
import { ownerHandle } from '../ids/index.js';
import type { DefinitionHandle, EntityId, OwnerHandle } from '../ids/index.js';
import type { Inventory, InventoryAcceptance, InventoryCapacity } from '../tx/inventory.js';
import type { OwnerState, World } from '../world/types.js';
import { allocateEntity } from '../world/create.js';
import type { Location, LocationHub, LocationProperty } from './location.js';

/** A planned inventory of a location. */
export type InventoryPlan = {
  readonly capacity: InventoryCapacity;
  readonly acceptance: InventoryAcceptance;
  readonly policy: string;
};

/** A planned location. */
export type LocationPlan = {
  readonly template: DefinitionHandle;
  readonly spatialPolicy: string;
  readonly capacity: Int;
  readonly properties: readonly LocationProperty[];
  readonly region: DefinitionHandle | null;
  readonly active: boolean;
  readonly inventories: readonly InventoryPlan[];
};

/** A default world plan: one owner and its locations. */
export type WorldPlan = {
  readonly owner: OwnerHandle;
  readonly locations: readonly LocationPlan[];
};

const emptyOwner = (handle: OwnerHandle): OwnerState => ({
  handle,
  knowledge: [],
  accounts: [],
  purposeLocks: [],
  unlocks: [],
  deficitPaused: [],
});

const ensureOwner = (world: World, owner: OwnerHandle): void => {
  if (world.owners.owners[owner] !== undefined) return;
  const owners = [...world.owners.owners];
  while (owners.length < owner) owners.push(emptyOwner(ownerHandle(owners.length)));
  owners[owner] = emptyOwner(owner);
  world.owners = { owners };
};

/**
 * Instantiates the locations and inventories of `plan` on `world`.
 *
 * Source: CONT-6.4, CONT-6.6, ARCH-3.1
 */
export function instantiateWorld(world: World, plan: WorldPlan): void {
  ensureOwner(world, plan.owner);
  const locationStore = world.stores.get<Location>('location');
  const hubStore = world.stores.get<LocationHub>('locationHub');
  const inventoryStore = world.stores.get<Inventory>('inventory');
  for (const locationPlan of plan.locations) {
    const locationEntity = allocateEntity(world);
    locationStore.set(locationEntity, {
      template: locationPlan.template,
      spatialPolicy: locationPlan.spatialPolicy,
      capacity: locationPlan.capacity,
      used: 0,
      properties: locationPlan.properties,
      region: locationPlan.region,
      active: locationPlan.active,
      owner: plan.owner,
    });
    const inventories: EntityId[] = [];
    for (const inventoryPlan of locationPlan.inventories) {
      const inventoryEntity = allocateEntity(world);
      inventoryStore.set(inventoryEntity, {
        owner: plan.owner,
        policy: inventoryPlan.policy,
        revision: 0,
        entries: [],
        capacity: inventoryPlan.capacity,
        acceptance: inventoryPlan.acceptance,
      });
      inventories.push(inventoryEntity);
    }
    hubStore.set(locationEntity, { inventories });
  }
}
