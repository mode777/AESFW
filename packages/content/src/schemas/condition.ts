/**
 * The condition schema (CONT-7). The `expression` is validated by the compiler
 * in `src/conditions`, which gives precise operator and type diagnostics.
 *
 * Source: CONT-7
 */
import { Type } from '@sinclair/typebox';

import { IdSchema } from './common.js';

/** A condition definition (CONT-7). */
export const ConditionSchema = Type.Object(
  {
    id: IdSchema,
    expression: Type.Unknown(),
  },
  { additionalProperties: false },
);
