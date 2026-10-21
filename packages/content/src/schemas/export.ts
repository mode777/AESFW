/**
 * JSON Schema export (TDS-20.4). The TypeBox schemas are already JSON Schema;
 * this module returns them as plain JSON data and names the build artifacts.
 * `packages/content/scripts/export-schemas.mjs` writes the files, and a test
 * compares the committed files with this function.
 *
 * Source: TDS-20.4
 */
import type { JsonValue } from '../types.js';
import { COLLECTION_ORDER, DEFINITION_SCHEMAS } from './collections.js';

/** Round-trips a TypeBox schema to plain JSON Schema data. */
const toJson = (value: unknown): JsonValue => JSON.parse(JSON.stringify(value)) as JsonValue;

/**
 * Returns each definition schema keyed by its artifact filename
 * (`<collection>.json`) (TDS-20.4).
 *
 * Source: TDS-20.4
 */
export function exportJsonSchemas(): Readonly<Record<string, JsonValue>> {
  const schemas: { [name: string]: JsonValue } = {};
  for (const collection of COLLECTION_ORDER) {
    schemas[`${collection}.json`] = toJson(DEFINITION_SCHEMAS[collection]);
  }
  return schemas;
}
