/**
 * Definition composition (CONT-5): resolve same-collection includes, merge
 * bases and own fields, detect cycles and unresolved includes, and return
 * deeply frozen resolved definitions in canonical order. Never throws.
 *
 * Source: CONT-5, P-11
 */
import { det } from '@aesfw/core';
import type { Diagnostic } from '@aesfw/core';

import { diag } from '../diagnostics/diagnostics.js';
import { COLLECTION_ORDER } from '../schemas/collections.js';
import type { RawDefinition, RawDefinitions } from '../schemas/validate.js';
import { DEFAULT_LOAD_OPTIONS } from '../types.js';
import type { JsonValue, LoadOptions } from '../types.js';
import { cloneJson, isRecord, merge } from './merge.js';

/** The outcome of composing a set of raw definitions. */
export interface CompositionResult {
  readonly definitions: RawDefinitions;
  readonly diagnostics: readonly Diagnostic[];
}

const deepFreeze = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    for (const entry of value as readonly JsonValue[]) deepFreeze(entry);
    Object.freeze(value);
  } else if (isRecord(value)) {
    for (const key of Object.keys(value)) deepFreeze(value[key] ?? null);
    Object.freeze(value);
  }
  return value;
};

const ownFields = (definition: RawDefinition): { [key: string]: JsonValue } => {
  const own: { [key: string]: JsonValue } = {};
  for (const key of Object.keys(definition)) {
    if (key === 'includes') continue;
    own[key] = cloneJson(definition[key] ?? null);
  }
  return own;
};

/**
 * Composes the raw definitions of every collection (CONT-5). Reports
 * `unresolved_include`, `include_cycle`, and `invalid_merge_directive`; the
 * result is frozen and ordered by ascending ID per collection.
 *
 * Source: CONT-5, P-11
 */
export function composeDefinitions(
  definitions: RawDefinitions,
  options: LoadOptions = DEFAULT_LOAD_OPTIONS,
): CompositionResult {
  void options;
  const diagnostics: Diagnostic[] = [];
  const output: { [collection: string]: readonly RawDefinition[] } = {};

  for (const collection of COLLECTION_ORDER) {
    const input = definitions[collection] ?? [];
    const byId = new Map(input.map((definition) => [definition.id, definition] as const));
    const resolved = new Map<string, JsonValue>();
    const visiting = new Set<string>();
    const failed = new Set<string>();

    const resolve = (id: string): JsonValue | undefined => {
      const memoized = resolved.get(id);
      if (memoized !== undefined) return memoized;
      if (failed.has(id)) return undefined;
      if (visiting.has(id)) {
        diagnostics.push(diag('include_cycle', { definition: id }));
        failed.add(id);
        return undefined;
      }
      const definition = byId.get(id);
      if (definition === undefined) {
        diagnostics.push(diag('unresolved_include', { definition: id }));
        failed.add(id);
        return undefined;
      }

      visiting.add(id);
      let includeFailed = false;
      let base: JsonValue = {};
      const includes = definition['includes'];
      if (Array.isArray(includes)) {
        for (const entry of includes as readonly JsonValue[]) {
          if (typeof entry !== 'string') continue;
          const inherited = resolve(entry);
          if (inherited === undefined) {
            includeFailed = true;
            continue;
          }
          const merged = merge(
            base,
            inherited,
            { package: null, file: null, path: '' },
            diagnostics,
          );
          if (merged === undefined) {
            includeFailed = true;
          } else {
            base = merged;
          }
        }
      }

      const merged = merge(
        base,
        ownFields(definition),
        { package: null, file: null, path: '' },
        diagnostics,
      );
      visiting.delete(id);
      if (includeFailed || merged === undefined) {
        failed.add(id);
        return undefined;
      }
      resolved.set(id, merged);
      return merged;
    };

    const collectionResult: RawDefinition[] = [];
    for (const definition of input) {
      const value = resolve(definition.id);
      if (value !== undefined && isRecord(value) && typeof value['id'] === 'string') {
        collectionResult.push(deepFreeze(value) as RawDefinition);
      }
    }
    collectionResult.sort((left, right) => det.compareStrings(left.id, right.id));
    output[collection] = collectionResult;
  }

  return { definitions: output, diagnostics };
}
