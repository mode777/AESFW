/**
 * Entity existence helper (TDS-16.1 step 6, TDS-16.3). The v1 world has no
 * universal entity registry, so an entity exists when any component store
 * holds it.
 *
 * Source: TDS-16.1, TDS-16.3
 */
import type { EntityId } from '../ids/index.js';
import type { World } from './types.js';

/** True when any component store holds `entity`. */
export function entityExists(world: World, entity: EntityId): boolean {
  for (const kind of world.stores.kinds) {
    if (world.stores.get(kind).has(entity)) return true;
  }
  return false;
}
