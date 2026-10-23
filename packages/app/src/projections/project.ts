/**
 * The full per-actor projection (TDS-18.4, PIC-9.1). Builds a `SnapshotDto`
 * from a `WorldReader`; fog filtering is delivered by row 8.4.
 *
 * Source: TDS-18.4, PIC-9.1, ARCH-8.2
 */
import {
  curveMultiplier,
  effectiveInventoryCapacity,
  isCharging,
  isConnected,
  readWorld,
  resourceStoragePolicy,
} from '@aesfw/core';
import type {
  ConnectivityNode,
  DefinitionHandle,
  DefinitionType,
  EntityId,
  Footprint,
  LogicalTransform,
  Maintenance,
  OwnerHandle,
  PopulationGroup,
  Producer,
  Registry,
  Residence,
  Satisfaction,
  ThroughputPool,
  World,
  WorldReader,
} from '@aesfw/core';
import type {
  ConnectivityDto,
  EntityDto,
  OwnerBalanceDto,
  InventoryDto,
  InventoryEntryDto,
  LocationDto,
  OwnerDto,
  ProductionDto,
  SnapshotDto,
  ThroughputDto,
  SpatialDto,
} from '@aesfw/protocol';
import type { SessionState } from '../session/types.js';

const resourceId = (registry: Registry, handle: DefinitionHandle): string =>
  registry.stringIdOf('resource', handle) ?? `resource.${handle}`;

const definitionId = (
  registry: Registry,
  type: DefinitionType,
  handle: DefinitionHandle,
): string | null => registry.stringIdOf(type, handle);

const balanceDto = (world: World, registry: Registry, handle: OwnerHandle): OwnerBalanceDto => {
  const residenceStore = world.stores.get<Residence>('residence');
  const groupStore = world.stores.get<PopulationGroup>('populationGroup');
  const satisfactionStore = world.stores.get<Satisfaction>('satisfaction');
  const maintenanceStore = world.stores.get<Maintenance>('maintenance');
  const ownerOf = (entity: EntityId): OwnerHandle | null =>
    world.stores.get<{ owner: OwnerHandle }>('owner').get(entity)?.owner ?? null;

  const revenueBySource: Record<string, number> = {};
  for (const entity of residenceStore.ids()) {
    if (ownerOf(entity) !== handle) continue;
    const residence = residenceStore.get(entity);
    if (residence === undefined) continue;
    const group = groupStore.get(entity);
    if (group === undefined || group.count <= 0) continue;
    const z = satisfactionStore.get(entity)?.z ?? 1000;
    for (const output of residence.outputs) {
      if (resourceStoragePolicy(registry, output.resource) !== 'normal') continue;
      const multiplier =
        output.satisfactionCurve === null
          ? 1000
          : curveMultiplier(registry, output.satisfactionCurve, z);
      const amount = Math.floor(
        (group.count * output.ratePerPopulationPerTick * multiplier) / 1000,
      );
      if (amount === 0) continue;
      const tierId = registry.stringIdOf('tier', residence.tier) ?? String(residence.tier);
      revenueBySource[`tier.${tierId}`] = (revenueBySource[`tier.${tierId}`] ?? 0) + amount;
    }
  }

  const expensesBySource: Record<string, number> = {};
  const idlePaying: number[] = [];
  for (const entity of maintenanceStore.ids()) {
    if (ownerOf(entity) !== handle) continue;
    const maintenance = maintenanceStore.get(entity);
    if (maintenance === undefined) continue;
    if (!isCharging(world, entity, maintenance.chargePolicy)) continue;
    let perTick = 0;
    for (const line of maintenance.inputs) {
      perTick += Math.floor(line.quantity / maintenance.intervalTicks);
    }
    if (perTick > 0) {
      expensesBySource[`entity.${entity as number}`] = perTick;
    }
    const producer = world.stores.get<Producer>('producer').get(entity);
    if (producer !== undefined && producer.state !== 'processing') {
      idlePaying.push(entity);
    }
  }

  const revenue = Object.values(revenueBySource).reduce((total, value) => total + value, 0);
  const expenses = Object.values(expensesBySource).reduce((total, value) => total + value, 0);
  const paused = world.owners.owners.find((entry) => entry.handle === handle)?.deficitPaused ?? [];

  return {
    revenue_per_interval: revenue,
    expenses_per_interval: expenses,
    net_per_interval: revenue - expenses,
    deficit_paused_entities: paused,
    revenue_by_source: revenueBySource,
    expenses_by_source: expensesBySource,
    idle_paying_entities: idlePaying,
  };
};

const ownerDto = (world: World, registry: Registry, handle: OwnerHandle): OwnerDto => {
  const resources: Record<string, number> = {};
  for (const account of world.owners.owners[handle]?.accounts ?? []) {
    resources[resourceId(registry, account.resource)] = account.amount;
  }
  return { owner_id: `owner.${handle}`, resources, balance: balanceDto(world, registry, handle) };
};

