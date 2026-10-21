/**
 * Normalization and checksum (TDS-20.2 steps 10–11). The canonical
 * representation groups compiled definitions by type in ascending type name
 * and by ascending ID; the checksum is `fnv1a64` of its canonical JSON
 * (TDS-19.3), so it depends only on the definition set (P-12).
 *
 * Source: TDS-19.3, TDS-20.2
 */
import { det } from '@aesfw/core';

import type { JsonValue } from '../types.js';
import type { CompiledDefinition } from './types.js';

/**
 * Produces the canonical representation of a compiled definition set
 * (TDS-20.2 step 10).
 *
 * Source: TDS-20.2
 */
export function normalize(definitions: readonly CompiledDefinition[]): JsonValue {
  const byType = new Map<string, { readonly id: string; readonly data: JsonValue }[]>();
  for (const definition of definitions) {
    const bucket = byType.get(definition.type) ?? [];
    bucket.push({ id: definition.id, data: definition.data });
    byType.set(definition.type, bucket);
  }
  const result: { [type: string]: JsonValue } = {};
  for (const type of [...byType.keys()].sort(det.compareStrings)) {
    const entries = [...(byType.get(type) ?? [])].sort((left, right) =>
      det.compareStrings(left.id, right.id),
    );
    result[type] = entries;
  }
  return result;
}

/**
 * Computes the configuration checksum (TDS-20.2 step 11).
 *
 * Source: TDS-19.3, TDS-20.2
 */
export function checksum(definitions: readonly CompiledDefinition[]): string {
  return det.fnv1a64(det.canonicalStringify(normalize(definitions)));
}
