/**
 * Registry construction (TDS-20.2 step 12): assign handles, resolve
 * references, build indexes, and return a deeply frozen registry implementing
 * the core `Registry` interface.
 *
 * Source: TDS-7, TDS-20.2
 */
import { det, ids } from '@aesfw/core';
import type { DefinitionType, Diagnostic } from '@aesfw/core';

import type { RawDefinitions } from '../schemas/validate.js';
import { DEFAULT_LOAD_OPTIONS } from '../types.js';
import type { LoadOptions } from '../types.js';
import { assignHandles } from './handles.js';
import { buildIndexes } from './indexes.js';
import { resolveReferences } from './references.js';
import type { CompiledDefinition, ContentRegistry } from './types.js';

/** The outcome of compiling a registry. */
export interface BuildResult {
  readonly registry: ContentRegistry;
  readonly definitions: readonly CompiledDefinition[];
  readonly diagnostics: readonly Diagnostic[];
}

const deepFreeze = (value: unknown): void => {
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const entry of value) deepFreeze(entry);
  } else {
    const record = value as { readonly [key: string]: unknown };
    for (const key of Object.keys(record)) deepFreeze(record[key]);
  }
  Object.freeze(value);
};

/**
 * Compiles a registry from composed raw definitions (TDS-20.2 step 12).
 *
 * Source: TDS-7, TDS-20.2
 */
export function buildRegistry(
  definitions: RawDefinitions,
  options: LoadOptions = DEFAULT_LOAD_OPTIONS,
): BuildResult {
  void options;
  const assignment = assignHandles(definitions);
  const diagnostics = resolveReferences(definitions);
  const indexes = buildIndexes(assignment.definitions);

  const definitionsByType = new Map<DefinitionType, CompiledDefinition[]>();
  for (const definition of assignment.definitions) {
    const bucket = definitionsByType.get(definition.type) ?? [];
    bucket.push(definition);
    definitionsByType.set(definition.type, bucket);
  }
  for (const bucket of definitionsByType.values()) {
    bucket.sort((left, right) => det.compareStrings(left.id, right.id));
    for (const definition of bucket) deepFreeze(definition);
  }

  const spaces = assignment.spaces;
  const registry: ContentRegistry = {
    stringIdOf: (type, handle) => {
      const id = spaces.get(type)?.byHandle[handle];
      return id === undefined ? null : ids.stringId(id);
    },
    handleOf: (type, id) => spaces.get(type)?.byId.get(id) ?? null,
    definitionOf: (type, handle) => {
      const id = spaces.get(type)?.byHandle[handle];
      return id === undefined ? null : (indexes.byId.get(id) ?? null);
    },
    definitionDataOf: (type, handle) => {
      const id = spaces.get(type)?.byHandle[handle];
      if (id === undefined) return null;
      return indexes.byId.get(id)?.data ?? null;
    },
    definitionsOf: (type) => definitionsByType.get(type) ?? [],
    tagsOf: (id) => indexes.tagsByResource.get(id) ?? [],
  };

  return {
    registry: Object.freeze(registry),
    definitions: assignment.definitions,
    diagnostics,
  };
}
