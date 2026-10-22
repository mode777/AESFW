/**
 * Structural guards and error construction for the protocol codecs (design D4).
 * Hand-written to keep `@aesfw/protocol` free of runtime dependencies (TDS-4.2).
 *
 * Source: TDS-22
 */
import {
  PROTOCOL_ERROR_CODES,
  type ProtocolError,
  type ProtocolErrorArguments,
} from '../errors.js';
import type { JsonObject, JsonValue } from '../scalars.js';

/** True for a non-null, non-array object. */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** True for a safe integer. */
export function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

/** True for a non-negative safe integer. */
export function isNonNegativeInteger(value: unknown): value is number {
  return isInteger(value) && value >= 0;
}

/** True for a string. */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/** True for a boolean. */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/** True for an array of strings. */
export function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

/** True for an array of safe integers. */
export function isIntegerArray(value: unknown): value is readonly number[] {
  return Array.isArray(value) && value.every((entry) => isInteger(entry));
}

/** True for an object whose own values are all JSON values. */
export function isJsonObject(value: unknown): value is JsonObject {
  return isObject(value) && Object.values(value).every((entry) => isJsonValue(entry));
}

/** True for a JSON value (string, number, boolean, null, array, object). */
export function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isSafeInteger(value))
  ) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every((entry) => isJsonValue(entry));
  }
  if (isObject(value)) {
    return Object.values(value).every((entry) => isJsonValue(entry));
  }
  return false;
}

/** Builds an `invalid_field` error for a JSON-pointer-like path. */
export function invalidField(path: string, args?: ProtocolErrorArguments): ProtocolError {
  return {
    code: PROTOCOL_ERROR_CODES.invalidField,
    path,
    arguments: args ?? {},
  };
}

/** Builds an `unknown_kind` error. */
export function unknownKind(kind: string): ProtocolError {
  return { code: PROTOCOL_ERROR_CODES.unknownKind, path: 'kind', arguments: { kind } };
}

/** Builds a `version_mismatch` error. */
export function versionMismatch(actual: number): ProtocolError {
  return {
    code: PROTOCOL_ERROR_CODES.versionMismatch,
    path: 'protocol_version',
    arguments: { actual },
  };
}
