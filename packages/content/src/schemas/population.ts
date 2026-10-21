/**
 * The population-tier and growth-policy schemas (CONT-6.10, CONT-6.14).
 *
 * Source: CONT-6.10, CONT-6.14
 */
import { Type } from '@sinclair/typebox';

import { IdSchema } from './common.js';

const TierOutputSchema = Type.Object(
  {
    resource: IdSchema,
    scope: Type.Union([Type.Literal('location'), Type.Literal('owner'), Type.Literal('global')]),
    rate_per_population_per_tick: Type.Integer({ minimum: 0 }),
    satisfaction_curve: Type.Optional(IdSchema),
  },
  { additionalProperties: false },
);

/** A population tier definition (CONT-6.10). */
export const PopulationTierSchema = Type.Object(
  {
    id: IdSchema,
    consumption_factor: Type.Optional(Type.Integer({ minimum: 1 })),
    need_categories: Type.Array(IdSchema),
    outputs: Type.Array(TierOutputSchema),
  },
  { additionalProperties: false },
);

const GrowthStepSchema = Type.Object(
  {
    quantity: Type.Integer({ minimum: 0 }),
    condition: IdSchema,
  },
  { additionalProperties: false },
);

/** A population growth policy (CONT-6.14). */
export const GrowthPolicySchema = Type.Object(
  {
    id: IdSchema,
    interval_ticks: Type.Integer({ minimum: 1 }),
    increase: Type.Optional(GrowthStepSchema),
    decrease: Type.Optional(GrowthStepSchema),
  },
  { additionalProperties: false },
);
