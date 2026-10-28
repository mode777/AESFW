/**
 * Residence re-instantiation for transition conversion (GDD-13.3). Reads the
 * target entity definition's `residence` component and its tier's needs,
 * categories, and outputs through the registry's raw-data accessor.
 *
 * Source: GDD-13.3, CONT-6.8, CONT-6.9, CONT-6.10
 */
import { stringId } from '../../ids/index.js';
import type { DefinitionHandle, EntityId } from '../../ids/index.js';
import type { Registry } from '../../registry/types.js';
import type { CategorySpec, NeedSpec } from '../needs/types.js';
import type { PopulationOutput } from '../population/types.js';
import type { Residence } from '../population/types.js';

const asRecord = (value: unknown): { readonly [key: string]: unknown } | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as { readonly [key: string]: unknown })
    : null;

const asArray = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

const asInt = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isSafeInteger(value) ? value : fallback;

const handleOf = (
  registry: Registry,
  type: Parameters<NonNullable<Registry['handleOf']>>[0],
  value: unknown,
): DefinitionHandle | null =>
  typeof value === 'string' ? (registry.handleOf?.(type, stringId(value)) ?? null) : null;

/** Resolves a tier's needs (CONT-6.11). */
const needsForTier = (registry: Registry, tierId: string): readonly NeedSpec[] => {
  const needs: NeedSpec[] = [];
  for (const definition of registry.handlesOf?.('need') ?? []) {
    const data = asRecord(registry.definitionDataOf?.('need', definition) ?? null);
    if (data === null) continue;
    if (!asArray(data['applies_to']).includes(tierId)) continue;
    const demand = asRecord(data['demand']) ?? {};
    const fulfillment = asRecord(data['fulfillment']) ?? {};
    const type =
      demand['type'] === 'resource_availability'
        ? 'resource_availability'
        : demand['type'] === 'service_capacity'
          ? 'service_capacity'
          : demand['type'] === 'spatial_coverage'
            ? 'spatial_coverage'
            : demand['type'] === 'state_query'
              ? 'state_query'
              : 'resource_consumption';
    const service = handleOf(registry, 'service', demand['service']);
    const condition = handleOf(registry, 'condition', demand['condition']);
    const requiredDistinctProviders = demand['required_distinct_providers'];
    needs.push({
      need: definition,
      category: handleOf(registry, 'needCategory', data['category']) as NeedSpec['category'],
      type,
      resource: handleOf(registry, 'resource', demand['resource']) as NeedSpec['resource'],
      quantityPerPopulationPerTick:
        type === 'resource_availability'
          ? asInt(demand['minimum_quantity'])
          : type === 'service_capacity'
            ? asInt(demand['quantity_per_population_per_tick'])
            : 0,
      measurementWindowTicks: asInt(fulfillment['measurement_window_ticks'], 1),
      targetRatio: asInt(fulfillment['target_ratio'], 1000),
      ...(service !== null ? { service } : {}),
      ...(typeof requiredDistinctProviders === 'number' ? { requiredDistinctProviders } : {}),
      ...(condition !== null ? { condition } : {}),
    });
  }
  return needs;
};

/** Resolves a tier's category specifications (CONT-6.13, GDD-12.3). */
const categoriesForTier = (
  registry: Registry,
  data: Record<string, unknown>,
  tierId: string,
): readonly CategorySpec[] => {
  const categories: CategorySpec[] = [];
  for (const categoryId of asArray(data['need_categories'])) {
    const handle = handleOf(registry, 'needCategory', categoryId);
    if (handle === null) continue;
    const categoryData = asRecord(registry.definitionDataOf?.('needCategory', handle) ?? null);
    if (categoryData === null) continue;
    const evaluation = asRecord(categoryData['evaluation']) ?? {};
    const mode = evaluation['mode'];
    const members = asArray(categoryData['members'])
      .map((entry) => {
        const record = asRecord(entry);
        const need = handleOf(registry, 'need', record?.['need']);
        if (need === null) return null;
        return { need, weight: asInt(record?.['weight']) };
      })
      .filter((entry): entry is { need: DefinitionHandle; weight: number } => entry !== null);
    categories.push({
      category: handle,
      mode:
        mode === 'all' ||
        mode === 'any' ||
        mode === 'count' ||
        mode === 'average' ||
        mode === 'minimum'
          ? mode
          : 'weighted_score',
      requiredScore: asInt(
        asRecord(evaluation['required_score_by_tier'])?.[tierId],
        asInt(evaluation['required_score']),
      ),
      members,
    });
  }
  return categories;
};

/**
 * Resolves a residence component from an entity definition (GDD-13.3). The
 * converted residence keeps the entity's location and receives the target
 * tier's capacity, outputs, needs, and categories.
 *
 * Source: GDD-13.3, CONT-6.8, CONT-6.9
 */
export function residenceFromDefinition(
  registry: Registry,
  definition: DefinitionHandle,
  location: EntityId | null,
): Residence | null {
  const entityData = asRecord(registry.definitionDataOf?.('entity', definition) ?? null);
  const component = asRecord(asRecord(entityData?.['components'])?.['residence']);
  if (component === null) return null;
  const tier = handleOf(registry, 'tier', component['population_tier']);
  if (tier === null) return null;
  const tierId =
    typeof component['population_tier'] === 'string' ? component['population_tier'] : null;
  if (tierId === null) return null;
  const tierData = asRecord(registry.definitionDataOf?.('tier', tier) ?? null) ?? {};
  const outputs: PopulationOutput[] = asArray(tierData['outputs']).map((entry) => {
    const record = asRecord(entry) ?? {};
    return {
      resource: handleOf(registry, 'resource', record['resource']) as PopulationOutput['resource'],
      ratePerPopulationPerTick: asInt(record['rate_per_population_per_tick']),
      scope:
        record['scope'] === 'owner'
          ? 'owner'
          : record['scope'] === 'global'
            ? 'global'
            : 'location',
      satisfactionCurve: handleOf(registry, 'curve', record['satisfaction_curve']),
    };
  });
  const satisfaction = asRecord(tierData['satisfaction']) ?? {};
  const bands = handleOf(registry, 'band', satisfaction['bands']);
  const growthPolicy = handleOf(registry, 'growthPolicy', component['growth_policy']);
  return {
    tier,
    capacity: asInt(component['capacity'], 1),
    location,
    growthPolicy,
    consumptionFactor: asInt(tierData['consumption_factor'], 1000),
    outputs,
    needs: needsForTier(registry, tierId),
    categories: categoriesForTier(registry, tierData, tierId),
    satisfactionAggregation: satisfaction['aggregation'] === 'minimum' ? 'minimum' : 'average',
    ...(bands !== null ? { bands } : {}),
  };
}
