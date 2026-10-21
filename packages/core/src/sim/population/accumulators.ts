/**
 * World-resident rate accumulators (TDS-6.4). Entries are keyed by
 * `(subject, purpose, resource)` and ordered by that tuple.
 *
 * Source: TDS-6.4
 */
import { compareStrings } from '../../det/index.js';
import type { Int } from '../../fx/index.js';
import type { DefinitionHandle, EntityId } from '../../ids/index.js';
import type { Purpose, World } from '../../world/types.js';

/** Returns the stored carry, or `0`. */
export function readCarry(
  world: World,
  subject: EntityId,
  purpose: Purpose,
  resource: DefinitionHandle,
): Int {
  for (const entry of world.accumulators.entries) {
    if (entry.subject === subject && entry.purpose === purpose && entry.resource === resource) {
      return entry.carry;
    }
  }
  return 0;
}

/** Inserts or replaces the carry, keeping the table sorted. */
export function writeCarry(
  world: World,
  subject: EntityId,
  purpose: Purpose,
  resource: DefinitionHandle,
  carry: Int,
): void {
  const entries = world.accumulators.entries.filter(
    (entry) =>
      !(entry.subject === subject && entry.purpose === purpose && entry.resource === resource),
  );
  if (carry !== 0) entries.push({ subject, purpose, resource, carry });
  entries.sort(
    (left, right) =>
      left.subject - right.subject ||
      compareStrings(left.purpose, right.purpose) ||
      left.resource - right.resource,
  );
  world.accumulators = { entries };
}
