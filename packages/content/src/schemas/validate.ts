/**
 * Raw-document schema validation (TDS-20.2 step 4). Maps each parsed file's
 * top-level keys to a definition collection, validates every item against its
 * schema, and validates every definition ID. Returns grouped raw definitions
 * and diagnostics; never throws.
 *
 * Source: CONT-11.2, TDS-20.2
 */
import type { Diagnostic } from '@aesfw/core';
import { Value } from '@sinclair/typebox/value';

import { diag } from '../diagnostics/diagnostics.js';
import type { ParsedFile } from '../package/parse.js';
import { DEFAULT_LOAD_OPTIONS } from '../types.js';
import type { JsonValue, LoadOptions } from '../types.js';
import { COLLECTION_ORDER, DEFINITION_SCHEMAS, isDefinitionCollection } from './collections.js';
import type { DefinitionCollection } from './collections.js';
import { isValidDefinitionId } from './ids.js';

/** A validated raw definition, keyed by its string ID. */
export interface RawDefinition {
  readonly id: string;
  readonly [key: string]: JsonValue;
}

/** Validated raw definitions grouped by collection, in canonical order. */
export interface RawDefinitions {
  readonly [collection: string]: readonly RawDefinition[];
}

/** The outcome of validating parsed files against the definition schemas. */
export interface SchemaValidationResult {
  readonly definitions: RawDefinitions;
  readonly diagnostics: readonly Diagnostic[];
}

const isRecord = (value: JsonValue): value is { readonly [key: string]: JsonValue } =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Validates the parsed files of `parseFiles` (TDS-20.2 step 4), returning raw
 * definitions grouped by collection plus diagnostics. Emits
 * `invalid_definition_document`, `unknown_definition_type`, `schema_invalid`,
 * and `invalid_id`.
 *
 * Source: CONT-11.2, TDS-20.2
 */
export function validateSchemas(
  files: readonly ParsedFile[],
  options: LoadOptions = DEFAULT_LOAD_OPTIONS,
): SchemaValidationResult {
  const diagnostics: Diagnostic[] = [];
  const buckets = new Map<DefinitionCollection, RawDefinition[]>();
  for (const collection of COLLECTION_ORDER) buckets.set(collection, []);

  for (const file of files) {
    const document = file.document;
    if (!isRecord(document)) {
      diagnostics.push(
        diag('invalid_definition_document', { package: file.package, file: file.path }),
      );
      continue;
    }
    for (const key of Object.keys(document)) {
      if (!isDefinitionCollection(key)) {
        if (options.strictness === 'strict') {
          diagnostics.push(
            diag('unknown_definition_type', {
              package: file.package,
              file: file.path,
              path: `/${key}`,
            }),
          );
        }
        continue;
      }
      const schema = DEFINITION_SCHEMAS[key];
      const rawItems = document[key];
      if (!Array.isArray(rawItems)) {
        diagnostics.push(
          diag('invalid_definition_document', {
            package: file.package,
            file: file.path,
            path: `/${key}`,
          }),
        );
        continue;
      }
      const items = rawItems as readonly JsonValue[];
      items.forEach((item, index) => {
        const valid: boolean = Value.Check(schema, item);
        if (!valid) {
          for (const error of Value.Errors(schema, item)) {
            diagnostics.push(
              diag('schema_invalid', {
                package: file.package,
                file: file.path,
                path: `/${key}/${index}${error.path}`,
                args: { message: error.message },
              }),
            );
          }
          return;
        }
        const record = item as { readonly [key: string]: JsonValue };
        const id = record['id'];
        if (typeof id !== 'string' || !isValidDefinitionId(id)) {
          diagnostics.push(
            diag('invalid_id', {
              package: file.package,
              file: file.path,
              path: `/${key}/${index}/id`,
              definition: typeof id === 'string' ? id : null,
            }),
          );
          return;
        }
        buckets.get(key)?.push({ ...record, id });
      });
    }
  }

  const definitions: { [collection: string]: readonly RawDefinition[] } = {};
  for (const collection of COLLECTION_ORDER) {
    definitions[collection] = buckets.get(collection) ?? [];
  }
  return { definitions, diagnostics };
}
