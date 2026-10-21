/**
 * The M1 definition schemas and their validation surface (CONT-6, TDS-20.4).
 *
 * Source: CONT-4, CONT-6, TDS-7, TDS-20.2, TDS-20.4
 */
export {
  IdSchema,
  InventoryRefSchema,
  ItemRefSchema,
  LocalIdSchema,
  QuantitySchema,
  RateRefSchema,
  StorageSchema,
} from './common.js';
export { ResourceSchema } from './resource.js';
export { LocationTemplateSchema } from './location.js';
export { RecipeSchema } from './recipe.js';
export { EntityDefinitionSchema } from './entity.js';
export { GrowthPolicySchema, PopulationTierSchema } from './population.js';
export { NeedCategorySchema, NeedSchema } from './need.js';
export { isValidDefinitionId } from './ids.js';
export {
  COLLECTION_ORDER,
  DEFINITION_COLLECTIONS,
  DEFINITION_SCHEMAS,
  isDefinitionCollection,
} from './collections.js';
export type { DefinitionCollection } from './collections.js';
export { validateSchemas } from './validate.js';
export type { RawDefinition, RawDefinitions, SchemaValidationResult } from './validate.js';
export { exportJsonSchemas } from './export.js';
