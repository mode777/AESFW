/**
 * The entity-definition schema and its components (CONT-6.8, CONT-6.9):
 * resource source, producer, residence, storage access, construction,
 * placement, connectivity, and maintenance. Capability and lifecycle
 * components belong to later roadmap rows and are intentionally absent.
 *
 * Source: CONT-6.8, CONT-6.9
 */
import { Type } from '@sinclair/typebox';

import { IdSchema, InventoryRefSchema, ItemRefSchema, RateRefSchema } from './common.js';

const ChargePolicySchema = Type.Union([
  Type.Literal('while_exists'),
  Type.Literal('while_enabled'),
  Type.Literal('while_active'),
  Type.Literal('while_processing'),
]);

const ShortagePolicySchema = Type.Union([
  Type.Literal('deactivate_entity'),
  Type.Literal('scale'),
  Type.Literal('accumulate_debt'),
  Type.Literal('ignore'),
  Type.Literal('trigger_transition'),
  Type.Literal('owner_deficit_policy'),
]);

const MaintenanceInputSchema = Type.Object(
  {
    resource: IdSchema,
    quantity: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

/** The entity maintenance component (GDD-20.1, CONT-6.8). */
export const MaintenanceSchema = Type.Object(
  {
    interval_ticks: Type.Integer({ minimum: 1 }),
    inputs: Type.Array(MaintenanceInputSchema, { minItems: 1 }),
    charge_policy: ChargePolicySchema,
    shortage_policy: ShortagePolicySchema,
  },
  { additionalProperties: false },
);

const ResourceSourceSchema = Type.Object(
  {
    policy: Type.Union([
      Type.Literal('infinite_rate'),
      Type.Literal('finite_deposit'),
      Type.Literal('regenerating_deposit'),
      Type.Literal('slot_dependent'),
      Type.Literal('area_dependent'),
      Type.Literal('condition_dependent'),
    ]),
    outputs: Type.Array(RateRefSchema),
    depletion: Type.Optional(
      Type.Union([Type.Literal('none'), Type.Literal('finite'), Type.Literal('regenerating')]),
    ),
    initial_quantity: Type.Optional(Type.Integer({ minimum: 0 })),
    regeneration_per_tick: Type.Optional(Type.Integer({ minimum: 0 })),
    maximum_quantity: Type.Optional(Type.Integer({ minimum: 0 })),
    scale_by_property: Type.Optional(IdSchema),
    condition: Type.Optional(IdSchema),
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

const DeconstructionSchema = Type.Object(
  {
    duration_ticks: Type.Integer({ minimum: 0 }),
    returns: Type.Array(ItemRefSchema),
    cancel_reservations: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

const ConstructionSchema = Type.Object(
  {
    duration_ticks: Type.Integer({ minimum: 0 }),
    costs: Type.Array(ItemRefSchema),
    commit_policy: Type.Union([
      Type.Literal('start'),
      Type.Literal('continuous'),
      Type.Literal('completion'),
    ]),
    deconstruction: Type.Optional(DeconstructionSchema),
  },
  { additionalProperties: false },
);

const PlacementSchema = Type.Object(
  {
    capacity_cost: Type.Optional(Type.Integer({ minimum: 0 })),
    footprint: Type.Optional(
      Type.Tuple([Type.Integer({ minimum: 1 }), Type.Integer({ minimum: 1 })]),
    ),
    working_area: Type.Optional(
      Type.Object(
        {
          cells: Type.Integer({ minimum: 0 }),
          exclusive: Type.Optional(Type.Boolean()),
        },
        { additionalProperties: false },
      ),
    ),
    requires_slot: Type.Optional(IdSchema),
    conditions: Type.Optional(Type.Union([IdSchema, Type.Array(IdSchema)])),
  },
  { additionalProperties: false },
);

const ConnectivitySchema = Type.Union([
  Type.Object({ requires: IdSchema }, { additionalProperties: false }),
  Type.Object({ provides: IdSchema }, { additionalProperties: false }),
]);

const ComponentsSchema = Type.Object(
  {
    resource_source: Type.Optional(ResourceSourceSchema),
    producer: Type.Optional(ProducerSchema),
    residence: Type.Optional(ResidenceSchema),
    storage_access: Type.Optional(StorageAccessSchema),
    construction: Type.Optional(ConstructionSchema),
    placement: Type.Optional(PlacementSchema),
    connectivity: Type.Optional(ConnectivitySchema),
    maintenance: Type.Optional(MaintenanceSchema),
  },
  { additionalProperties: false },
);

/** An entity definition (CONT-6.8, CONT-6.9). */
export const EntityDefinitionSchema = Type.Object(
  {
    id: IdSchema,
    includes: Type.Optional(Type.Array(IdSchema)),
    tags: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    components: ComponentsSchema,
  },
  { additionalProperties: false },
);
