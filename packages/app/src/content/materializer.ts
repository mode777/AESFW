/**
 * The content-driven entity materializer (amendment A15). Core's phase 01 and
 * phase 03 call it when a player-created entity becomes operational, so a
 * constructed entity gets the same components an authored one has.
 *
 * Source: GDD-18.1, CONT-6.8, amendment A15
 */
import type {
  DefinitionHandle,
  EntityId,
  EntityMaterializer,
  OwnerHandle,
  World,
} from '@aesfw/core';
import type { CompiledContent, CompiledDefinition, ContentRegistry } from '@aesfw/content';

import { materializeEntityComponents } from './instantiate.js';

/** Builds the materializer for one compiled content set. */
export function buildEntityMaterializer(content: CompiledContent): EntityMaterializer {
  const registry = content.registry as ContentRegistry;
  return {
    materialize: (
      world: World,
      entity: EntityId,
      definition: DefinitionHandle,
      location: EntityId,
      owner: OwnerHandle | null,
    ): void => {
      // Ownership is already written by the placement; the seam carries it so a
      // future materializer can use it without a signature change.
      void owner;
      const compiled: CompiledDefinition | null = registry.definitionOf('entity', definition);
      if (compiled === null) return;
      materializeEntityComponents(world, registry, compiled, entity, location);
    },
  };
}
