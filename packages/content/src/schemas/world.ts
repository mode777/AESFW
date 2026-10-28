/**
 * The world-definition schema (CONT-6.6). A world turns location templates
 * and connection definitions into a concrete sector graph with initial
 * owners, resources, knowledge, entities, and location stock (A15).
 *
 * Source: CONT-6.6
 */
import { Type } from '@sinclair/typebox';

import { IdSchema, ItemRefSchema } from './common.js';

const WorldLocationSchema = Type.Object(
  {
    id: IdSchema,
    template: IdSchema,
    region: Type.Optional(IdSchema),
    properties: Type.Optional(Type.Record(Type.String(), Type.Integer())),
    initial_inventory: Type.Optional(Type.Array(ItemRefSchema)),
  },
  { additionalProperties: false },
);

const WorldConnectionSchema = Type.Object(
  {
    id: IdSchema,
    definition: IdSchema,
    origin: IdSchema,
    destination: IdSchema,
    base_duration_ticks: Type.Optional(Type.Integer({ minimum: 1 })),
    enabled: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

const WorldInitialEntitySchema = Type.Object(
  {
    definition: IdSchema,
    location: IdSchema,
    position: Type.Optional(
      Type.Object(
        { x: Type.Integer({ minimum: 0 }), y: Type.Integer({ minimum: 0 }) },
        { additionalProperties: false },
      ),
    ),
    orientation: Type.Optional(Type.Integer({ minimum: 0, maximum: 3 })),
  },
  { additionalProperties: false },
);

const WorldOwnerSchema = Type.Object(
  {
    id: IdSchema,
    initial_resources: Type.Optional(Type.Array(ItemRefSchema)),
    established_locations: Type.Optional(Type.Array(IdSchema)),
    known_locations: Type.Optional(Type.Array(IdSchema)),
    initial_entities: Type.Optional(Type.Array(WorldInitialEntitySchema)),
  },
  { additionalProperties: false },
);

/** A world definition (CONT-6.6). */
export const WorldDefinitionSchema = Type.Object(
  {
    id: IdSchema,
    locations: Type.Array(WorldLocationSchema, { minItems: 1 }),
    connections: Type.Optional(Type.Array(WorldConnectionSchema)),
    owners: Type.Optional(Type.Array(WorldOwnerSchema)),
  },
  { additionalProperties: false },
);
