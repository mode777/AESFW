/**
 * Definition metadata read model (PIC-4). Exposes mechanically safe metadata:
 * stable ID, type, tags, and exposed numeric parameters.
 *
 * Source: PIC-4, TDS-18.4
 */
import type { DefinitionType } from '@aesfw/core';
import { ids } from '@aesfw/core';
import type { ContentRegistry, CompiledContent } from '@aesfw/content';
import type { DefinitionMetadataDto, JsonObject } from '@aesfw/protocol';

const asObject = (value: unknown): JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as JsonObject) : {};

/**
 * Returns metadata for every definition of `type`, ordered by ascending ID
 * (PIC-4).
 *
 * Source: PIC-4
 */
export function definitionMetadata(
  content: CompiledContent,
  type: DefinitionType,
  isAvailable?: (type: DefinitionType, id: string) => boolean,
): readonly DefinitionMetadataDto[] {
  const registry = content.registry as ContentRegistry;
  return registry.definitionsOf(type).map((definition) => {
    const available = isAvailable?.(type, definition.id) ?? true;
    return {
      definition_id: definition.id,
      definition_type: type,
      tags: [...registry.tagsOf(ids.stringId(definition.id))],
      parameters: asObject(definition.data),
      commands: [],
      ...(available ? {} : { locked: true }),
    };
  });
}
