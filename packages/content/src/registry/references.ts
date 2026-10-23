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
        if (
          definition['allow_negative'] === true &&
          asRecord(definition['storage'])?.['scope'] !== 'owner' &&
          asRecord(definition['storage'])?.['scope'] !== 'global'
        ) {
          diagnostics.push(
            diag('resource_allow_negative_scope', {
              definition: id,
              path: `/resources/${id}/allow_negative`,
              args: { scope: asString(asRecord(definition['storage'])?.['scope']) ?? '' },
            }),
          );
        }
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
        check(
          id,
          source?.['condition'],
          'condition',
          `/entity_definitions/${id}/components/resource_source/condition`,
        );
        const construction = asRecord(components?.['construction']);
        asArray(construction?.['costs']).forEach((entry, index) =>
          check(
            id,
            asRecord(entry)?.['resource'],
            'resource',
            `/entity_definitions/${id}/components/construction/costs/${index}/resource`,
          ),
        );
        const deconstruction = asRecord(construction?.['deconstruction']);
        asArray(deconstruction?.['returns']).forEach((entry, index) =>
          check(
            id,
            asRecord(entry)?.['resource'],
            'resource',
            `/entity_definitions/${id}/components/construction/deconstruction/returns/${index}/resource`,
          ),
        );
        const placement = asRecord(components?.['placement']);
        const placementConditions = placement?.['conditions'];
        const conditionList = Array.isArray(placementConditions)
          ? placementConditions
          : placementConditions === undefined
            ? []
            : [placementConditions];
        conditionList.forEach((entry, index) =>
          check(
            id,
            entry,
            'condition',
            `/entity_definitions/${id}/components/placement/conditions/${index}`,
          ),
        );
        const maintenance = asRecord(components?.['maintenance']);
        if (maintenance !== null) {
          if (maintenance['charge_policy'] === 'while_processing' && producer === null) {
            diagnostics.push(
              diag('maintenance_while_processing_requires_producer', {
                definition: id,
                path: `/entity_definitions/${id}/components/maintenance/charge_policy`,
                args: {},
              }),
            );
          }
          if (maintenance['shortage_policy'] === 'trigger_transition') {
            diagnostics.push(
              diag('unsupported_shortage_policy', {
                definition: id,
                path: `/entity_definitions/${id}/components/maintenance/shortage_policy`,
                args: { policy: 'trigger_transition' },
              }),
            );
          }
        }
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
        asArray(definition['outputs']).forEach((entry, index) =>
          check(
            id,
            asRecord(entry)?.['satisfaction_curve'],
            'curve',
            `/population_tiers/${id}/outputs/${index}/satisfaction_curve`,
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
      } else if (collection === 'deficit_policies') {
        check(id, definition['resource'], 'resource', `/deficit_policies/${id}/resource`);
      } else if (collection === 'connections') {
        const traversal = asRecord(definition['traversal']);
        asArray(traversal?.['costs']).forEach((entry, index) =>
          check(
            id,
            asRecord(entry)?.['resource'],
            'resource',
            `/connections/${id}/traversal/costs/${index}/resource`,
          ),
        );
      } else if (collection === 'worlds') {
        const locationIds = new Set<string>();
        asArray(definition['locations']).forEach((entry, index) => {
          const location = asRecord(entry);
          const locationId = asString(location?.['id']);
          if (locationId !== null) {
            if (locationIds.has(locationId)) {
              diagnostics.push(
                diag('duplicate_world_location', {
                  definition: id,
                  path: `/worlds/${id}/locations/${index}/id`,
                  args: { location: locationId },
                }),
              );
            }
            locationIds.add(locationId);
          }
          check(
            id,
            location?.['template'],
            'location',
            `/worlds/${id}/locations/${index}/template`,
          );
        });
        const connectionIds = new Set<string>();
        asArray(definition['connections']).forEach((entry, index) => {
          const connection = asRecord(entry);
          const connectionId = asString(connection?.['id']);
          if (connectionId !== null) {
            if (connectionIds.has(connectionId)) {
              diagnostics.push(
                diag('duplicate_world_connection', {
                  definition: id,
                  path: `/worlds/${id}/connections/${index}/id`,
                  args: { connection: connectionId },
                }),
              );
            }
            connectionIds.add(connectionId);
          }
          check(
            id,
            connection?.['definition'],
            'connection',
            `/worlds/${id}/connections/${index}/definition`,
          );
          for (const endpoint of ['origin', 'destination'] as const) {
            const value = asString(connection?.[endpoint]);
            if (value !== null && !locationIds.has(value)) {
              diagnostics.push(
                diag('unresolved_reference', {
                  definition: id,
                  path: `/worlds/${id}/connections/${index}/${endpoint}`,
                  args: { reference: value, expected: 'world_location' },
                }),
              );
            }
          }
        });
        asArray(definition['owners']).forEach((entry, ownerIndex) => {
          const owner = asRecord(entry);
          asArray(owner?.['initial_resources']).forEach((resource, index) =>
            check(
              id,
              asRecord(resource)?.['resource'],
              'resource',
              `/worlds/${id}/owners/${ownerIndex}/initial_resources/${index}/resource`,
            ),
          );
          for (const field of ['established_locations', 'known_locations'] as const) {
            asArray(owner?.[field]).forEach((location, index) => {
              const value = asString(location);
              if (value !== null && !locationIds.has(value)) {
                diagnostics.push(
                  diag('unresolved_reference', {
                    definition: id,
                    path: `/worlds/${id}/owners/${ownerIndex}/${field}/${index}`,
                    args: { reference: value, expected: 'world_location' },
                  }),
                );
              }
            });
          }
          asArray(owner?.['initial_entities']).forEach((entity, index) => {
            const record = asRecord(entity);
            check(
              id,
              record?.['definition'],
              'entity',
              `/worlds/${id}/owners/${ownerIndex}/initial_entities/${index}/definition`,
            );
            const location = asString(record?.['location']);
            if (location !== null && !locationIds.has(location)) {
              diagnostics.push(
                diag('unresolved_reference', {
                  definition: id,
                  path: `/worlds/${id}/owners/${ownerIndex}/initial_entities/${index}/location`,
                  args: { reference: location, expected: 'world_location' },
                }),
              );
            }
          });
        });
      } else if (collection === 'transport_units') {
        check(
          id,
          definition['entity_definition'],
          'entity',
          `/transport_units/${id}/entity_definition`,
        );
        const maintenance = asRecord(definition['maintenance']);
        asArray(maintenance?.['inputs']).forEach((entry, index) =>
          check(
            id,
            asRecord(entry)?.['resource'],
            'resource',
            `/transport_units/${id}/maintenance/inputs/${index}/resource`,
          ),
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
  const policyResources = new Map<string, string>();
  for (const policy of definitions['deficit_policies'] ?? []) {
    const resource = asString(policy['resource']);
    if (resource === null) continue;
    const existing = policyResources.get(resource);
    if (existing !== undefined) {
      diagnostics.push(
        diag('duplicate_deficit_policy', {
          definition: policy.id,
          path: `/deficit_policies/${policy.id}/resource`,
          args: { resource, other: existing },
        }),
      );
      continue;
    }
    policyResources.set(resource, policy.id);
  }
  return diagnostics;
}
