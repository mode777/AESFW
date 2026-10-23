/**
 * The deficit-policy schema (CONT-6.22, GDD-20.3). A deficit policy governs
 * one owner balance resource; phase 27 applies it when the trigger holds.
 *
 * Source: CONT-6.22, GDD-20.3
 */
import { Type } from '@sinclair/typebox';

import { IdSchema } from './common.js';

const ComparisonSchema = Type.Object(
  {
    operator: Type.Union([
      Type.Literal('less'),
      Type.Literal('less_equal'),
      Type.Literal('greater'),
      Type.Literal('greater_equal'),
      Type.Literal('equal'),
    ]),
    value: Type.Integer(),
  },
  { additionalProperties: false },
);

/** A deficit policy definition (CONT-6.22). */
export const DeficitPolicySchema = Type.Object(
  {
    id: IdSchema,
    resource: IdSchema,
    trigger: ComparisonSchema,
    action: Type.Literal('pause_entities'),
    order: Type.Array(
      Type.Union([Type.Literal('maintenance_desc'), Type.Literal('entity_id_asc')]),
      { minItems: 1 },
    ),
    stop_when: Type.Literal('net_rate_non_negative'),
    exclude_tags: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    resume: Type.Object(
      {
        policy: Type.Union([
          Type.Literal('automatic_reverse_order'),
          Type.Literal('manual'),
          Type.Literal('disabled'),
        ]),
        when: ComparisonSchema,
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);
