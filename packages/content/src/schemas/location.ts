/**
 * The abstract location-template schema (CONT-6.4). Only the fields the M1
 * abstract-capacity policy needs are schematised; `add-grid-spatial-policy`
 * (3.1), `add-regions-and-distribution-rules` (8.1), and
 * `add-location-establishment` (8.3) extend it.
 *
 * Source: CONT-6.4
 */
import { Type } from '@sinclair/typebox';

import { IdSchema, LocalIdSchema } from './common.js';

const InventorySchema = Type.Object(
  {
    id: LocalIdSchema,
    capacity: Type.Object(
      {
        mode: Type.Union([Type.Literal('total'), Type.Literal('per_resource')]),
        quantity: Type.Integer({ minimum: 0 }),
      },
      { additionalProperties: false },
    ),
    access_policy: IdSchema,
  },
  { additionalProperties: false },
);

/** A location template definition (CONT-6.4). */
export const LocationTemplateSchema = Type.Object(
  {
    id: IdSchema,
    spatial_policy: IdSchema,
    spatial_parameters: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
    tags: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    properties: Type.Optional(Type.Record(Type.String(), Type.Integer())),
    inventories: Type.Array(InventorySchema),
    activation: Type.Object({ initial: Type.Boolean() }, { additionalProperties: false }),
  },
  { additionalProperties: false },
);
