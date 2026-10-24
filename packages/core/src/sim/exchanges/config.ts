/**
 * Exchange configuration read from definition data (GDD-17.2, CONT-6.21).
 * Core stays content-free: the elasticity parameters and base prices are
 * parsed defensively from the raw definition record behind the `Registry`
 * interface, so no `@aesfw/content` import exists on the core side.
 *
 * Source: GDD-17.2, GDD-17.3, ARCH-14.5, TDS-4.3
 */
import type { DefinitionHandle, StringId } from '../../ids/index.js';
import { stringId } from '../../ids/index.js';
import type { Int } from '../../fx/index.js';
import type { Registry } from '../../registry/types.js';

/** The price sides of one good (CONT-6.21). */
export interface ExchangeGoodConfig {
  readonly resource: DefinitionHandle;
  readonly baseBuy: Int;
  readonly baseSell: Int;
}

/** The parsed elasticity block of an exchange (GDD-17.3). */
export interface ExchangeElasticityConfig {
  readonly windowTicks: Int;
  readonly stepQuantity: Int;
  readonly stepChangePermille: Int;
  readonly recoveryPermillePerInterval: Int;
  readonly recoveryIntervalTicks: Int;
  readonly minPricePermille: Int;
  readonly maxPricePermille: Int;
}

/** The parsed definition data of an exchange (CONT-6.21). */
export interface ExchangeConfig {
  readonly id: StringId;
  readonly goods: readonly ExchangeGoodConfig[];
  readonly elasticity: ExchangeElasticityConfig;
}

type Data = Record<string, unknown>;

const asRecord = (value: unknown): Data | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Data) : null;

const asArray = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

const asInt = (value: unknown): Int | null =>
  typeof value === 'number' && Number.isSafeInteger(value) ? value : null;

const positive = (value: unknown): Int | null => {
  const parsed = asInt(value);
  return parsed !== null && parsed > 0 ? parsed : null;
};

const permille = (value: unknown): Int | null => {
  const parsed = asInt(value);
  return parsed !== null && parsed >= 0 ? parsed : null;
};

/**
 * Parses the exchange definition data behind `handle` (CONT-6.21). Returns
 * `null` for a missing definition or a malformed record; callers treat that
 * as absent configuration rather than a defect, matching the registry's
 * optional accessors.
 *
 * Source: GDD-17.2, ARCH-14.5
 */
export function exchangeConfigOf(
  registry: Registry,
  handle: DefinitionHandle,
): ExchangeConfig | null {
  const data = asRecord(registry.definitionDataOf?.('exchange', handle) ?? null);
  if (data === null) return null;
  const id = data['id'];
  const elasticityData = asRecord(data['elasticity']);
  if (typeof id !== 'string' || elasticityData === null) return null;
  const windowTicks = positive(elasticityData['window_ticks']);
  const stepQuantity = positive(elasticityData['step_quantity']);
  const stepChangePermille = permille(elasticityData['step_change_permille']);
  const recoveryPermillePerInterval = permille(elasticityData['recovery_permille_per_interval']);
  const recoveryIntervalTicks = positive(elasticityData['recovery_interval_ticks']);
  const minPricePermille = permille(elasticityData['min_price_permille']);
  const maxPricePermille = permille(elasticityData['max_price_permille']);
  if (
    windowTicks === null ||
    stepQuantity === null ||
    stepChangePermille === null ||
    recoveryPermillePerInterval === null ||
    recoveryIntervalTicks === null ||
    minPricePermille === null ||
    maxPricePermille === null
  ) {
    return null;
  }
  const goods: ExchangeGoodConfig[] = [];
  for (const entry of asArray(data['goods'])) {
    const good = asRecord(entry);
    if (good === null) continue;
    const resourceId = good['resource'];
    const baseBuy = asInt(asRecord(good['buy_from_exchange'])?.['base_price']);
    const baseSell = asInt(asRecord(good['sell_to_exchange'])?.['base_price']);
    if (typeof resourceId !== 'string' || baseBuy === null || baseSell === null) continue;
    const resource = registry.handleOf('resource', stringId(resourceId));
    if (resource === null) continue;
    goods.push({ resource, baseBuy, baseSell });
  }
  return {
    id: id as StringId,
    goods,
    elasticity: {
      windowTicks,
      stepQuantity,
      stepChangePermille,
      recoveryPermillePerInterval,
      recoveryIntervalTicks,
      minPricePermille,
      maxPricePermille,
    },
  };
}
