/**
 * The content-built establishment system (GDD-16.3, design D4). Creates the
 * hub entity of an establishment definition at the founding location using the
 * same instantiation path as initial entities.
 *
 * Source: GDD-16.3, CONT-6.20
 */
import { ids } from '@aesfw/core';
import type {
  DefinitionHandle,
  EntityId,
  EstablishmentSystem,
  OwnerHandle,
  World,
} from '@aesfw/core';
import type { CompiledContent, ContentRegistry } from '@aesfw/content';

import { instantiateDefinition } from './instantiate.js';
import type { CompiledDefinition } from '@aesfw/content';

export function buildEstablishmentSystem(content: CompiledContent): EstablishmentSystem {
  const registry = content.registry as ContentRegistry;
  return {
    createHub: (
      world: World,
      location: EntityId,
      owner: OwnerHandle,
      establishment: DefinitionHandle,
    ): EntityId | null => {
      const data = registry.definitionDataOf?.('establishment', establishment);
      const hubId =
        data !== null &&
        typeof data === 'object' &&
        typeof (data as Record<string, unknown>)['creates_hub'] === 'string'
          ? ((data as Record<string, unknown>)['creates_hub'] as string)
          : null;
      if (hubId === null) return null;
      const handle = registry.handleOf('entity', ids.stringId(hubId));
      if (handle === null) return null;
      const definition: CompiledDefinition | null = registry.definitionOf('entity', handle);
      if (definition === null) return null;
      return ids.entityId(instantiateDefinition(world, registry, definition, location, owner));
    },
  };
}
