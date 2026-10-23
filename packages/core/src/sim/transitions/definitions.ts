/**
 * Transition-definition resolution (CONT-6.15). Definitions are read through
 * the optional `Registry.definitionDataOf` accessor so core stays content-free
 * (design D3 of 3.2).
 *
 * Source: CONT-6.15, GDD-13
 */
import type { Int } from '../../fx/index.js';
import { stringId } from '../../ids/index.js';
import type { DefinitionHandle } from '../../ids/index.js';
import type { Registry } from '../../registry/types.js';
import type {
  EmptyResidencePolicy,
  PopulationConversion,
  RefundPolicy,
  TransitionCost,
  TransitionDefinition,
  TransitionTrigger,
} from './types.js';

const asRecord = (value: unknown): { readonly [key: string]: unknown } | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as { readonly [key: string]: unknown })
    : null;

const asArray = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

const asInt = (value: unknown, fallback = 0): Int =>
  typeof value === 'number' && Number.isSafeInteger(value) ? value : fallback;

const CONVERSIONS: readonly PopulationConversion[] = [
  'retain_count',
  'retain_count_clamped',
  'clamp_to_target_capacity',
  'retain_occupancy_ratio',
  'set_fixed',
  'apply_multiplier',
];

const costLines = (registry: Registry, value: unknown): readonly TransitionCost[] =>
  asArray(value)
    .map((entry) => {
      const record = asRecord(entry);
      const resourceId = record?.['resource'];
      const resource =
        typeof resourceId === 'string'
          ? registry.handleOf?.('resource', stringId(resourceId))
          : null;
      if (resource === null || resource === undefined) return null;
      return { resource, quantity: asInt(record?.['quantity']) };
    })
    .filter((entry): entry is TransitionCost => entry !== null);

const refundOf = (registry: Registry, value: unknown): RefundPolicy => {
  const record = asRecord(value);
  if (record?.['policy'] === 'fraction') {
    return { policy: 'fraction', fraction: asInt(record['fraction']) };
  }
  if (record?.['policy'] === 'resources') {
    return { policy: 'resources', resources: costLines(registry, record['resources']) };
  }
  return { policy: 'none' };
};

/**
 * Resolves a transition definition from its handle, or `null` when the
 * registry cannot supply its data.
 *
 * Source: CONT-6.15
 */
export function transitionDefinitionOf(
  registry: Registry,
  handle: DefinitionHandle,
): TransitionDefinition | null {
  const data = asRecord(registry.definitionDataOf?.('transition', handle) ?? null);
  if (data === null) return null;
  const sourceTier =
    typeof data['source_tier'] === 'string'
      ? registry.handleOf?.('tier', stringId(data['source_tier']))
      : null;
  const targetTier =
    typeof data['target_tier'] === 'string'
      ? registry.handleOf?.('tier', stringId(data['target_tier']))
      : null;
  if (
    sourceTier === null ||
    sourceTier === undefined ||
    targetTier === null ||
    targetTier === undefined
  ) {
    return null;
  }
  const condition =
    typeof data['condition'] === 'string'
      ? (registry.handleOf?.('condition', stringId(data['condition'])) ?? null)
      : null;
  const conversion = asRecord(data['conversion']) ?? {};
  const populationRaw = conversion['population'];
  const population = CONVERSIONS.includes(populationRaw as PopulationConversion)
    ? (populationRaw as PopulationConversion)
    : 'retain_count';
  const entityDefinition =
    typeof conversion['entity_definition'] === 'string'
      ? (registry.handleOf?.('entity', stringId(conversion['entity_definition'])) ?? null)
      : null;
  const triggerRaw = data['trigger'];
  const trigger: TransitionTrigger =
    triggerRaw === 'automatic' || triggerRaw === 'scheduled' || triggerRaw === 'condition_duration'
      ? triggerRaw
      : 'manual_command';
  return {
    transition: handle,
    sourceTier,
    targetTier,
    trigger,
    condition,
    costs: costLines(registry, data['costs']),
    refund: refundOf(registry, data['refund_policy']),
    durationTicks: asInt(data['duration_ticks']),
    conversion: {
      population,
      populationCount: asInt(conversion['population_count']),
      populationMultiplier: asInt(conversion['population_multiplier'], 1000),
      entityDefinition,
    },
  };
}

/** Every transition definition in ascending handle order. */
export function transitionDefinitionsOf(registry: Registry): readonly TransitionDefinition[] {
  const handles = registry.handlesOf?.('transition') ?? [];
  return handles
    .map((handle) => transitionDefinitionOf(registry, handle))
    .filter((definition): definition is TransitionDefinition => definition !== null);
}

/** A tier's `decline_transitions`, in declared order. */
export function declineTransitionsOf(
  registry: Registry,
  tier: DefinitionHandle,
): readonly DefinitionHandle[] {
  const data = asRecord(registry.definitionDataOf?.('tier', tier) ?? null);
  if (data === null) return [];
  return asArray(data['decline_transitions'])
    .map((entry) =>
      typeof entry === 'string'
        ? (registry.handleOf?.('transition', stringId(entry)) ?? null)
        : null,
    )
    .filter((handle): handle is DefinitionHandle => handle !== null);
}

/** A residence's empty-residence policy from its definition (GDD-9.3). */
export function emptyResidencePolicyOf(
  registry: Registry,
  definition: DefinitionHandle,
): EmptyResidencePolicy | null {
  const data = asRecord(registry.definitionDataOf?.('entity', definition) ?? null);
  const components = asRecord(data?.['components']);
  const policy = asRecord(asRecord(components?.['residence'])?.['empty_residence']);
  if (policy === null) return null;
  if (policy['policy'] === 'revert' && typeof policy['definition'] === 'string') {
    const target = registry.handleOf?.('entity', stringId(policy['definition']));
    if (target === null || target === undefined) return null;
    return { policy: 'revert', definition: target };
  }
  if (policy['policy'] === 'decay') {
    return { policy: 'decay', delayTicks: asInt(policy['delay_ticks']) };
  }
  return { policy: 'retain' };
}

/** A definition's residence capacity, or `null` when it has none. */
export function residenceCapacityOf(registry: Registry, definition: DefinitionHandle): Int | null {
  const data = asRecord(registry.definitionDataOf?.('entity', definition) ?? null);
  const components = asRecord(data?.['components']);
  const residence = asRecord(components?.['residence']);
  const capacity = residence?.['capacity'];
  return typeof capacity === 'number' ? capacity : null;
}
