/**
 * Shared indexes and coercers for the graph-validation stage (CONT-11.4,
 * CONT-11.5). Everything iterates in documented total order: collections in
 * canonical order, definitions ascending by ID, lists in declared order.
 *
 * Source: CONT-11.4, CONT-11.5
 */
import type { JsonValue } from '../types.js';
import type { RawDefinition, RawDefinitions } from '../schemas/validate.js';

export const asRecord = (value: unknown): { readonly [key: string]: JsonValue } | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as { readonly [key: string]: JsonValue })
    : null;

export const asArray = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

export const asString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

/** Resource facts the graph checks need. */
export interface ResourceInfo {
  readonly transportable: boolean;
  readonly recomputedStorage: boolean;
  readonly capabilityTagged: boolean;
  /** The storage scope (`inventory`, `location`, `owner`, or `global`). */
  readonly scope: string | null;
}

/** Recipe inputs and outputs. */
export interface RecipeInfo {
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
}

/**
 * Builds resource facts keyed by resource ID (ascending ID order from the
 * composed, sorted definitions).
 */
export function resourceIndex(definitions: RawDefinitions): Map<string, ResourceInfo> {
  const index = new Map<string, ResourceInfo>();
  for (const resource of definitions['resources'] ?? []) {
    const tags = asArray(resource['tags']).filter(
      (tag): tag is string => asString(tag) !== null,
    ) as readonly string[];
    const storage = asRecord(resource['storage']);
    index.set(resource.id, {
      transportable: resource['transportable'] === true,
      recomputedStorage: storage?.['policy'] === 'recomputed',
      capabilityTagged: tags.includes('capability'),
      scope: asString(storage?.['scope']),
    });
  }
  return index;
}

/** Builds recipe inputs and outputs keyed by recipe ID. */
export function recipeIndex(definitions: RawDefinitions): Map<string, RecipeInfo> {
  const index = new Map<string, RecipeInfo>();
  for (const recipe of definitions['recipes'] ?? []) {
    const resourceList = (field: 'inputs' | 'outputs'): readonly string[] =>
      asArray(recipe[field])
        .map((entry) => asString(asRecord(entry)?.['resource']))
        .filter((id): id is string => id !== null);
    index.set(recipe.id, { inputs: resourceList('inputs'), outputs: resourceList('outputs') });
  }
  return index;
}

/** One entity definition's graph-relevant facts. */
export interface EntityInfo {
  readonly maintenanceInputs: readonly string[];
  readonly sourceOutputs: readonly string[];
  readonly producerRecipes: readonly string[];
  readonly residenceTier: string | null;
}

/** Builds entity-definition facts keyed by entity ID. */
export function entityIndex(definitions: RawDefinitions): Map<string, EntityInfo> {
  const index = new Map<string, EntityInfo>();
  for (const entity of definitions['entity_definitions'] ?? []) {
    const components = asRecord(entity['components']);
    const maintenance = asArray(asRecord(components?.['maintenance'])?.['inputs']).map((entry) =>
      asString(asRecord(entry)?.['resource']),
    );
    const source = asRecord(components?.['resource_source']);
    const sourceOutputs = asArray(source?.['outputs']).map((entry) =>
      asString(asRecord(entry)?.['resource']),
    );
    const producer = asRecord(components?.['producer']);
    const producerRecipes = asArray(producer?.['recipes']).map((entry) => asString(entry));
    const residenceTier = asString(asRecord(components?.['residence'])?.['population_tier']);
    index.set(entity.id, {
      maintenanceInputs: maintenance.filter((id): id is string => id !== null),
      sourceOutputs: sourceOutputs.filter((id): id is string => id !== null),
      producerRecipes: producerRecipes.filter((id): id is string => id !== null),
      residenceTier,
    });
  }
  return index;
}

/** Collects definitions of one collection as a record list in declared order. */
export function collection(definitions: RawDefinitions, key: string): readonly RawDefinition[] {
  return definitions[key] ?? [];
}
