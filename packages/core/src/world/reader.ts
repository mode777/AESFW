/**
 * The read-only `WorldReader` facade (TDS-10.2). The application layer builds
 * projections and read models through it and never receives mutable
 * references. Accessors return the authoritative component values as readonly
 * views; callers must not mutate them.
 *
 * Source: TDS-10.2, TDS-18.4
 */
import type { Inventory } from '../tx/index.js';
import type { Reservation } from './types.js';
import type { Location, LocationHub } from '../sim/location.js';
import type { Producer } from '../sim/production/index.js';
import type { DefinitionHandle, EntityId, OwnerHandle, Tick } from '../ids/index.js';
import type { AccountEntry, KnowledgeLevel, OwnerState } from './types.js';
import type { World } from './types.js';

/** A read-only facade over authoritative world state (TDS-10.2). */
export interface WorldReader {
  readonly tick: Tick;
  readonly ownerHandles: readonly OwnerHandle[];
  readonly locationIds: readonly EntityId[];
  readonly entityIds: readonly EntityId[];
  owner(handle: OwnerHandle): OwnerState | undefined;
  accounts(handle: OwnerHandle): readonly AccountEntry[];
  knowledge(owner: OwnerHandle, location: EntityId): KnowledgeLevel;
  location(id: EntityId): Location | undefined;
  locationHub(id: EntityId): LocationHub | undefined;
  inventory(id: EntityId): Inventory | undefined;
  definition(id: EntityId): DefinitionHandle | undefined;
  revision(id: EntityId): number;
  lifecycle(id: EntityId): string | undefined;
  enabled(id: EntityId): boolean | undefined;
  producer(id: EntityId): Producer | undefined;
  reservations(): readonly Reservation[];
}

const isLocation = (world: World, entity: EntityId): boolean =>
  world.stores.get('location').has(entity);

const isInventory = (world: World, entity: EntityId): boolean =>
  world.stores.get('inventory').has(entity);

const entityIdsOf = (world: World): readonly EntityId[] => {
  const seen = new Set<number>();
  for (const kind of world.stores.kinds) {
    for (const id of world.stores.get(kind).ids()) seen.add(id);
  }
  return [...seen]
    .filter((id) => !isLocation(world, id as EntityId) && !isInventory(world, id as EntityId))
    .sort((a, b) => a - b) as unknown as readonly EntityId[];
};

/**
 * Builds a read-only reader over `world` (TDS-10.2).
 *
 * Source: TDS-10.2, TDS-18.4
 */
export function readWorld(
  world: World,
  registry: import('../registry/types.js').Registry,
): WorldReader {
  void registry;
  return {
    tick: world.tick,
    ownerHandles: world.owners.owners.map((owner) => owner.handle),
    locationIds: world.stores.get('location').ids(),
    entityIds: entityIdsOf(world),
    owner(handle) {
      return world.owners.owners[handle];
    },
    accounts(handle) {
      return world.owners.owners[handle]?.accounts ?? [];
    },
    knowledge(owner, location) {
      const entry = world.owners.owners[owner]?.knowledge.find(
        (item) => item.location === location,
      );
      return entry?.level ?? 'unknown';
    },
    location(id) {
      return isLocation(world, id) ? world.stores.get<Location>('location').get(id) : undefined;
    },
    locationHub(id) {
      return world.stores.get<LocationHub>('locationHub').get(id);
    },
    inventory(id) {
      return isInventory(world, id) ? world.stores.get<Inventory>('inventory').get(id) : undefined;
    },
    definition(id) {
      const value = world.stores.get<{ definition?: DefinitionHandle }>('definition').get(id);
      return value?.definition;
    },
    revision(id) {
      const value = world.stores.get<{ revision?: number }>('revision').get(id);
      return value?.revision ?? 0;
    },
    lifecycle(id) {
      const value = world.stores.get<{ lifecycle?: string }>('lifecycle').get(id);
      return value?.lifecycle;
    },
    enabled(id) {
      const value = world.stores.get<{ enabled?: boolean }>('enabled').get(id);
      return value?.enabled;
    },
    producer(id) {
      return world.stores.get<Producer>('producer').get(id);
    },
    reservations() {
      return world.ledger.reservations;
    },
  };
}
