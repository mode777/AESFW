/**
 * The location runtime state (GDD-6.1, CONT-6.4). A location is an entity with
 * a `location` component; its inventories are linked by a `locationHub`
 * component on the same entity.
 *
 * Source: GDD-6.1, CONT-6.4
 */
import type { Int } from '../fx/index.js';
import type { DefinitionHandle, EntityId, OwnerHandle, StringId } from '../ids/index.js';
import type { World } from '../world/types.js';
import type { LocationGrid } from './spatial.js';

/** A named numeric property of a location, ordered by ascending name. */
export type LocationProperty = {
  readonly property: StringId;
  readonly value: Int;
};

/** A finite count of source slots of one type (CONT-6.4). */
export type SourceSlot = {
  readonly type: StringId;
  readonly count: Int;
};

/** One runtime connection instance attached to a location (GDD-6.3, CONT-6.6). */
export type LocationConnection = {
  readonly id: StringId;
  readonly definition: DefinitionHandle;
  readonly origin: EntityId;
  readonly destination: EntityId;
  readonly direction: 'one_way' | 'bidirectional';
  readonly baseDurationTicks: Int;
  readonly enabled: boolean;
  readonly allowedTransportTags: readonly StringId[];
};

/** A location component (GDD-6.1). */
export type Location = {
  readonly template: DefinitionHandle;
  readonly spatialPolicy: string;
  readonly capacity: Int;
  readonly used: Int;
  readonly properties: readonly LocationProperty[];
  readonly region: DefinitionHandle | null;
  readonly active: boolean;
  readonly owner: OwnerHandle | null;
  /** Grid geometry, present only for a grid-policy location (GDD-6.1). */
  readonly grid?: LocationGrid;
  /** Finite source slots per type, ascending by type (GDD-9.5, CONT-6.4). */
  readonly sourceSlots?: readonly SourceSlot[];
  /** Outgoing connection instances, ascending by connection id (GDD-6.3). */
  readonly connections?: readonly LocationConnection[];
};

/** The inventories of a location, in ascending entity-ID order. */
export type LocationHub = {
  readonly inventories: readonly EntityId[];
};

/** Returns the location component of an entity, or `undefined`. */
export function locationOf(world: World, entity: EntityId): Location | undefined {
  return world.stores.get<Location>('location').get(entity);
}

/** Returns the location hub of an entity, or `undefined`. */
export function locationHubOf(world: World, entity: EntityId): LocationHub | undefined {
  return world.stores.get<LocationHub>('locationHub').get(entity);
}
