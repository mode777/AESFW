/**
 * Compiled registry types (TDS-7, TDS-20.2). `ContentRegistry` implements the
 * core `Registry` abstraction and adds typed definition access for the
 * simulation and the testkit.
 *
 * Source: TDS-7, TDS-20.2
 */
import type { DefinitionType, Registry, ids } from '@aesfw/core';

import type { JsonValue } from '../types.js';
/** A compiled definition with its assigned handle (TDS-7). */
export interface CompiledDefinition {
  readonly id: string;
  readonly handle: ids.DefinitionHandle;
  readonly type: DefinitionType;
  readonly data: JsonValue;
}

/** The frozen runtime registry (TDS-7, TDS-20.2). */
export interface ContentRegistry extends Registry {
  /** The compiled definition for a handle, or `null` when unknown. */
  readonly definitionOf: (
    type: DefinitionType,
    handle: ids.DefinitionHandle,
  ) => CompiledDefinition | null;
  /** The raw definition data for a handle, or `null` when unknown (TDS-10.1). */
  readonly definitionDataOf?: (
    type: DefinitionType,
    handle: ids.DefinitionHandle,
  ) => JsonValue | null;
  /** The compiled definitions of a type, ordered by ascending ID. */
  readonly definitionsOf: (type: DefinitionType) => readonly CompiledDefinition[];
  /** The tags of a resource ID, or an empty array when unknown. */
  readonly tagsOf: (id: ids.StringId) => readonly string[];
}
