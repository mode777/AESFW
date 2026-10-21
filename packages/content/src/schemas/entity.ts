/**
 * The entity-definition schema and its M1 components (CONT-6.8, CONT-6.9):
 * resource source, producer, residence, and storage access. Placement,
 * construction, capability, connectivity, maintenance, and lifecycle
 * components belong to later roadmap rows and are intentionally absent.
 *
 * Source: CONT-6.8, CONT-6.9
 */
import { Type } from '@sinclair/typebox';

import { IdSchema, InventoryRefSchema, RateRefSchema } from './common.js';

const ResourceSourceSchema = Type.Object(
  {
    policy: Type.Union([Type.Literal('infinite_rate')]),
    outputs: Type.Array(RateRefSchema),
  },
  { additionalProperties: false },
);

const ProducerSchema = Type.Object(
  {
    recipes: Type.Array(IdSchema),
    process_slots: Type.Integer({ minimum: 1 }),
    input_inventory: InventoryRefSchema,
    output_inventory: InventoryRefSchema,
  },
  { additionalProperties: false },
);

const ResidenceSchema = Type.Object(
  {
    population_tier: IdSchema,
    capacity: Type.Integer({ minimum: 1 }),
    initial_population: Type.Optional(Type.Integer({ minimum: 0 })),
    growth_policy: IdSchema,
  },
  { additionalProperties: false },
);

const StorageAccessSchema = Type.Object(
  {
    inventory: InventoryRefSchema,
  },
  { additionalProperties: false },
);

const ComponentsSchema = Type.Object(
  {
    resource_source: Type.Optional(ResourceSourceSchema),
    producer: Type.Optional(ProducerSchema),
    residence: Type.Optional(ResidenceSchema),
    storage_access: Type.Optional(StorageAccessSchema),
  },
  { additionalProperties: false },
);

/** An entity definition (CONT-6.8, CONT-6.9). */
export const EntityDefinitionSchema = Type.Object(
  {
    id: IdSchema,
    includes: Type.Optional(Type.Array(IdSchema)),
    components: ComponentsSchema,
  },
  { additionalProperties: false },
);