const inventoryDto = (
  reader: WorldReader,
  world: World,
  registry: Registry,
  id: EntityId,
): InventoryDto => {
  const inventory = reader.inventory(id);
  const entries: InventoryEntryDto[] = [];
  if (inventory !== undefined) {
    const reserved = new Map<number, number>();
    for (const reservation of reader.reservations()) {
      if (reservation.inventory !== id || reservation.capacity) continue;
      reserved.set(
        reservation.resource,
        (reserved.get(reservation.resource) ?? 0) + reservation.quantity,
      );
    }
    for (const entry of inventory.entries) {
      const effective = effectiveInventoryCapacity(world, id);
      const capacity = effective.perResource ?? effective.total;
      entries.push({
        resource_id: resourceId(registry, entry.resource),
        stored: entry.quantity,
        reserved: reserved.get(entry.resource) ?? 0,
        ...(capacity === null ? {} : { capacity }),
      });
    }
  }
  return { inventory_id: id, entries };
};

const throughputDto = (world: World, location: EntityId): ThroughputDto | null => {
  const pool = world.stores.get<ThroughputPool>('throughputPool').get(location);
  if (pool === undefined) return null;
  return {
    capacity: pool.capacity,
    requested: pool.requested,
    throttle_permille: pool.throttlePermille,
  };
};

const locationDto = (
  reader: WorldReader,
  world: World,
  registry: Registry,
  id: EntityId,
  actor: OwnerHandle,
): LocationDto => {
  const location = reader.location(id);
  const hub = reader.locationHub(id);
  const inventories = (hub?.inventories ?? []).map((inventoryId) =>
    inventoryDto(reader, world, registry, inventoryId),
  );
  const dto: LocationDto = { entity_id: id, knowledge: reader.knowledge(actor, id), inventories };
  if (location !== undefined) {
    const template = definitionId(registry, 'location', location.template);
    const throughput = throughputDto(world, id);
    return {
      ...dto,
      ...(template === null ? {} : { definition_id: template }),
      active: location.active,
      ...(location.owner === null ? {} : { owner_id: `owner.${location.owner}` }),
      properties: {
        tags: [],
        values: Object.fromEntries(
          location.properties.map((property) => [property.property, property.value]),
        ),
      },
      ...(throughput === null ? {} : { throughput }),
      ...(location.connections === undefined || location.connections.length === 0
        ? {}
        : { connections: location.connections.map((connection) => connection.id) }),
      ...(location.grid === undefined
        ? {}
        : {
            grid: {
              width: location.grid.width,
              height: location.grid.height,
              blocked: [...location.grid.blocked],
            },
          }),
    };
  }
  return dto;
};

const productionDto = (
  reader: WorldReader,
  registry: Registry,
  entity: EntityId,
): ProductionDto | null => {
  const producer = reader.producer(entity);
  if (producer === undefined) return null;
  const recipe =
    producer.recipe === null ? null : definitionId(registry, 'recipe', producer.recipe);
  return {
    ...(recipe === null ? {} : { recipe_id: recipe }),
    state: producer.state,
    progress: producer.progress,
    progress_scale: 1000,
    block_reasons: [...producer.blockReasons],
  };
};

const locationOfEntity = (
  reader: WorldReader,
  world: World,
  entity: EntityId,
): EntityId | undefined => {
  const producer = reader.producer(entity);
  if (producer?.location != null) return producer.location;
  const residence = world.stores.get<Residence>('residence').get(entity);
  return residence?.location ?? undefined;
};

const spatialDto = (world: World, entity: EntityId): SpatialDto | null => {
  const transform = world.stores.get<LogicalTransform>('transform').get(entity);
  if (transform === undefined) return null;
  const footprint = world.stores.get<Footprint>('footprint').get(entity);
  return {
    logical_position: [transform.position.x, transform.position.y],
    orientation: transform.orientation,
    ...(footprint === undefined
      ? {}
      : { footprint: { width: footprint.width, height: footprint.height } }),
  };
};

const connectivityDto = (world: World, entity: EntityId): ConnectivityDto | null => {
  const node = world.stores.get<ConnectivityNode>('connectivityNode').get(entity);
  if (node === undefined) return null;
  return { role: node.role, network: node.network, connected: isConnected(world, entity) };
};

const entityDto = (
  reader: WorldReader,
  world: World,
  registry: Registry,
  id: EntityId,
): EntityDto => {
  const definition = reader.definition(id);
  const location = locationOfEntity(reader, world, id);
  const production = productionDto(reader, registry, id);
  const lifecycle = reader.lifecycle(id);
  const spatial = spatialDto(world, id);
  const connectivity = connectivityDto(world, id);
  const definitionString =
    definition === undefined ? null : definitionId(registry, 'entity', definition);
  return {
    entity_id: id,
    ...(definitionString === null ? {} : { definition_id: definitionString }),
    ...(location === undefined ? {} : { location_id: location }),
    revision: reader.revision(id),
    ...(lifecycle === undefined ? {} : { lifecycle }),
    ...(spatial === null ? {} : { spatial }),
    ...(connectivity === null ? {} : { connectivity }),
    ...(production === null ? {} : { production }),
  };
};

/**
 * Builds the full projection for `actor` (TDS-18.4, PIC-9.1).
 *
 * Source: TDS-18.4, PIC-9.1
 */
export function project(session: SessionState, actor: OwnerHandle): SnapshotDto {
  const world = session.world;
  const registry = session.content.registry;
  const reader = readWorld(world, registry);
  return {
    session_id: session.sessionId,
    tick: world.tick,
    revision: session.revision,
    configuration_checksum: session.content.checksum,
    owners: reader.ownerHandles.map((handle) => ownerDto(world, registry, handle)),
    locations: reader.locationIds.map((id) => locationDto(reader, world, registry, id, actor)),
    entities: reader.entityIds.map((id) => entityDto(reader, world, registry, id)),
  };
}
