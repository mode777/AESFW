/**
 * The definition-collection catalogue (CONT-6, TDS-7). `DEFINITION_COLLECTIONS`
 * maps each M1 top-level document key to a core `DefinitionType` in canonical
 * order; `COLLECTION_ORDER` is its key tuple and `DEFINITION_SCHEMAS` its
 * schema map. The registry compilation (1.4) iterates this order to assign
 * handles, so it defines the handle space.
 *
 * Source: CONT-6, TDS-7
 */
import type { TSchema } from '@sinclair/typebox';
import type { DefinitionType } from '@aesfw/core';

import { ConditionSchema } from './condition.js';
import { ConnectionDefinitionSchema } from './connection.js';
import { CurveSchema } from './curve.js';
import { DeficitPolicySchema } from './deficit.js';
import { EntityDefinitionSchema } from './entity.js';
import { LocationTemplateSchema } from './location.js';
import { NeedCategorySchema, NeedSchema } from './need.js';
import { GrowthPolicySchema, PopulationTierSchema } from './population.js';
import { RecipeSchema } from './recipe.js';
import { ResourceSchema } from './resource.js';
import { WorldDefinitionSchema } from './world.js';

/** Maps a top-level document key to its core definition type (TDS-7). */
export const DEFINITION_COLLECTIONS = {
  resources: 'resource',
  location_templates: 'location',
  recipes: 'recipe',
  entity_definitions: 'entity',
  population_tiers: 'tier',
  needs: 'need',
  need_categories: 'needCategory',
  growth_policies: 'growthPolicy',
  conditions: 'condition',
  curves: 'curve',
  deficit_policies: 'deficitPolicy',
  connections: 'connection',
  worlds: 'world',
} as const satisfies Readonly<Record<string, DefinitionType>>;

/** A top-level document key of the M1 content set. */
export type DefinitionCollection = keyof typeof DEFINITION_COLLECTIONS;

/** The collection keys in canonical order. */
export const COLLECTION_ORDER = Object.keys(
  DEFINITION_COLLECTIONS,
) as readonly DefinitionCollection[];

/** The schema of each M1 definition collection. */
export const DEFINITION_SCHEMAS = {
  resources: ResourceSchema,
  location_templates: LocationTemplateSchema,
  recipes: RecipeSchema,
  entity_definitions: EntityDefinitionSchema,
  population_tiers: PopulationTierSchema,
  needs: NeedSchema,
  need_categories: NeedCategorySchema,
  growth_policies: GrowthPolicySchema,
  conditions: ConditionSchema,
  curves: CurveSchema,
  deficit_policies: DeficitPolicySchema,
  connections: ConnectionDefinitionSchema,
  worlds: WorldDefinitionSchema,
} as const satisfies Readonly<Record<DefinitionCollection, TSchema>>;

/** True when `key` names a known definition collection. */
export function isDefinitionCollection(key: string): key is DefinitionCollection {
  return Object.prototype.hasOwnProperty.call(DEFINITION_COLLECTIONS, key);
}
