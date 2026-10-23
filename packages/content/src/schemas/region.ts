/**
 * The region and distribution-rule schemas (CONT-6.18). Regions name groups of
 * locations; a distribution rule declares which property names and source slot
 * types must stay disjoint between its regions and whether the assignment of
 * unmatched attributes is generated from a seeded stream.
 *
 * Source: CONT-6.18
 */
import { Type } from '@sinclair/typebox';

import { IdSchema } from './common.js';

/** A region definition (CONT-6.18, GDD-6.4). */
export const RegionSchema = Type.Object(
  {
    id: IdSchema,
    tags: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
  },
  { additionalProperties: false },
);

/** A distribution rule definition (CONT-6.18). */
export const DistributionRuleSchema = Type.Object(
  {
    id: IdSchema,
    regions: Type.Array(IdSchema, { minItems: 1 }),
    disjoint: Type.Object(
      {
        properties: Type.Array(Type.String({ minLength: 1 })),
        source_slot_types: Type.Boolean(),
      },
      { additionalProperties: false },
    ),
    generation: Type.Object(
      {
        mode: Type.Union([Type.Literal('fixed'), Type.Literal('seeded')]),
        seed_stream: Type.Optional(IdSchema),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);
