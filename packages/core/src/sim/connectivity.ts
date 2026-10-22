/**
 * Connectivity runtime state and queries (GDD-9.2, GDD-9.9, GDD-10.2,
 * ARCH-5.2, ARCH-11, TDS-8.4). A `connectivityNode` component is a provider or
 * a requirement; the location hub is the connectivity root of its location;
 * access is binary and location-scoped. The connectivity groups are a derived
 * cache rebuilt in phase 04 and never authoritative.
 *
 * Source: GDD-9.2, GDD-9.9, GDD-10.2, ARCH-5.2, ARCH-11, TDS-8.4
 */
import type { EntityId, StringId } from '../ids/index.js';
import type { World } from '../world/types.js';
import { locationHubOf, locationOf } from './location.js';
import { transformOf } from './spatial.js';

/** The role of a connectivity node (GDD-9.2). */
export type ConnectivityRole = 'provider' | 'requirement';

/** A connectivity provider or requirement component (GDD-9.2, GDD-9.9). */
export type ConnectivityNode = {
  readonly role: ConnectivityRole;
  /** The connectivity network the node provides or requires. */
  readonly network: StringId;
};

/** The connectivity group of one location; `members` ascend by entity ID. */
export type ConnectivityGroup = {
  readonly location: EntityId;
  readonly root: EntityId;
  readonly members: readonly EntityId[];
};

/** The derived connectivity cache (TDS-8.4), ordered by ascending location ID. */
export type ConnectivityCache = { readonly groups: readonly ConnectivityGroup[] };

/** The connectivity node of an entity, or `undefined`. */
export function connectivityNodeOf(world: World, entity: EntityId): ConnectivityNode | undefined {
  return world.stores.get<ConnectivityNode>('connectivityNode').get(entity);
}

/** True when the entity carries a connectivity requirement node (GDD-9.2). */
export function hasConnectivityRequirement(world: World, entity: EntityId): boolean {
  return connectivityNodeOf(world, entity)?.role === 'requirement';
}

type PlacedNode = { readonly entity: EntityId; readonly role: ConnectivityRole };

const collectNodes = (world: World): Map<EntityId, PlacedNode[]> => {
  const byLocation = new Map<EntityId, PlacedNode[]>();
  const nodeStore = world.stores.get<ConnectivityNode>('connectivityNode');
  const transformStore = world.stores.get<{ readonly location: EntityId | null }>('transform');
  for (const entity of transformStore.ids()) {
    const node = nodeStore.get(entity);
    if (node == null) continue;
    const location = transformOf(world, entity)?.location;
    if (location === undefined || location === null) continue;
    const list = byLocation.get(location) ?? [];
    list.push({ entity, role: node.role });
    byLocation.set(location, list);
  }
  return byLocation;
};

const ascending = (entities: readonly EntityId[]): EntityId[] =>
  [...entities].sort((left, right) => left - right);

/**
 * Rebuilds the connectivity cache from the authoritative `location`,
 * `locationHub`, `transform`, and `connectivityNode` state (TDS-8.4, GDD-9.9).
 * Locations ascend by entity ID; members ascend by entity ID.
 *
 * Source: TDS-8.4, GDD-9.9, GDD-10.2, ARCH-5.2
 */
export function buildConnectivityCache(world: World): ConnectivityCache {
  const nodesByLocation = collectNodes(world);
  const groups: ConnectivityGroup[] = [];
  for (const location of world.stores.get('location').ids()) {
    const component = locationOf(world, location);
    if (component == null || !component.active) continue;
    const nodes = nodesByLocation.get(location) ?? [];
    const providers = ascending(
      nodes.filter((node) => node.role === 'provider').map((n) => n.entity),
    );
    const requirers = ascending(
      nodes.filter((node) => node.role === 'requirement').map((n) => n.entity),
    );
    const hub = locationHubOf(world, location) != null;
    if (!hub && providers.length === 0) continue;
    const root = hub ? location : (providers[0] as EntityId);
    const memberSet = new Set<EntityId>([root, ...providers]);
    if (providers.length > 0) for (const requirer of requirers) memberSet.add(requirer);
    groups.push({ location, root, members: ascending([...memberSet]) });
  }
  return { groups };
}

/**
 * Returns the connectivity cache, rebuilding it lazily when absent or dirty
 * (TDS-8.4).
 *
 * Source: TDS-8.4
 */
export function ensureConnectivityCache(world: World): ConnectivityCache {
  if (world.caches.connectivity === undefined || world.caches.dirty) {
    world.caches.connectivity = buildConnectivityCache(world);
  }
  return world.caches.connectivity;
}

/**
 * Replaces the connectivity cache with a full rebuild and clears `dirty`
 * (TDS-8.4, INV-20).
 *
 * Source: TDS-8.4, INV-20
 */
export function rebuildConnectivityCaches(world: World): void {
  world.caches.connectivity = buildConnectivityCache(world);
  world.caches.dirty = false;
}

const groupAt = (world: World, location: EntityId): ConnectivityGroup | undefined =>
  ensureConnectivityCache(world).groups.find((group) => group.location === location);

/**
 * True when an entity is connected to its location's connectivity root
 * (GDD-10.2, GDD-9.9). False when it has no location or its location has no
 * group.
 *
 * Source: GDD-10.2, GDD-9.9
 */
export function isConnected(world: World, entity: EntityId): boolean {
  const location = transformOf(world, entity)?.location;
  if (location === undefined || location === null) return false;
  return groupAt(world, location)?.members.includes(entity) ?? false;
}

/**
 * The ascending entities connected to `entity`, excluding itself, or an empty
 * list when it has no location or no connectivity group (ARCH-11).
 *
 * Source: ARCH-11, GDD-9.9
 */
export function connectedEntities(world: World, entity: EntityId): readonly EntityId[] {
  const location = transformOf(world, entity)?.location;
  if (location === undefined || location === null) return [];
  const group = groupAt(world, location);
  if (group === undefined) return [];
  return group.members.filter((member) => member !== entity);
}
