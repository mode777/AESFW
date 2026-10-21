/**
 * Registry indexes (TDS-20.2 step 8): an ID index and a resource tag index.
 *
 * Source: TDS-20.2
 */
import { det } from '@aesfw/core';

import type { CompiledDefinition } from './types.js';

/** The compiled registry indexes. */
export interface RegistryIndexes {
  readonly byId: ReadonlyMap<string, CompiledDefinition>;
  readonly tags: ReadonlyMap<string, readonly CompiledDefinition[]>;
  readonly tagsByResource: ReadonlyMap<string, readonly string[]>;
}

const resourceTags = (definition: CompiledDefinition): readonly string[] => {
  const data = definition.data as { readonly tags?: unknown };
  return Array.isArray(data.tags)
    ? data.tags.filter((tag): tag is string => typeof tag === 'string')
    : [];
};

/**
 * Builds the ID and resource tag indexes (TDS-20.2 step 8).
 *
 * Source: TDS-20.2
 */
export function buildIndexes(definitions: readonly CompiledDefinition[]): RegistryIndexes {
  const byId = new Map<string, CompiledDefinition>();
  const tags = new Map<string, CompiledDefinition[]>();
  const tagsByResource = new Map<string, readonly string[]>();

  for (const definition of definitions) {
    byId.set(definition.id, definition);
    if (definition.type === 'resource') {
      const resourceTagList = resourceTags(definition);
      tagsByResource.set(definition.id, resourceTagList);
      for (const tag of resourceTagList) {
        const bucket = tags.get(tag) ?? [];
        bucket.push(definition);
        tags.set(tag, bucket);
      }
    }
  }

  for (const bucket of tags.values()) {
    bucket.sort((left, right) => det.compareStrings(left.id, right.id));
  }
  return { byId, tags, tagsByResource };
}
