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

import { det } from '@aesfw/core';

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

  /**
   * Collection-local semantic checks of an exchange definition (CONT-6.21,
   * GDD-17.3). The TypeBox schema already enforces presence and integer
   * domains; this checks the cross-field rules that make elasticity a bound
   * on the money exploit.
   */
  const validateExchangeSemantics = (
    id: string,
    definition: { readonly [key: string]: JsonValue },
  ): readonly Diagnostic[] => {
    const findings: Diagnostic[] = [];
    const push = (reason: string, path: string): void => {
      findings.push(diag('invalid_exchange', { definition: id, path, args: { reason } }));
    };
    const elasticity = asRecord(definition['elasticity']);
    if (elasticity === null) {
      push('missing_elasticity', `/exchanges/${id}/elasticity`);
      return findings;
    }
    const min = elasticity['min_price_permille'];
    const max = elasticity['max_price_permille'];
    if (typeof min === 'number' && typeof max === 'number' && min > max) {
      push('min_above_max', `/exchanges/${id}/elasticity`);
    }
    const goods = asArray(definition['goods']);
    goods.forEach((entry, index) => {
      const good = asRecord(entry);
      if (good === null) return;
      const buy = asRecord(good['buy_from_exchange'])?.['base_price'];
      const sell = asRecord(good['sell_to_exchange'])?.['base_price'];
      if (typeof buy === 'number' && typeof sell === 'number' && sell >= buy) {
        push('sell_not_below_buy', `/exchanges/${id}/goods/${index}`);
      }
    });
    return findings;
  };

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
      } else if (collection === 'location_templates') {
        check(
          id,
          definition['establishment'],
          'establishment',
          `/location_templates/${id}/establishment`,
        );
      } else if (collection === 'location_establishments') {
        check(
          id,
          definition['creates_hub'],
          'entity',
          `/location_establishments/${id}/creates_hub`,
        );
        asArray(definition['costs']).forEach((entry, index) =>
          check(
            id,
            asRecord(entry)?.['resource'],
            'resource',
            `/location_establishments/${id}/costs/${index}/resource`,
          ),
        );
      } else if (collection === 'exchanges') {
        check(id, definition['location'], 'location', `/exchanges/${id}/location`);
        check(id, definition['currency'], 'resource', `/exchanges/${id}/currency`);
        asArray(definition['goods']).forEach((entry, index) =>
          check(
            id,
            asRecord(entry)?.['resource'],
            'resource',
            `/exchanges/${id}/goods/${index}/resource`,
          ),
        );
        diagnostics.push(...validateExchangeSemantics(id, definition));
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
        const emptyResidence = asRecord(residence?.['empty_residence']);
        if (emptyResidence?.['policy'] === 'revert') {
          check(
            id,
            emptyResidence['definition'],
            'entity',
            `/entity_definitions/${id}/components/residence/empty_residence/definition`,
          );
        }
        const provider = asRecord(components?.['service_provider']);
        check(
          id,
          provider?.['service'],
          'service',
          `/entity_definitions/${id}/components/service_provider/service`,
        );
        check(
          id,
          provider?.['capability'],
          'resource',
          `/entity_definitions/${id}/components/service_provider/capability`,
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
        asArray(definition['outputs']).forEach((entry, index) =>
          check(
            id,
            asRecord(entry)?.['satisfaction_curve'],
            'curve',
            `/population_tiers/${id}/outputs/${index}/satisfaction_curve`,
          ),
        );
        check(
          id,
          asRecord(definition['satisfaction'])?.['bands'],
          'band',
          `/population_tiers/${id}/satisfaction/bands`,
        );
        asArray(definition['decline_transitions']).forEach((entry, index) =>
          check(id, entry, 'transition', `/population_tiers/${id}/decline_transitions/${index}`),
        );
      } else if (collection === 'transitions') {
        check(id, definition['source_tier'], 'tier', `/transitions/${id}/source_tier`);
        check(id, definition['target_tier'], 'tier', `/transitions/${id}/target_tier`);
        check(id, definition['condition'], 'condition', `/transitions/${id}/condition`);
        asArray(definition['costs']).forEach((entry, index) =>
          check(
            id,
            asRecord(entry)?.['resource'],
            'resource',
            `/transitions/${id}/costs/${index}/resource`,
          ),
        );
        const refund = asRecord(definition['refund_policy']);
        asArray(refund?.['resources']).forEach((entry, index) =>
          check(
            id,
            asRecord(entry)?.['resource'],
            'resource',
            `/transitions/${id}/refund_policy/resources/${index}/resource`,
          ),
        );
        check(
          id,
          asRecord(definition['conversion'])?.['entity_definition'],
          'entity',
          `/transitions/${id}/conversion/entity_definition`,
        );
      } else if (collection === 'unlocks') {
        check(id, definition['condition'], 'condition', `/unlocks/${id}/condition`);
        const TARGET_TYPES: Readonly<Record<string, string>> = {
          entity_definition: 'entity',
          recipe: 'recipe',
          population_tier: 'tier',
          transport_type: 'transportType',
          location_template: 'location',
          connection: 'connection',
          transition: 'transition',
          exchange: 'exchange',
        };
        asArray(definition['targets']).forEach((entry, index) => {
          const target = asRecord(entry);
          const type = target?.['type'];
          const definitionType = typeof type === 'string' ? TARGET_TYPES[type] : undefined;
          if (definitionType === undefined) {
            diagnostics.push(
              diag('invalid_unlock_target', {
                definition: id,
                path: `/unlocks/${id}/targets/${index}/type`,
                args: { type: typeof type === 'string' ? type : 'unknown' },
              }),
            );
            return;
          }
          // Transitions have no collection yet; their owning row (7.3) validates
          // those references. Exchanges resolve through the `exchanges` branch.
          if (type === 'transition') return;
          check(id, target?.['id'], definitionType as never, `/unlocks/${id}/targets/${index}/id`);
        });
      } else if (collection === 'satisfaction_bands') {
        const bands = asArray(definition['bands']);
        let previousMin = -1;
        bands.forEach((entry, index) => {
          const band = asRecord(entry);
          const min = band?.['min'];
          if (typeof min !== 'number' || !Number.isSafeInteger(min)) return;
          if (index === 0 && min !== 0) {
            diagnostics.push(
              diag('invalid_satisfaction_bands', {
                definition: id,
                path: `/satisfaction_bands/${id}/bands/0/min`,
                args: { reason: 'must_start_at_zero' },
              }),
            );
          }
          if (min <= previousMin) {
            diagnostics.push(
              diag('invalid_satisfaction_bands', {
                definition: id,
                path: `/satisfaction_bands/${id}/bands/${index}/min`,
                args: { reason: 'overlap_or_unsorted' },
              }),
            );
          }
          previousMin = min;
          asArray(band?.['effects']).forEach((effect, effectIndex) => {
            const record = asRecord(effect);
            if (record?.['type'] === 'growth') {
              check(
                id,
                record['policy'],
                'growthPolicy',
                `/satisfaction_bands/${id}/bands/${index}/effects/${effectIndex}/policy`,
              );
            } else if (record?.['type'] === 'output_multiplier') {
              check(
                id,
                record['resource'],
                'resource',
                `/satisfaction_bands/${id}/bands/${index}/effects/${effectIndex}/resource`,
              );
            }
            // A `trigger_decline` transition reference and its source-tier
            // match are validated by 7.3, which owns transition definitions.
          });
        });
      } else if (collection === 'needs') {
        check(id, definition['category'], 'needCategory', `/needs/${id}/category`);
        asArray(definition['applies_to']).forEach((entry, index) =>
          check(id, entry, 'tier', `/needs/${id}/applies_to/${index}`),
        );
        const demand = asRecord(definition['demand']);
        check(id, demand?.['resource'], 'resource', `/needs/${id}/demand/resource`);
        check(id, demand?.['service'], 'service', `/needs/${id}/demand/service`);
        check(id, demand?.['condition'], 'condition', `/needs/${id}/demand/condition`);
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
  diagnostics.push(...validateDistributionRules(definitions, exists));
  return diagnostics;
}

/** Matches a name against a glob whose `*` wildcards span any characters. */
export const matchesGlob = (name: string, pattern: string): boolean => {
  const segments = pattern.split('*');
  const first = segments[0];
  const last = segments[segments.length - 1];
  if (first === undefined || last === undefined) return false;
  if (!name.startsWith(first)) return false;
  if (!name.endsWith(last)) return false;
  let cursor = first.length;
  for (let index = 1; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    if (segment === undefined || segment === '') continue;
    const found = name.indexOf(segment, cursor);
    if (found < 0) return false;
    cursor = found + segment.length;
  }
  return cursor + last.length <= name.length;
};

/** The authored attributes of one location shape: property values and slot types. */
type AuthoredAttributes = {
  readonly propertyCounts: ReadonlyMap<string, number>;
  readonly slotTypes: ReadonlySet<string>;
};

const attributesOf = (definition: { readonly [key: string]: JsonValue }): AuthoredAttributes => {
  const propertyCounts = new Map<string, number>();
  const properties = asRecord(definition['properties']);
  if (properties !== null) {
    for (const name of Object.keys(properties)) {
      const value = properties[name];
      propertyCounts.set(name, typeof value === 'number' ? value : 0);
    }
  }
  const slotTypes = new Set<string>();
  for (const raw of asArray(definition['source_slots'])) {
    const slot = asRecord(raw);
    const type = asString(slot?.['type']);
    const count = slot?.['count'];
    if (type !== null && typeof count === 'number' && count > 0) slotTypes.add(type);
  }
  return { propertyCounts, slotTypes };
};

/** The world location's effective attributes: template values with world overrides. */
const effectiveWorldLocation = (
  worldLocation: { readonly [key: string]: JsonValue },
  template: { readonly [key: string]: JsonValue } | null,
): AuthoredAttributes => {
  const propertyCounts = new Map<string, number>();
  const base = template === null ? null : asRecord(template['properties']);
  if (base !== null) {
    for (const name of Object.keys(base)) {
      const value = base[name];
      propertyCounts.set(name, typeof value === 'number' ? value : 0);
    }
  }
  const overrides = asRecord(worldLocation['properties']);
  if (overrides !== null) {
    for (const name of Object.keys(overrides)) {
      const value = overrides[name];
      propertyCounts.set(name, typeof value === 'number' ? value : 0);
    }
  }
  const slots = asArray(worldLocation['source_slots']);
  if (worldLocation['source_slots'] !== undefined) {
    const slotTypes = new Set<string>();
    for (const raw of slots) {
      const slot = asRecord(raw);
      const type = asString(slot?.['type']);
      const count = slot?.['count'];
      if (type !== null && typeof count === 'number' && count > 0) slotTypes.add(type);
    }
    return { propertyCounts, slotTypes };
  }
  const templateSlots = template === null ? new Set<string>() : attributesOf(template).slotTypes;
  return { propertyCounts, slotTypes: templateSlots };
};

/** The world location's effective region ID: the world override, else the template's. */
const effectiveWorldRegion = (
  worldLocation: { readonly [key: string]: JsonValue },
  template: { readonly [key: string]: JsonValue } | null,
): string | null => {
  const override = asString(worldLocation['region']);
  if (override !== null) return override;
  return template === null ? null : asString(template['region']);
};

/**
 * Validates distribution rules (CONT-6.18): structure, region references, and
 * disjointness of the authored property and slot supply between the rule's
 * regions. Applies in both modes; seeded generation fills gaps only.
 *
 * Source: GDD-3.3, GDD-6.4, CONT-6.18
 */
const validateDistributionRules = (
  definitions: RawDefinitions,
  exists: (type: DefinitionType, id: string) => boolean,
): readonly Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const templates = new Map<string, { readonly [key: string]: JsonValue }>();
  for (const template of definitions['location_templates'] ?? []) {
    templates.set(template.id, template);
  }

  for (const rule of definitions['distribution_rules'] ?? []) {
    const regionIds = asArray(rule['regions']).filter(
      (entry): entry is string => asString(entry) !== null,
    ) as readonly string[];
    const unique = new Set(regionIds);
    const disjoint = asRecord(rule['disjoint']);
    const propertyGlobs = asArray(disjoint?.['properties']).filter(
      (entry): entry is string => asString(entry) !== null,
    ) as readonly string[];
    const slotTypes = disjoint?.['source_slot_types'] === true;
    if (
      unique.size !== regionIds.length ||
      regionIds.length < 2 ||
      (propertyGlobs.length === 0 && !slotTypes)
    ) {
      diagnostics.push(
        diag('invalid_distribution_rule', {
          definition: rule.id,
          path: `/distribution_rules/${rule.id}`,
        }),
      );
      continue;
    }
    for (const [index, regionId] of regionIds.entries()) {
      if (!exists('region', regionId)) {
        diagnostics.push(
          diag('unresolved_reference', {
            definition: rule.id,
            path: `/distribution_rules/${rule.id}/regions/${index}`,
            args: { reference: regionId, expected: 'region' },
          }),
        );
      }
    }

    const suppliedProperties = new Map<string, Set<string>>();
    const suppliedSlots = new Map<string, Set<string>>();
    const absorb = (regionId: string | null, attributes: AuthoredAttributes): void => {
      if (regionId === null || !unique.has(regionId)) return;
      const props = suppliedProperties.get(regionId) ?? new Set<string>();
      for (const [name, count] of attributes.propertyCounts) {
        if (count > 0) props.add(name);
      }
      suppliedProperties.set(regionId, props);
      const slots = suppliedSlots.get(regionId) ?? new Set<string>();
      for (const type of attributes.slotTypes) slots.add(type);
      suppliedSlots.set(regionId, slots);
    };
    for (const template of definitions['location_templates'] ?? []) {
      absorb(asString(template['region']), attributesOf(template));
    }
    for (const world of definitions['worlds'] ?? []) {
      for (const raw of asArray(world['locations'])) {
        const entry = asRecord(raw);
        if (entry === null) continue;
        const templateId = asString(entry['template']);
        const template = templateId === null ? null : (templates.get(templateId) ?? null);
        absorb(effectiveWorldRegion(entry, template), effectiveWorldLocation(entry, template));
      }
    }

    const universe = new Set<string>();
    for (const props of suppliedProperties.values()) {
      for (const name of props) {
        if (propertyGlobs.some((pattern) => matchesGlob(name, pattern))) universe.add(name);
      }
    }
    for (const name of universe) {
      const regions = [...suppliedProperties.entries()]
        .filter(([, props]) => props.has(name))
        .map(([regionId]) => regionId)
        .sort(det.compareStrings);
      if (regions.length > 1) {
        diagnostics.push(
          diag('distribution_not_disjoint', {
            definition: rule.id,
            path: `/distribution_rules/${rule.id}/disjoint/properties`,
            args: { property: name, regions: regions.join(',') },
          }),
        );
      }
    }
    if (slotTypes) {
      const slotUniverse = new Set<string>();
      for (const slots of suppliedSlots.values()) {
        for (const type of slots) slotUniverse.add(type);
      }
      for (const type of slotUniverse) {
        const regions = [...suppliedSlots.entries()]
          .filter(([, entry]) => entry.has(type))
          .map(([regionId]) => regionId)
          .sort(det.compareStrings);
        if (regions.length > 1) {
          diagnostics.push(
            diag('distribution_not_disjoint', {
              definition: rule.id,
              path: `/distribution_rules/${rule.id}/disjoint/source_slot_types`,
              args: { slot_type: type, regions: regions.join(',') },
            }),
          );
        }
      }
    }
  }
  return diagnostics;
};
