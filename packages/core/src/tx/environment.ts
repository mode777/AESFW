/**
 * Content-derived balance-resource rules (GDD-7.5, CONT-6.3, TDS-12.2). The
 * registry's raw resource definitions decide which resources may hold a
 * negative quantity; the tick pipeline builds its transaction environment from
 * them so every host and harness derives the same rules from content alone.
 *
 * Source: GDD-7.5, TDS-12.2
 */
import type { JsonValue } from '../det/index.js';
import type { DefinitionHandle } from '../ids/index.js';
import type { Registry } from '../registry/types.js';
import type { TxEnvironment } from './types.js';

type Data = { readonly [key: string]: JsonValue };

const asRecord = (value: JsonValue | null | undefined): Data | null =>
  value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)
    ? (value as Data)
    : null;

/**
 * True when the resource definition declares `allow_negative: true` (GDD-7.5).
 * Unknown resources, registries without definition data, and malformed entries
 * never allow a negative quantity.
 *
 * Source: GDD-7.5, CONT-6.3
 */
export function resourceAllowsNegative(registry: Registry, resource: DefinitionHandle): boolean {
  const data = asRecord(registry.definitionDataOf?.('resource', resource));
  return data?.['allow_negative'] === true;
}

/**
 * The transaction environment derived from loaded content: only resources
 * whose definition sets `allow_negative` may go below zero.
 *
 * Source: GDD-7.5, TDS-12.2
 */
export function txEnvironmentFor(registry: Registry): TxEnvironment {
  return { allowNegative: (resource) => resourceAllowsNegative(registry, resource) };
}
