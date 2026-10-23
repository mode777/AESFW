/**
 * Transport-order template schema (CONT-9). Templates supply failure policies
 * and scheduling for runtime route orders.
 *
 * Source: CONT-9, GDD-15.7
 */
import { Type } from '@sinclair/typebox';

import { IdSchema } from './common.js';

const FailurePolicySchema = Type.Union([
  Type.Literal('skip'),
  Type.Literal('wait'),
  Type.Literal('retry'),
  Type.Literal('return'),
  Type.Literal('fail'),
  Type.Literal('retain'),
]);

const FailurePoliciesSchema = Type.Object(
  {
    origin_unavailable: Type.Optional(FailurePolicySchema),
    destination_unavailable: Type.Optional(FailurePolicySchema),
    path_unavailable: Type.Optional(FailurePolicySchema),
    cargo_cannot_unload: Type.Optional(FailurePolicySchema),
    exchange_limit_not_met: Type.Optional(FailurePolicySchema),
    establishment_target_occupied: Type.Optional(FailurePolicySchema),
  },
  { additionalProperties: false },
);

const SchedulingSchema = Type.Object(
  {
    repeat: Type.Optional(Type.Boolean()),
    retry_interval_ticks: Type.Optional(Type.Integer({ minimum: 1 })),
  },
  { additionalProperties: false },
);

/** A transport-order template (CONT-9). */
export const TransportOrderTemplateSchema = Type.Object(
  {
    id: IdSchema,
    mode: Type.Union([
      Type.Literal('route'),
      Type.Literal('explore'),
      Type.Literal('establish'),
      Type.Literal('trade'),
    ]),
    failure_policies: Type.Optional(FailurePoliciesSchema),
    scheduling: Type.Optional(SchedulingSchema),
  },
  { additionalProperties: false },
);
