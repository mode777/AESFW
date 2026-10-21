/**
 * Canonical JSON encoding (TDS-19.3). Object keys are sorted in code-unit
 * order, array order is preserved, only safe integers, strings, booleans,
 * `null`, arrays, and plain objects are allowed, and no insignificant
 * whitespace is emitted. `JSON.stringify` is never used on a composite value,
 * so key order and whitespace are framework-controlled.
 *
 * Source: TDS-19.3, TDS-23
 */
import { InvariantViolation } from '../errors/invariant-violation.js';
import { compareStrings } from './sort.js';

/**
 * A value in the canonical JSON domain (TDS-19.3): a safe integer, string,
 * boolean, `null`, or an array/object of such values.
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

const fail = (path: string, reason: string): never => {
  throw new InvariantViolation('non_canonical_value', { path, reason });
};

const isPlainObject = (value: object): boolean => {
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
};

const encode = (value: unknown, path: string): string => {
  if (value === null) return 'null';

  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number': {
      if (!Number.isSafeInteger(value)) {
        return fail(path, 'number_not_safe_integer');
      }
      return String(value === 0 ? 0 : value);
    }
    case 'string':
      return JSON.stringify(value);
    case 'object': {
      if (Array.isArray(value)) {
        const parts = value.map((item, index) => encode(item, `${path}[${index}]`));
        return `[${parts.join(',')}]`;
      }
      if (!isPlainObject(value)) {
        return fail(path, 'non_plain_object');
      }
      const record = value as Record<string, unknown>;
      const keys = Object.keys(record).sort(compareStrings);
      const parts = keys.map(
        (key) => `${JSON.stringify(key)}:${encode(record[key], `${path}.${key}`)}`,
      );
      return `{${parts.join(',')}}`;
    }
    default:
      return fail(path, `unsupported_${typeof value}`);
  }
};

/**
 * Encodes `value` as canonical JSON (TDS-19.3). Throws `InvariantViolation`
 * code `non_canonical_value` for any value outside the canonical domain.
 *
 * Source: TDS-19.3, TDS-23
 */
export function canonicalStringify(value: unknown): string {
  return encode(value, '$');
}
