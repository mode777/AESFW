/**
 * Total-order sorting and string comparison (TDS-9.4). String comparison uses
 * UTF-16 code-unit order; locale-aware comparison is forbidden in authoritative
 * paths.
 *
 * Source: TDS-9.4
 */

/**
 * Compares two strings in UTF-16 code-unit order. Returns a negative number,
 * zero, or a positive number. Never locale-aware.
 *
 * Source: TDS-9.4
 */
export function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Returns a sorted copy of `items` using the explicit total-order comparator
 * `compare`. ECMAScript `Array.prototype.sort` is stable, and the required
 * total-order comparator makes the result deterministic across engines.
 *
 * Source: TDS-9.4
 */
export function stableSort<T>(items: readonly T[], compare: (a: T, b: T) => number): T[] {
  return [...items].sort(compare);
}
