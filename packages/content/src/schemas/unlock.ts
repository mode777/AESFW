/**
 * The unlock schema (CONT-6.17, GDD-19). An unlock exposes definitions or
 * actions to a configured scope once its condition holds.
 *
 * Source: CONT-6.17, GDD-19
 */
import { Type } from '@sinclair/typebox';

import { IdSchema } from './common.js';

/** The target kinds an unlock may expose (GDD-19). */
export const UNLOCK_TARGET_TYPES = [
  'entity_definition',
  'recipe',
  'population_tier',
  'transport_type',
  'location_template',
  'connection',
  'transition',
  'exchange',
] as const;

/** One exposed target (CONT-6.17). */
export const UnlockTargetSchema = Type.Object(
  {
    type: Type.Union(UNLOCK_TARGET_TYPES.map((value) => Type.Literal(value))),
    id: IdSchema,
  },
  { additionalProperties: false },
);

/** An unlock definition (CONT-6.17). */
export const UnlockSchema = Type.Object(
  {
    id: IdSchema,
    scope: Type.Union([Type.Literal('owner'), Type.Literal('global')]),
    reversible: Type.Optional(Type.Boolean()),
    targets: Type.Array(UnlockTargetSchema, { minItems: 1 }),
    condition: IdSchema,
  },
  { additionalProperties: false },
);
