/**
 * Branded identifiers (TDS-7). A brand is a compile-time marker; at runtime a
 * branded value is exactly the underlying number or string, so identifiers are
 * free of allocation and serialization overhead. Range validation (for example
 * `EntityId ≥ 1`) belongs to the allocators that create them, not to the brand.
 *
 * Source: TDS-7
 */
export type Brand<T, B extends string> = T & { readonly __brand: B };

/** Stable entity identifier: a safe integer ≥ 1, never reused (TDS-7, ARCH-3.1). */
export type EntityId = Brand<number, 'EntityId'>;

/** Dense index per definition type, assigned in ascending code-unit order of the string ID (TDS-7). */
export type DefinitionHandle = Brand<number, 'DefinitionHandle'>;

/** Owner identifier, assigned in canonical content order (TDS-7). */
export type OwnerHandle = Brand<number, 'OwnerHandle'>;

/** Reservation identifier (TDS-7). */
export type ReservationId = Brand<number, 'ReservationId'>;

/** Simulation tick: a non-negative safe integer (TDS-7). */
export type Tick = Brand<number, 'Tick'>;

/** Definition string ID in `namespace.category.name` form (TDS-7, CONT-4). */
export type StringId = Brand<string, 'StringId'>;

/** Brands a number as an `EntityId`. */
export const entityId = (value: number): EntityId => value as EntityId;

/** Brands a number as a `DefinitionHandle`. */
export const definitionHandle = (value: number): DefinitionHandle => value as DefinitionHandle;

/** Brands a number as an `OwnerHandle`. */
export const ownerHandle = (value: number): OwnerHandle => value as OwnerHandle;

/** Brands a number as a `ReservationId`. */
export const reservationId = (value: number): ReservationId => value as ReservationId;

/** Brands a number as a `Tick`. */
export const tick = (value: number): Tick => value as Tick;

/** Brands a string as a `StringId`. */
export const stringId = (value: string): StringId => value as StringId;
