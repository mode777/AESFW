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
import type {
  Inventory,
  InventoryAcceptance,
  InventoryCapacity,
  InventoryEntry,
} from '../tx/inventory.js';
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
  /** Cells kept buildable for authored initial entities (CONT-6.4, CONT-6.6). */
  readonly reservedCells?: readonly Int[];
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
  /** Authored top-left cell of the footprint, or `null` when unplaced (CONT-6.6). */
  readonly position?: { readonly x: Int; readonly y: Int } | null;
  /** Authored orientation, defaulting to 0 (CONT-6.6). */
  readonly orientation?: Int;
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

/**
 * A seeded generation descriptor attached to locations of a seeded
 * distribution rule (CONT-6.18, GDD-6.5). The lists are in ascending order;
 * instantiation assigns each name to one region through the seed stream.
 */
export type GeneratedAttributesPlan = {
  readonly streamName: string;
  readonly regions: readonly DefinitionHandle[];
  readonly propertyNames: readonly StringId[];
  readonly slotTypes: readonly StringId[];
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
  /** Seeded distribution-rule generation, present for seeded-rule regions. */
  readonly generated?: GeneratedAttributesPlan;
  /** The establishment governing founding, present when the template declares one. */
  readonly establishment?: DefinitionHandle;
  /** The location's owner; `null` is unowned, otherwise defaults to the plan default. */
  readonly owner?: OwnerHandle | null;
  /** Initial stock of the location's first inventory (CONT-6.6, A15). */
  readonly initialInventory?: readonly InventoryEntry[];
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
      plan.reservedCells ?? [],
    );
  } else {
    blocked = [];
  }
  return { width: plan.width, height: plan.height, blocked };
};

/**
 * Assigns each generated name to one of the descriptor's regions: a name
 * authored with a non-zero value or slot count on a location of the rule keeps
 * its authoring region, the remaining names are drawn from the named seed
 * stream in ascending name order (CONT-6.18). Respecting authored supply keeps
 * the disjoint guarantee intact after generation.
 *
 * Source: GDD-3.3, GDD-6.5, TDS-15
 */
const generatedOwners = (
  world: World,
  plan: WorldPlan,
  descriptor: GeneratedAttributesPlan,
  names: readonly StringId[],
  authored: (location: LocationPlan, name: StringId) => boolean,
): Map<StringId, DefinitionHandle> => {
  const owners = new Map<StringId, DefinitionHandle>();
  const nameSet = new Set(names);
  for (const locationPlan of plan.locations) {
    if (locationPlan.generated !== descriptor || locationPlan.region === null) continue;
    for (const name of names) {
      if (owners.has(name) || !authored(locationPlan, name) || !nameSet.has(name)) continue;
      owners.set(name, locationPlan.region);
    }
  }
  for (const name of names) {
    if (owners.has(name)) continue;
    const draw = nextInt(
      createStream(world.rng.seed, `${descriptor.streamName}.${name}`),
      descriptor.regions.length,
    ).value;
    const region = descriptor.regions[draw];
    if (region !== undefined) owners.set(name, region);
  }
  return owners;
};

const applyGeneratedAttributes = (
  world: World,
  plan: WorldPlan,
  descriptor: GeneratedAttributesPlan,
  location: Location,
): Location => {
  const ownerByProperty = generatedOwners(
    world,
    plan,
    descriptor,
    descriptor.propertyNames,
    (locationPlan, name) =>
      locationPlan.properties.some((entry) => entry.property === name && entry.value > 0),
  );
  const present = new Set(location.properties.map((entry) => entry.property));
  const filled: LocationProperty[] = [];
  for (const name of descriptor.propertyNames) {
    if (present.has(name)) continue;
    const owner = ownerByProperty.get(name);
    if (owner === undefined) continue;
    filled.push({ property: name, value: owner === location.region ? 1000 : 0 });
  }
  const properties = [...location.properties, ...filled].sort((a, b) =>
    a.property < b.property ? -1 : a.property > b.property ? 1 : 0,
  );
  let sourceSlots = location.sourceSlots;
  if (sourceSlots === undefined || sourceSlots.length === 0) {
    const ownerBySlot = generatedOwners(
      world,
      plan,
      descriptor,
      descriptor.slotTypes,
      (locationPlan, type) =>
        (locationPlan.sourceSlots ?? []).some((slot) => slot.type === type && slot.count > 0),
    );
    const slots: SourceSlot[] = [];
    for (const type of descriptor.slotTypes) {
      if (ownerBySlot.get(type) !== location.region) continue;
      slots.push({ type, count: 1 });
    }
    sourceSlots = slots;
  }
  return { ...location, properties, ...(sourceSlots.length === 0 ? {} : { sourceSlots }) };
};

/**
 * The initial stock of a location's first inventory (CONT-6.6, A15): entries
 * in ascending resource handle, duplicate lines summed, non-positive lines
 * dropped, and each quantity clamped to the inventory's per-resource and
 * remaining total capacity in that order.
 *
 * Source: CONT-6.6
 */
const initialEntries = (
  stock: readonly InventoryEntry[] | undefined,
  inventory: InventoryPlan,
): readonly InventoryEntry[] => {
  if (stock === undefined || stock.length === 0) return [];
  const summed = new Map<DefinitionHandle, Int>();
  for (const entry of stock) {
    if (entry.quantity <= 0) continue;
    summed.set(entry.resource, (summed.get(entry.resource) ?? 0) + entry.quantity);
  }
  let remaining = inventory.capacity.total;
  const entries: InventoryEntry[] = [];
  for (const resource of [...summed.keys()].sort((a, b) => a - b)) {
    let quantity = summed.get(resource) ?? 0;
    const perResource = inventory.capacity.perResource;
    if (perResource !== null && quantity > perResource) quantity = perResource;
    if (remaining !== null) {
      if (quantity > remaining) quantity = remaining;
      remaining -= quantity;
    }
    if (quantity > 0) entries.push({ resource, quantity });
  }
  return entries;
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
    let component: Location = {
      template: locationPlan.template,
      spatialPolicy: locationPlan.spatialPolicy,
      capacity:
        grid === null ? locationPlan.capacity : grid.width * grid.height - grid.blocked.length,
      used: 0,
      properties: locationPlan.properties,
      region: locationPlan.region,
      ...(locationPlan.establishment === undefined
        ? {}
        : { establishment: locationPlan.establishment }),
      active: locationPlan.active,
      owner: locationPlan.owner === null ? null : (locationPlan.owner ?? plan.owner),
      ...(grid === null ? {} : { grid }),
      ...(locationPlan.sourceSlots === undefined || locationPlan.sourceSlots.length === 0
        ? {}
        : { sourceSlots: locationPlan.sourceSlots }),
    };
    if (locationPlan.generated !== undefined) {
      component = applyGeneratedAttributes(world, plan, locationPlan.generated, component);
    }
    locationStore.set(locationEntity, component);
    const inventories: EntityId[] = [];
    locationPlan.inventories.forEach((inventoryPlan, index) => {
      const inventoryEntity = allocateEntity(world);
      inventoryStore.set(inventoryEntity, {
        owner: locationPlan.owner ?? plan.owner,
        policy: inventoryPlan.policy,
        revision: 0,
        entries: index === 0 ? initialEntries(locationPlan.initialInventory, inventoryPlan) : [],
        capacity: inventoryPlan.capacity,
        acceptance: inventoryPlan.acceptance,
      });
      inventories.push(inventoryEntity);
    });
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
