/**
 * Default world instantiation (CONT-6.6). Turns a plain `WorldPlan` into
 * location and inventory entities for a single owner, allocating IDs through
 * the world allocator so the result is deterministic.
 *
 * Source: CONT-6.4, CONT-6.6, ARCH-3.1
 */
import type { Int } from '../fx/index.js';
import { createStream, nextInt } from '../det/index.js';
import { ownerHandle } from '../ids/index.js';
import type { DefinitionHandle, EntityId, OwnerHandle } from '../ids/index.js';
import type { Inventory, InventoryAcceptance, InventoryCapacity } from '../tx/inventory.js';
import type { OwnerState, World } from '../world/types.js';
import { allocateEntity } from '../world/create.js';
import type { Location, LocationHub, LocationProperty } from './location.js';
import { buildableMask } from './spatial.js';
import type { LocationGrid } from './spatial.js';

/** A planned inventory of a location. */
export type InventoryPlan = {
  readonly capacity: InventoryCapacity;
  readonly acceptance: InventoryAcceptance;
  readonly policy: string;
};

/** A planned grid geometry of a location. */
export type LocationGridPlan = {
  readonly width: Int;
  readonly height: Int;
  /** Fixed non-buildable cells (packed), or `null` for a seeded mask. */
  readonly blocked: readonly Int[] | null;
  /** Seeded buildable ratio in permille, or `null` for a fixed mask. */
  readonly buildableRatio: { readonly min: Int; readonly max: Int } | null;
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
  /** Grid geometry, present only for a grid-policy location. */
  readonly grid?: LocationGridPlan;
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

const resolveGrid = (world: World, entity: EntityId, plan: LocationGridPlan): LocationGrid => {
  let blocked: Int[];
  if (plan.blocked !== null) {
    blocked = [...plan.blocked].sort((a, b) => a - b);
  } else if (plan.buildableRatio !== null) {
    const { min, max } = plan.buildableRatio;
    const ratio =
      max <= min
        ? min
        : min +
          nextInt(createStream(world.rng.seed, `spatial.ratio.${entity}`), max - min + 1).value;
    blocked = buildableMask(
      plan.width,
      plan.height,
      ratio,
      world.rng.seed,
      `spatial.buildable.${entity}`,
    );
  } else {
    blocked = [];
  }
  return { width: plan.width, height: plan.height, blocked };
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
    const grid =
      locationPlan.grid === undefined
        ? null
        : resolveGrid(world, locationEntity, locationPlan.grid);
    locationStore.set(locationEntity, {
      template: locationPlan.template,
      spatialPolicy: locationPlan.spatialPolicy,
      capacity:
        grid === null ? locationPlan.capacity : grid.width * grid.height - grid.blocked.length,
      used: 0,
      properties: locationPlan.properties,
      region: locationPlan.region,
      active: locationPlan.active,
      owner: plan.owner,
      ...(grid === null ? {} : { grid }),
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
