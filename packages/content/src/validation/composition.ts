/**
 * Composition-compatibility validation (CONT-11.4): composed definitions are
 * re-validated against their collection schemas (merge operations may remove
 * required fields after the pre-composition pass), and cross-component rules
 * the schemas cannot express are checked.
 *
 * Source: CONT-11.4
 */
import type { Diagnostic } from '@aesfw/core';
import { Value } from '@sinclair/typebox/value';

import { diag } from '../diagnostics/diagnostics.js';
import { COLLECTION_ORDER, DEFINITION_SCHEMAS } from '../schemas/collections.js';
import type { RawDefinitions } from '../schemas/validate.js';
import { asRecord, asString, collection, resourceIndex } from './common.js';

/**
 * Validates composition compatibility over a composed definition set,
 * reporting `composition_schema_violation` and `incompatible_components`.
 *
 * Source: CONT-11.4
 */
export function validateCompositionCompatibility(
  definitions: RawDefinitions,
): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const key of COLLECTION_ORDER) {
    const schema = DEFINITION_SCHEMAS[key];
    for (const definition of collection(definitions, key)) {
      if (Value.Check(schema, definition)) continue;
      let message = 'schema violation';
      let errorPath = '';
      for (const error of Value.Errors(schema, definition)) {
        message = error.message;
        errorPath = error.path;
        break;
      }
      diagnostics.push(
        diag('composition_schema_violation', {
          definition: definition.id,
          path: `/${key}/${definition.id}${errorPath}`,
          args: { message },
        }),
      );
    }
  }

  const resources = resourceIndex(definitions);
  for (const entity of collection(definitions, 'entity_definitions')) {
    const components = asRecord(entity['components']);
    const producer = asRecord(components?.['producer']);
    if (
      producer !== null &&
      Array.isArray(producer['recipes']) &&
      producer['recipes'].length === 0
    ) {
      diagnostics.push(
        diag('incompatible_components', {
          definition: entity.id,
          path: `/entity_definitions/${entity.id}/components/producer/recipes`,
          args: { reason: 'producer_without_recipes' },
        }),
      );
    }
    const capability = asString(asRecord(components?.['service_provider'])?.['capability']);
    if (capability !== null && resources.get(capability)?.capabilityTagged !== true) {
      diagnostics.push(
        diag('incompatible_components', {
          definition: entity.id,
          path: `/entity_definitions/${entity.id}/components/service_provider/capability`,
          args: { reason: 'capability_not_tagged', resource: capability },
        }),
      );
    }
  }

  return diagnostics;
}
