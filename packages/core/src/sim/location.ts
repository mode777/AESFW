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

/** A named numeric property of a location, ordered by ascending name. */
export type LocationProperty = {
  readonly property: StringId;
  readonly value: Int;
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
