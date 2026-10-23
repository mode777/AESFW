/**
 * The connection-definition schema (CONT-6.5). A connection is a potential
 * transport edge between two locations; instances are declared by a world
 * definition (CONT-6.6).
 *
 * Source: CONT-6.5
 */
import { Type } from '@sinclair/typebox';

import { IdSchema, ItemRefSchema } from './common.js';

/** A connection definition (CONT-6.5). */
export const ConnectionDefinitionSchema = Type.Object(
  {
    id: IdSchema,
    tags: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    direction: Type.Union([Type.Literal('bidirectional'), Type.Literal('one_way')]),
    traversal: Type.Object(
      {
        base_duration_ticks: Type.Integer({ minimum: 1 }),
        costs: Type.Optional(Type.Array(ItemRefSchema)),
      },
      { additionalProperties: false },
    ),
    allowed_transport_tags: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
  },
  { additionalProperties: false },
);
