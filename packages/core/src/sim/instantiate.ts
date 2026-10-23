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
import type { DefinitionHandle, EntityId, OwnerHandle, StringId } from '../ids/index.js';
import type { Inventory, InventoryAcceptance, InventoryCapacity } from '../tx/inventory.js';
import type { KnowledgeLevel, OwnerState, World } from '../world/types.js';
import type { ThroughputPool } from './internal-logistics/types.js';
import { allocateEntity } from '../world/create.js';
import type {
  Location,
  LocationConnection,
  LocationHub,
  LocationProperty,
  SourceSlot,
} from './location.js';
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

/** A planned internal-logistics configuration. */
export type InternalLogisticsPlan = {
  readonly policy: string;
  readonly baseThroughput: Int;
  readonly baseThroughputCapability: DefinitionHandle | null;
};

/** A planned owner account entry. */
export type OwnerAccountPlan = {
  readonly resource: DefinitionHandle;
  readonly amount: Int;
};

/** A planned owner knowledge entry, indexing the world plan's location list. */
export type OwnerKnowledgePlan = {
  readonly locationIndex: Int;
  readonly level: KnowledgeLevel;
};

/** A planned owner. */
export type OwnerPlan = {
  readonly handle: OwnerHandle;
  readonly accounts: readonly OwnerAccountPlan[];
  readonly knowledge: readonly OwnerKnowledgePlan[];
};

/** A planned initial entity, indexing the world plan's location list. */
export type InitialEntityPlan = {
  readonly definition: DefinitionHandle;
  readonly locationIndex: Int;
  readonly owner: OwnerHandle;
};

/** A planned connection instance, indexing the world plan's location list. */
export type ConnectionPlan = {
  readonly id: StringId;
  readonly definition: DefinitionHandle;
  readonly originIndex: Int;
  readonly destinationIndex: Int;
  readonly direction: 'one_way' | 'bidirectional';
  readonly baseDurationTicks: Int;
  readonly enabled: boolean;
  readonly allowedTransportTags: readonly StringId[];
};

/** A planned location. */
export type LocationPlan = {
  readonly template: DefinitionHandle;
  readonly spatialPolicy: string;
  readonly capacity: Int;
  readonly properties: readonly LocationProperty[];
  readonly sourceSlots?: readonly SourceSlot[];
  readonly region: DefinitionHandle | null;
  readonly active: boolean;
  readonly inventories: readonly InventoryPlan[];
  /** Grid geometry, present only for a grid-policy location. */
  readonly grid?: LocationGridPlan;
  /** Internal-logistics configuration, present only for a limited location. */
  readonly internalLogistics?: InternalLogisticsPlan;
  /** The location's owner; defaults to the plan's default owner. */
  readonly owner?: OwnerHandle;
};

/** A world plan: a default owner, optional additional owners, locations, and connections. */
export type WorldPlan = {
  readonly owner: OwnerHandle;
  readonly owners?: readonly OwnerPlan[];
  readonly locations: readonly LocationPlan[];
  readonly connections?: readonly ConnectionPlan[];
  readonly initialEntities?: readonly InitialEntityPlan[];
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
  for (const ownerPlan of plan.owners ?? []) {
    ensureOwner(world, ownerPlan.handle);
    const owner = world.owners.owners[ownerPlan.handle];
    if (owner === undefined) continue;
    const accounts = [...ownerPlan.accounts]
      .sort((a, b) => a.resource - b.resource)
      .map((entry) => ({ resource: entry.resource, amount: entry.amount }));
    const owners = [...world.owners.owners];
    owners[ownerPlan.handle] = { ...owner, accounts };
    world.owners = { owners };
  }
  const locationStore = world.stores.get<Location>('location');
  const hubStore = world.stores.get<LocationHub>('locationHub');
  const inventoryStore = world.stores.get<Inventory>('inventory');
  const locationEntities: EntityId[] = [];
  for (const locationPlan of plan.locations) {
    const locationEntity = allocateEntity(world);
    locationEntities.push(locationEntity);
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
      owner: locationPlan.owner ?? plan.owner,
      ...(grid === null ? {} : { grid }),
      ...(locationPlan.sourceSlots === undefined || locationPlan.sourceSlots.length === 0
        ? {}
        : { sourceSlots: locationPlan.sourceSlots }),
    });
    const inventories: EntityId[] = [];
    for (const inventoryPlan of locationPlan.inventories) {
      const inventoryEntity = allocateEntity(world);
      inventoryStore.set(inventoryEntity, {
        owner: locationPlan.owner ?? plan.owner,
        policy: inventoryPlan.policy,
        revision: 0,
        entries: [],
        capacity: inventoryPlan.capacity,
        acceptance: inventoryPlan.acceptance,
      });
      inventories.push(inventoryEntity);
    }
    hubStore.set(locationEntity, { inventories });
    if (locationPlan.internalLogistics !== undefined) {
      const logistics = locationPlan.internalLogistics;
      const pool: ThroughputPool = {
        policy: logistics.policy,
        baseCapacity: logistics.baseThroughput,
        baseThroughputCapability: logistics.baseThroughputCapability,
        capacity: logistics.baseThroughput,
        requested: 0,
        throttlePermille: 1000,
      };
      world.stores.get<ThroughputPool>('throughputPool').set(locationEntity, pool);
    }
  }

  for (const ownerPlan of plan.owners ?? []) {
    if (ownerPlan.knowledge.length === 0) continue;
    const owner = world.owners.owners[ownerPlan.handle];
    if (owner === undefined) continue;
    const knowledge = ownerPlan.knowledge
      .map((entry) => {
        const location = locationEntities[entry.locationIndex];
        return location === undefined ? null : { location, level: entry.level };
      })
      .filter((entry): entry is { location: EntityId; level: KnowledgeLevel } => entry !== null)
      .sort((a, b) => a.location - b.location);
    const owners = [...world.owners.owners];
    owners[ownerPlan.handle] = { ...owner, knowledge };
    world.owners = { owners };
  }

  const byOrigin = new Map<EntityId, LocationConnection[]>();
  for (const connectionPlan of plan.connections ?? []) {
    const origin = locationEntities[connectionPlan.originIndex];
    const destination = locationEntities[connectionPlan.destinationIndex];
    if (origin === undefined || destination === undefined) continue;
    const connection: LocationConnection = {
      id: connectionPlan.id,
      definition: connectionPlan.definition,
      origin,
      destination,
      direction: connectionPlan.direction,
      baseDurationTicks: connectionPlan.baseDurationTicks,
      enabled: connectionPlan.enabled,
      allowedTransportTags: [...connectionPlan.allowedTransportTags],
    };
    const origins = connectionPlan.direction === 'bidirectional' ? [origin, destination] : [origin];
    for (const endpoint of origins) {
      const list = byOrigin.get(endpoint) ?? [];
      list.push(connection);
      byOrigin.set(endpoint, list);
    }
  }
  for (const [entity, connections] of byOrigin) {
    const component = locationStore.get(entity);
    if (component === undefined) continue;
    locationStore.set(entity, {
      ...component,
      connections: [...connections].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    });
  }
}
