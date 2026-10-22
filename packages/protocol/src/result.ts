/**
 * The decode result type used by every protocol codec (TDS-22).
 *
 * `@aesfw/protocol` must not import any other package (TDS-4.3 rule 3), so it
 * declares its own structurally identical result type instead of reusing the
 * one in `@aesfw/core`.
 *
 * Source: TDS-22, TDS-23
 */
import type { ProtocolError } from './errors.js';

/** Success or a non-empty list of decode errors. */
export type DecodeResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: readonly ProtocolError[] };

/** Wraps a decoded value as a successful result. */
export function ok<T>(value: T): DecodeResult<T> {
  return { ok: true, value };
}

/** Wraps decode errors as a failed result. */
export function err<T = never>(error: readonly ProtocolError[]): DecodeResult<T> {
  return { ok: false, error };
}
