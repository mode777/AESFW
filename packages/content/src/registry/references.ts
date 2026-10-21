/**
 * Reference resolution (CONT-11.3). Walks the M1 reference kinds of the
 * composed definitions and reports unresolved references, wrong-type
 * references, and capability requirements that do not name a capability.
 * Framework policy references and local inventory references are not resolved
 * (design D4).
 *
 * Source: CONT-11.3
 */
import type { DefinitionType, Diagnostic } from '@aesfw/core';

import { diag } from '../diagnostics/diagnostics.js';
import { COLLECTION_ORDER, DEFINITION_COLLECTIONS } from '../schemas/collections.js';
import type { RawDefinitions } from '../schemas/validate.js';
import type { JsonValue } from '../types.js';

const asRecord = (value: unknown): { readonly [key: string]: JsonValue } | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as { readonly [key: string]: JsonValue })
    : null;

const asArray = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

const asString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

/**
 * Resolves references across a composed definition set (CONT-11.3).
 *
 * Source: CONT-11.3
 */
export function resolveReferences(definitions: RawDefinitions): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const allIds = new Map<string, DefinitionType>();
  const resourceTags = new Map<string, readonly string[]>();

  for (const collection of COLLECTION_ORDER) {
    for (const definition of definitions[collection] ?? []) {
      allIds.set(definition.id, DEFINITION_COLLECTIONS[collection]);
      if (collection === 'resources') {
        resourceTags.set(
          definition.id,
          asArray(definition['tags']).filter((tag): tag is string => typeof tag === 'string'),
        );
      }
    }
  }

  const exists = (type: DefinitionType, id: string): boolean => allIds.get(id) === type;

  const check = (definitionId: string, id: unknown, target: DefinitionType, path: string): void => {
    const value = asString(id);
    if (value === null) return;
    if (exists(target, value)) return;
    const actual = allIds.get(value);
    if (actual !== undefined) {
      diagnostics.push(
        diag('reference_type_mismatch', {
          definition: definitionId,
          path,
          args: { reference: value, expected: target, actual },
        }),
      );
    } else {
      diagnostics.push(
        diag('unresolved_reference', {
          definition: definitionId,
          path,
          args: { reference: value, expected: target },
        }),
      );
    }
  };

  for (const collection of COLLECTION_ORDER) {
    for (const definition of definitions[collection] ?? []) {
      const id = definition.id;
      if (collection === 'resources') {
        asArray(definition['substitutes']).forEach((entry, index) =>
          check(id, entry, 'resource', `/resources/${id}/substitutes/${index}`),
        );
      } else if (collection === 'recipes') {
        for (const field of ['inputs', 'outputs'] as const) {
          asArray(definition[field]).forEach((entry, index) =>
            check(
              id,
              asRecord(entry)?.['resource'],
              'resource',
              `/recipes/${id}/${field}/${index}/resource`,
            ),
          );
        }
        asArray(definition['capability_requirements']).forEach((entry, index) => {
          const resource = asRecord(entry)?.['resource'];
          check(
            id,
            resource,
            'resource',
            `/recipes/${id}/capability_requirements/${index}/resource`,
          );
          const value = asString(resource);
          if (
            value !== null &&
            exists('resource', value) &&
            !(resourceTags.get(value) ?? []).includes('capability')
          ) {
            diagnostics.push(
              diag('invalid_reference_scope', {
                definition: id,
                path: `/recipes/${id}/capability_requirements/${index}/resource`,
                args: { reference: value },
              }),
            );
          }
        });
      } else if (collection === 'entity_definitions') {
        const components = asRecord(definition['components']);
        const producer = asRecord(components?.['producer']);
        asArray(producer?.['recipes']).forEach((entry, index) =>
          check(
            id,
            entry,
            'recipe',
            `/entity_definitions/${id}/components/producer/recipes/${index}`,
          ),
        );
        const residence = asRecord(components?.['residence']);
        check(
          id,
          residence?.['population_tier'],
          'tier',
          `/entity_definitions/${id}/components/residence/population_tier`,
        );
        check(
          id,
          residence?.['growth_policy'],
          'growthPolicy',
          `/entity_definitions/${id}/components/residence/growth_policy`,
        );
        const source = asRecord(components?.['resource_source']);
        asArray(source?.['outputs']).forEach((entry, index) =>
          check(
            id,
            asRecord(entry)?.['resource'],
            'resource',
            `/entity_definitions/${id}/components/resource_source/outputs/${index}/resource`,
          ),
        );
      } else if (collection === 'population_tiers') {
        asArray(definition['need_categories']).forEach((entry, index) =>
          check(id, entry, 'needCategory', `/population_tiers/${id}/need_categories/${index}`),
        );
        asArray(definition['outputs']).forEach((entry, index) =>
          check(
            id,
            asRecord(entry)?.['resource'],
            'resource',
            `/population_tiers/${id}/outputs/${index}/resource`,
          ),
        );
      } else if (collection === 'needs') {
        check(id, definition['category'], 'needCategory', `/needs/${id}/category`);
        asArray(definition['applies_to']).forEach((entry, index) =>
          check(id, entry, 'tier', `/needs/${id}/applies_to/${index}`),
        );
        check(
          id,
          asRecord(definition['demand'])?.['resource'],
          'resource',
          `/needs/${id}/demand/resource`,
        );
      } else if (collection === 'need_categories') {
        asArray(definition['members']).forEach((entry, index) =>
          check(
            id,
            asRecord(entry)?.['need'],
            'need',
            `/need_categories/${id}/members/${index}/need`,
          ),
        );
        const byTier = asRecord(asRecord(definition['evaluation'])?.['required_score_by_tier']);
        if (byTier !== null) {
          for (const tierId of Object.keys(byTier)) {
            check(
              id,
              tierId,
              'tier',
              `/need_categories/${id}/evaluation/required_score_by_tier/${tierId}`,
            );
          }
        }
      }
    }
  }
  return diagnostics;
}
