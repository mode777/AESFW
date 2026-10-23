/**
 * The service schema (CONT-6.12). A service is a generated capacity or a
 * spatial coverage that `service_capacity` and `spatial_coverage` needs
 * reference.
 *
 * Source: CONT-6.12, GDD-9.6
 */
import { Type } from '@sinclair/typebox';

import { IdSchema } from './common.js';

/** A spatial coverage relation (CONT-6.12). */
export const RelationSchema = Type.Object(
  {
    type: Type.Literal('radius'),
    cells: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

/** A service definition (CONT-6.12). */
export const ServiceSchema = Type.Object(
  {
    id: IdSchema,
    mode: Type.Union([Type.Literal('coverage'), Type.Literal('capacity')]),
    default_relation: Type.Optional(RelationSchema),
  },
  { additionalProperties: false },
);
