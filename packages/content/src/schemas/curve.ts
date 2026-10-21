/**
 * The curve schema (CONT-8). Points are `[input, output]` integer pairs;
 * `extrapolation` defaults to `clamp`.
 *
 * Source: CONT-8
 */
import { Type } from '@sinclair/typebox';

import { IdSchema } from './common.js';

const PointSchema = Type.Tuple([Type.Integer(), Type.Integer()]);

/** A curve definition (CONT-8). */
export const CurveSchema = Type.Object(
  {
    id: IdSchema,
    type: Type.Union([
      Type.Literal('constant'),
      Type.Literal('piecewise_linear'),
      Type.Literal('step'),
      Type.Literal('lookup'),
    ]),
    points: Type.Array(PointSchema),
    extrapolation: Type.Optional(
      Type.Union([Type.Literal('clamp'), Type.Literal('linear'), Type.Literal('error')]),
    ),
  },
  { additionalProperties: false },
);
