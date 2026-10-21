/**
 * Shared schema fragments for the M1 definition set (CONT-6). Fragments are
 * reused across definition schemas so that quantity, storage, and reference
 * shapes stay identical everywhere they appear.
 *
 * Source: CONT-6.1, CONT-6.7, CONT-6.8
 */
import { Type } from '@sinclair/typebox';

/** A full definition ID reference; format is checked by `isValidDefinitionId`. */
export const IdSchema = Type.String({ minLength: 1 });

/** A local identifier within one definition (for example an inventory name). */
export const LocalIdSchema = Type.String({ minLength: 1, pattern: '^[a-z0-9_]+$' });

/** A reference to a local inventory, optionally qualified as `location.<id>`. */
export const InventoryRefSchema = Type.String({
  minLength: 1,
  pattern: '^(?:location\\.)?[a-z0-9_]+$',
});

/** A resource quantity specification (CONT-6.1). */
export const QuantitySchema = Type.Object(
  {
    precision: Type.Union([Type.Literal('integer'), Type.Literal('fixed')]),
    scale: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

/** A storage policy and scope (CONT-6.1). */
export const StorageSchema = Type.Object(
  {
    policy: Type.Union([Type.Literal('normal'), Type.Literal('recomputed')]),
    scope: Type.Union([
      Type.Literal('inventory'),
      Type.Literal('location'),
      Type.Literal('owner'),
      Type.Literal('global'),
    ]),
  },
  { additionalProperties: false },
);

/** A `{ resource, quantity }` item reference (CONT-6.7). */
export const ItemRefSchema = Type.Object(
  {
    resource: IdSchema,
    quantity: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);

/** A `{ resource, quantity_per_tick }` rate reference (CONT-6.8). */
export const RateRefSchema = Type.Object(
  {
    resource: IdSchema,
    quantity_per_tick: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);
