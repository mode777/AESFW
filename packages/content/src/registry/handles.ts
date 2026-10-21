/**
 * Handle assignment (TDS-7): one dense handle space per core definition type,
 * assigned in ascending code-unit order of the string ID so handles do not
 * depend on file or package order.
 *
 * Source: TDS-7
 */
import { det, ids } from '@aesfw/core';
import type { DefinitionType } from '@aesfw/core';

import { COLLECTION_ORDER, DEFINITION_COLLECTIONS } from '../schemas/collections.js';
import type { RawDefinitions } from '../schemas/validate.js';
import { cloneJson } from '../composition/merge.js';
import type { JsonValue } from '../types.js';
import type { CompiledDefinition } from './types.js';

/** The string IDs of one definition type, indexed by handle. */
export interface HandleSpace {
  readonly byId: ReadonlyMap<string, ids.DefinitionHandle>;
  readonly byHandle: readonly string[];
}

/** The result of assigning handles to a definition set. */
export interface HandleAssignment {
  readonly spaces: ReadonlyMap<DefinitionType, HandleSpace>;
  readonly definitions: readonly CompiledDefinition[];
}

/**
 * Assigns dense handles per definition type (TDS-7).
 *
 * Source: TDS-7
 */
export function assignHandles(definitions: RawDefinitions): HandleAssignment {
  const byType = new Map<DefinitionType, { id: string; data: JsonValue }[]>();
  for (const collection of COLLECTION_ORDER) {
    const type = DEFINITION_COLLECTIONS[collection];
    const bucket = byType.get(type) ?? [];
    for (const definition of definitions[collection] ?? []) {
      bucket.push({ id: definition.id, data: cloneJson(definition) });
    }
    byType.set(type, bucket);
  }

  const spaces = new Map<DefinitionType, HandleSpace>();
  const compiled: CompiledDefinition[] = [];
  for (const [type, entries] of byType) {
    const sorted = [...entries].sort((left, right) => det.compareStrings(left.id, right.id));
    const byId = new Map<string, ids.DefinitionHandle>();
    const byHandle: string[] = [];
    sorted.forEach((entry, index) => {
      const handle = ids.definitionHandle(index);
      byId.set(entry.id, handle);
      byHandle.push(entry.id);
      compiled.push({ id: entry.id, handle, type, data: entry.data });
    });
    spaces.set(type, { byId, byHandle });
  }
  return { spaces, definitions: compiled };
}
