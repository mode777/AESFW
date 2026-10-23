/**
 * The transport-unit schema (CONT-6.16). A transport unit is a controllable
 * entity with cargo compartments, movement, handling, and continuous
 * maintenance.
 *
 * Source: CONT-6.16, GDD-15.4
 */
import { Type } from '@sinclair/typebox';

import { IdSchema } from './common.js';
import { MaintenanceSchema } from './entity.js';

const CargoSchema = Type.Object(
  {
    compartment_policy: Type.Union([
      Type.Literal('unrestricted'),
      Type.Literal('typed_slots'),
      Type.Literal('per_resource'),
    ]),
    slots: Type.Integer({ minimum: 1 }),
    slot_capacity: Type.Integer({ minimum: 0 }),
    acceptance: Type.Union([Type.Literal('transportable_resources'), Type.Literal('all')]),
  },
  { additionalProperties: false },
);

const MovementSchema = Type.Object(
  {
    speed_permille: Type.Integer({ minimum: 1 }),
    mode: Type.Optional(Type.Union([Type.Literal('physical'), Type.Literal('abstract')])),
    allowed_connection_tags: Type.Optional(Type.Array(IdSchema)),
  },
  { additionalProperties: false },
);

const HandlingSchema = Type.Object(
  {
    loading_rate_per_tick: Type.Integer({ minimum: 0 }),
    unloading_rate_per_tick: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);

/** A transport-unit definition (CONT-6.16). */
export const TransportUnitSchema = Type.Object(
  {
    id: IdSchema,
    tags: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    entity_definition: IdSchema,
    cargo: CargoSchema,
    movement: MovementSchema,
    handling: HandlingSchema,
    order_modes: Type.Optional(
      Type.Array(
        Type.Union([
          Type.Literal('route'),
          Type.Literal('explore'),
          Type.Literal('establish'),
          Type.Literal('trade'),
        ]),
      ),
    ),
    maintenance: Type.Optional(MaintenanceSchema),
  },
  { additionalProperties: false },
);
