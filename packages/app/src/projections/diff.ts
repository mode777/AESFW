/**
 * Projection delta computation (PIC-9.2, TDS-18.4). Emits the changed entity
 * fields and inventory entries between two projections of the same actor.
 *
 * Source: PIC-9.2, TDS-18.4
 */
import type {
  EntityDto,
  EntityUpdateDto,
  InventoryUpdateDto,
  JsonObject,
  SnapshotDeltaDto,
  SnapshotDto,
} from '@aesfw/protocol';

const ENTITY_FIELDS = [
  'definition_id',
  'location_id',
  'revision',
  'lifecycle',
  'spatial',
  'connectivity',
  'production',
] as const;

const inventoryEntries = (
  snapshot: SnapshotDto,
): Map<string, { inventory_id: number; resource_id: string; stored: number; reserved: number }> => {
  const map = new Map<
    string,
    { inventory_id: number; resource_id: string; stored: number; reserved: number }
  >();
  for (const location of snapshot.locations) {
    if (location.inventories === undefined) continue;
    for (const inventory of location.inventories) {
      for (const entry of inventory.entries) {
        map.set(`${inventory.inventory_id}:${entry.resource_id}`, {
          inventory_id: inventory.inventory_id,
          resource_id: entry.resource_id,
          stored: entry.stored,
          reserved: entry.reserved,
        });
      }
    }
  }
  return map;
};

/**
 * Computes the delta from `prev` to `next` (PIC-9.2).
 *
 * Source: PIC-9.2, TDS-18.4
 */
export function diffProjection(prev: SnapshotDto, next: SnapshotDto): SnapshotDeltaDto {
  const before = new Map<number, EntityDto>(
    prev.entities.map((entity) => [entity.entity_id, entity]),
  );
  const entityUpdates: EntityUpdateDto[] = [];
  for (const entity of next.entities) {
    const previous = before.get(entity.entity_id);
    if (previous === undefined) continue;
    const previousRecord = previous as unknown as Record<string, unknown>;
    const nextRecord = entity as unknown as Record<string, unknown>;
    for (const field of ENTITY_FIELDS) {
      if (JSON.stringify(previousRecord[field]) !== JSON.stringify(nextRecord[field])) {
        entityUpdates.push({
          entity_id: entity.entity_id,
          component: field,
          fields: { [field]: nextRecord[field] ?? null } as unknown as JsonObject,
        });
      }
    }
  }

  const previousEntries = inventoryEntries(prev);
  const inventoryUpdates: InventoryUpdateDto[] = [];
  for (const [key, entry] of inventoryEntries(next)) {
    const previous = previousEntries.get(key);
    if (previous === undefined) continue;
    if (previous.stored !== entry.stored || previous.reserved !== entry.reserved) {
      inventoryUpdates.push({
        inventory_id: entry.inventory_id,
        resource_id: entry.resource_id,
        stored: entry.stored,
        reserved: entry.reserved,
      });
    }
  }

  return {
    session_id: next.session_id,
    from_revision: prev.revision,
    to_revision: next.revision,
    tick: next.tick,
    entity_updates: entityUpdates,
    inventory_updates: inventoryUpdates,
  };
}
