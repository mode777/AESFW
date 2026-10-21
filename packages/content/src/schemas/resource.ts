/**
 * The resource schema (CONT-6.1, CONT-6.2). A capability is a resource whose
 * tags mark it `capability`/`virtual`; the schema does not special-case it.
 *
 * Source: CONT-6.1, CONT-6.2
 */
import { Type } from '@sinclair/typebox';

import { IdSchema, QuantitySchema, StorageSchema } from './common.js';

/** A resource definition (CONT-6.1). */
export const ResourceSchema = Type.Object(
  {
    id: IdSchema,
    tags: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    complexity: Type.Optional(Type.Integer({ minimum: 0 })),
    quantity: QuantitySchema,
    storage: StorageSchema,
    transportable: Type.Boolean(),
    substitutes: Type.Optional(Type.Array(IdSchema)),
    allow_negative: Type.Optional(Type.Boolean()),
    presentation_key: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);
