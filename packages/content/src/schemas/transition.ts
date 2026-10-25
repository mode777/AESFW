/**
 * The tier-transition schema (CONT-6.15, GDD-13). A transition advances or
 * declines a residence between tiers with costs, conversion, and refund
 * policies.
 *
 * Source: CONT-6.15, GDD-13
 */
import { Type } from '@sinclair/typebox';

import { IdSchema } from './common.js';

const CostSchema = Type.Object(
  {
    resource: IdSchema,
    quantity: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);

const RefundSchema = Type.Union([
  Type.Object({ policy: Type.Literal('none') }, { additionalProperties: false }),
  Type.Object(
    {
      policy: Type.Literal('fraction'),
      fraction: Type.Integer({ minimum: 0, maximum: 1000 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      policy: Type.Literal('resources'),
      resources: Type.Array(CostSchema),
    },
    { additionalProperties: false },
  ),
]);

const PopulationConversionSchema = Type.Union([
  Type.Literal('retain_count'),
  Type.Literal('retain_count_clamped'),
  Type.Literal('clamp_to_target_capacity'),
  Type.Literal('retain_occupancy_ratio'),
  Type.Literal('set_fixed'),
  Type.Literal('apply_multiplier'),
]);

/** A tier transition (CONT-6.15). */
export const TransitionSchema = Type.Object(
  {
    id: IdSchema,
    source_tier: IdSchema,
    target_tier: IdSchema,
    trigger: Type.Optional(
      Type.Union([
        Type.Literal('manual_command'),
        Type.Literal('automatic'),
        Type.Literal('scheduled'),
        Type.Literal('condition_duration'),
      ]),
    ),
    optional: Type.Optional(Type.Boolean()),
    condition: Type.Optional(IdSchema),
    costs: Type.Optional(Type.Array(CostSchema)),
    cost_source: Type.Optional(Type.Literal('location_inventory')),
    cost_access_purpose: Type.Optional(Type.Literal('population_transition')),
    refund_policy: Type.Optional(RefundSchema),
    duration_ticks: Type.Integer({ minimum: 0 }),
    conversion: Type.Object(
      {
        population: Type.Optional(PopulationConversionSchema),
        population_count: Type.Optional(Type.Integer({ minimum: 0 })),
        population_multiplier: Type.Optional(Type.Integer({ minimum: 0 })),
        entity_definition: Type.Optional(IdSchema),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);
