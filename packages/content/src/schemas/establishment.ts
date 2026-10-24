/**
 * The location-establishment schema (CONT-6.20). An establishment defines how
 * an arriving transport unit founds an unoccupied location: knowledge guard,
 * cargo cost, hub entity, activation, and exclusive ownership.
 *
 * Source: GDD-16.3, CONT-6.20
 */
import { Type } from '@sinclair/typebox';

import { IdSchema, ItemRefSchema } from './common.js';

/** A location-establishment definition (CONT-6.20). */
export const EstablishmentSchema = Type.Object(
  {
    id: IdSchema,
    requires_knowledge: Type.Union([Type.Literal('discovered'), Type.Literal('established')]),
    requires_unoccupied: Type.Boolean(),
    cost_source: Type.Literal('transport_cargo'),
    costs: Type.Array(ItemRefSchema),
    creates_hub: IdSchema,
    activation: Type.Literal('on_completion'),
    ownership: Type.Literal('exclusive'),
  },
  { additionalProperties: false },
);
