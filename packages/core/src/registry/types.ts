/**
 * The `Registry` abstraction (TDS-7, TDS-10.1). Core defines the handle ↔
 * string-ID resolution interface; `@aesfw/content` implements it when it
 * compiles definitions (roadmap 1.4). Keeping it function-based lets core
 * encode/decode state without importing the content package (TDS-4.3 rule 2).
 *
 * Source: TDS-7, TDS-8.5, TDS-10.1
 */
import type { JsonValue } from '../det/index.js';
import type { DefinitionHandle, StringId } from '../ids/index.js';

/** Definition types that own a dense handle space (TDS-7). */
export type DefinitionType =
  | 'resource'
  | 'recipe'
  | 'location'
  | 'entity'
  | 'service'
  | 'tier'
  | 'need'
  | 'needCategory'
  | 'satisfactionAggregation'
  | 'band'
  | 'growthPolicy'
  | 'transition'
  | 'capability'
  | 'transportType'
  | 'exchange'
  | 'maintenancePolicy'
  | 'deficitPolicy'
  | 'unlock'
  | 'condition'
  | 'curve'
  | 'connection'
  | 'world'
  | 'module';

/** Resolves definition handles to string IDs and back (TDS-7, TDS-8.5). */
export interface Registry {
  /** The string ID of a definition handle within a type, or `null` if unknown. */
  readonly stringIdOf: (type: DefinitionType, handle: DefinitionHandle) => StringId | null;
  /** The handle of a definition string ID within a type, or `null` if unknown. */
  readonly handleOf: (type: DefinitionType, id: StringId) => DefinitionHandle | null;
  /**
   * The raw compiled definition data behind a handle, or `null` when unknown
   * (TDS-7, TDS-10.1). Optional: the compiled content registry implements it;
   * core functions that need definition data treat its absence as "not found".
   */
  readonly definitionDataOf?: (type: DefinitionType, handle: DefinitionHandle) => JsonValue | null;
  /**
   * The handles of a definition type in ascending handle order, or an empty
   * list when the type is unknown or unimplemented (TDS-7). Optional: the
   * compiled content registry implements it; core systems that enumerate
   * content-defined policies treat its absence as "none".
   */
  readonly handlesOf?: (type: DefinitionType) => readonly DefinitionHandle[];
}

/** A registry with no definitions; used before content compilation exists. */
export function createEmptyRegistry(): Registry {
  return {
    stringIdOf: () => null,
    handleOf: () => null,
  };
}
