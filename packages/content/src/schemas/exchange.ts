/**
 * The exchange schema (CONT-6.21). An exchange is a fixed trading
 * counterparty that buys and sells resources against an owner-scoped balance
 * resource; elasticity is mandatory so trade can never become an unbounded
 * money exploit.
 *
 * Source: GDD-17.1, GDD-17.2, GDD-17.3, CONT-6.21
 */
import { Type } from '@sinclair/typebox';

import { IdSchema } from './common.js';

/** A price side of one good (CONT-6.21). */
const PriceSideSchema = Type.Object(
  {
    base_price: Type.Integer({ minimum: 1 }),
    enabled: Type.Boolean(),
  },
  { additionalProperties: false },
);

/** A tradable good of an exchange (CONT-6.21). */
const ExchangeGoodSchema = Type.Object(
  {
    resource: IdSchema,
    buy_from_exchange: PriceSideSchema,
    sell_to_exchange: PriceSideSchema,
  },
  { additionalProperties: false },
);

/** The mandatory price elasticity of an exchange (GDD-17.3, CONT-6.21). */
const ExchangeElasticitySchema = Type.Object(
  {
    window_ticks: Type.Integer({ minimum: 1 }),
    step_quantity: Type.Integer({ minimum: 1 }),
    step_change_permille: Type.Integer({ minimum: 0 }),
    recovery_permille_per_interval: Type.Integer({ minimum: 0 }),
    recovery_interval_ticks: Type.Integer({ minimum: 1 }),
    min_price_permille: Type.Integer({ minimum: 1 }),
    max_price_permille: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

/** An exchange definition (CONT-6.21). */
export const ExchangeSchema = Type.Object(
  {
    id: IdSchema,
    location: IdSchema,
    currency: IdSchema,
    goods: Type.Array(ExchangeGoodSchema),
    elasticity: ExchangeElasticitySchema,
    shared_between_owners: Type.Boolean(),
  },
  { additionalProperties: false },
);
