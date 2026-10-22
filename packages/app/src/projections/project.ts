/**
 * The full per-actor projection (TDS-18.4, PIC-9.1). Builds a `SnapshotDto`
 * from a `WorldReader`; fog filtering is delivered by row 8.4.
 *
 * Source: TDS-18.4, PIC-9.1, ARCH-8.2
 */
import { readWorld } from '@aesfw/core';
import type {
  DefinitionHandle,
  DefinitionType,
  EntityId,
  OwnerHandle,
  Registry,
  Residence,
  World,
  WorldReader,
} from '@aesfw/core';
import type {
  EntityDto,
  InventoryDto,
  InventoryEntryDto,
  LocationDto,
  OwnerDto,
  ProductionDto,
  SnapshotDto,
} from '@aesfw/protocol';
import type { SessionState } from '../session/types.js';

const resourceId = (registry: Registry, handle: DefinitionHandle): string =>
  registry.stringIdOf('resource', handle) ?? `resource.${handle}`;

const definitionId = (
  registry: Registry,
  type: DefinitionType,
  handle: DefinitionHandle,
): string | null => registry.stringIdOf(type, handle);

const ownerDto = (reader: WorldReader, registry: Registry, handle: OwnerHandle): OwnerDto => {
  const resources: Record<string, number> = {};
  for (const account of reader.accounts(handle)) {
    resources[resourceId(registry, account.resource)] = account.amount;
  }
  return { owner_id: `owner.${handle}`, resources };
};

const inventoryDto = (reader: WorldReader, registry: Registry, id: EntityId): InventoryDto => {
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
    const capacity = inventory.capacity.perResource ?? inventory.capacity.total;
    for (const entry of inventory.entries) {
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

const locationDto = (
  reader: WorldReader,
  registry: Registry,
  id: EntityId,
  actor: OwnerHandle,
): LocationDto => {
  const location = reader.location(id);
  const hub = reader.locationHub(id);
  const inventories = (hub?.inventories ?? []).map((inventoryId) =>
    inventoryDto(reader, registry, inventoryId),
  );
  const dto: LocationDto = { entity_id: id, knowledge: reader.knowledge(actor, id), inventories };
  if (location !== undefined) {
    const template = definitionId(registry, 'location', location.template);
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
  const definitionString =
    definition === undefined ? null : definitionId(registry, 'entity', definition);
  return {
    entity_id: id,
    ...(definitionString === null ? {} : { definition_id: definitionString }),
    ...(location === undefined ? {} : { location_id: location }),
    revision: reader.revision(id),
    ...(lifecycle === undefined ? {} : { lifecycle }),
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
    owners: reader.ownerHandles.map((handle) => ownerDto(reader, registry, handle)),
    locations: reader.locationIds.map((id) => locationDto(reader, registry, id, actor)),
    entities: reader.entityIds.map((id) => entityDto(reader, world, registry, id)),
  };
}
