/**
 * The need and need-category schemas (CONT-6.11, CONT-6.13). Only the
 * `resource_consumption` and `resource_availability` demands of the M1 loop
 * are schematised; service, coverage, and state-query demands belong to
 * `add-services-and-coverage-needs` (7.6).
 *
 * Source: CONT-6.11, CONT-6.13
 */
import { Type } from '@sinclair/typebox';

import { IdSchema } from './common.js';

const ResourceConsumptionDemandSchema = Type.Object(
  {
    type: Type.Literal('resource_consumption'),
    resource: IdSchema,
    quantity_per_population_per_tick: Type.Integer({ minimum: 0 }),
    inventory_access_purpose: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

const ResourceAvailabilityDemandSchema = Type.Object(
  {
    type: Type.Literal('resource_availability'),
    resource: IdSchema,
    minimum_quantity: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);

/** A need definition (CONT-6.11). */
export const NeedSchema = Type.Object(
  {
    id: IdSchema,
    category: IdSchema,
    applies_to: Type.Array(IdSchema),
    demand: Type.Union([ResourceConsumptionDemandSchema, ResourceAvailabilityDemandSchema]),
    fulfillment: Type.Object(
      {
        measurement_window_ticks: Type.Integer({ minimum: 1 }),
        target_ratio: Type.Integer({ minimum: 0, maximum: 1000 }),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

const NeedMemberSchema = Type.Object(
  {
    need: IdSchema,
    weight: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);

/** A need-category definition (CONT-6.13). */
export const NeedCategorySchema = Type.Object(
  {
    id: IdSchema,
    evaluation: Type.Object(
      {
        mode: Type.Union([Type.Literal('all'), Type.Literal('weighted_score')]),
        required_score: Type.Optional(Type.Integer({ minimum: 0 })),
        required_score_by_tier: Type.Optional(Type.Record(IdSchema, Type.Integer({ minimum: 0 }))),
      },
      { additionalProperties: false },
    ),
    members: Type.Array(NeedMemberSchema),
  },
  { additionalProperties: false },
);
