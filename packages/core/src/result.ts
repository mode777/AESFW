/**
 * The `Result` type for expected failures (TDS-23). Pure packages never throw
 * for expected outcomes; they return a `Result` and reserve exceptions for
 * `InvariantViolation` (framework defects).
 *
 * Source: TDS-23
 */
export type Result<T, E> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

/** Builds the success branch of a `Result`. */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/** Builds the failure branch of a `Result`. */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
