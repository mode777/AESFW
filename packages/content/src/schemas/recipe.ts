/**
 * The recipe schema (CONT-6.7).
 *
 * Source: CONT-6.7
 */
import { Type } from '@sinclair/typebox';

import { IdSchema, ItemRefSchema } from './common.js';

/** A recipe definition (CONT-6.7). */
export const RecipeSchema = Type.Object(
  {
    id: IdSchema,
    mode: Type.Union([Type.Literal('batch'), Type.Literal('continuous')]),
    duration_ticks: Type.Integer({ minimum: 1 }),
    inputs: Type.Array(ItemRefSchema),
    outputs: Type.Array(ItemRefSchema),
    capability_requirements: Type.Optional(Type.Array(ItemRefSchema)),
    conditions: Type.Optional(IdSchema),
  },
  { additionalProperties: false },
);
