/**
 * Definition metadata DTO (PIC-4, TDS-22). Clients receive mechanically safe
 * metadata only; mechanics definitions remain authoritative.
 *
 * Source: PIC-4, TDS-22
 */
import type { JsonObject, WireId } from './scalars.js';

/** Display-safe metadata for one definition (PIC-4). */
export interface DefinitionMetadataDto {
  readonly definition_id: WireId;
  readonly definition_type: string;
  readonly tags: readonly string[];
  readonly presentation_key?: string;
  readonly parameters: JsonObject;
  readonly commands?: readonly string[];
}
