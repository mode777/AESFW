/**
 * The satisfaction-band schema (CONT-6.19, GDD-12.6). A band table maps ranges
 * of satisfaction Z to effects; the framework supplies the effect types.
 *
 * Source: CONT-6.19, GDD-12.6
 */
import { Type } from '@sinclair/typebox';

import { IdSchema } from './common.js';

const GrowthEffectSchema = Type.Object(
  {
    type: Type.Literal('growth'),
    policy: IdSchema,
  },
  { additionalProperties: false },
);

const OutputMultiplierEffectSchema = Type.Object(
  {
    type: Type.Literal('output_multiplier'),
    resource: IdSchema,
    value: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);

const EnableAdvancementEffectSchema = Type.Object(
  {
    type: Type.Literal('enable_advancement'),
  },
  { additionalProperties: false },
);

const TriggerDeclineEffectSchema = Type.Object(
  {
    type: Type.Literal('trigger_decline'),
    transition: Type.Optional(IdSchema),
    grace_ticks: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);

/** A satisfaction-band effect (CONT-6.19). */
export const BandEffectSchema = Type.Union([
  GrowthEffectSchema,
  OutputMultiplierEffectSchema,
  EnableAdvancementEffectSchema,
  TriggerDeclineEffectSchema,
]);

/** One band of a band table (CONT-6.19). */
export const BandSchema = Type.Object(
  {
    min: Type.Integer({ minimum: 0, maximum: 1000 }),
    effects: Type.Array(BandEffectSchema),
  },
  { additionalProperties: false },
);

/** A satisfaction-band table (CONT-6.19). */
export const SatisfactionBandsSchema = Type.Object(
  {
    id: IdSchema,
    bands: Type.Array(BandSchema, { minItems: 1 }),
  },
  { additionalProperties: false },
);
