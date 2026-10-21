/**
 * The inventory-access-policy abstraction (ARCH-12). Production and needs ask
 * a policy which inventories they may use for a resource and purpose.
 *
 * Source: ARCH-12
 */
import type { DefinitionHandle, EntityId } from '../../ids/index.js';
import type { World } from '../../world/types.js';

/** An inventory-access policy implementation (ARCH-12). */
export interface InventoryAccessPolicy {
  readonly id: string;
  accessibleInventories(
    world: World,
    location: EntityId,
    resource: DefinitionHandle,
  ): readonly EntityId[];
}
