/**
 * Exchange-graph validation (CONT-11.5): an exchange placed in a multi-location
 * world must sit at a location with an incident connection. Elasticity and
 * arbitrage rules remain with the exchange-definition checks (9.1).
 *
 * Source: CONT-11.5
 */
import type { Diagnostic } from '@aesfw/core';

import { diag } from '../diagnostics/diagnostics.js';
import type { RawDefinitions } from '../schemas/validate.js';
import { asArray, asRecord, asString, collection } from './common.js';

/**
 * Validates exchange reachability over a composed definition set, reporting
 * `exchange_unreachable`.
 *
 * Source: CONT-11.5
 */
export function validateExchangeGraph(definitions: RawDefinitions): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const exchange of collection(definitions, 'exchanges')) {
    const template = asString(exchange['location']);
    if (template === null) continue;
    for (const world of collection(definitions, 'worlds')) {
      const instanceIds = asArray(world['locations'])
        .filter((entry) => asString(asRecord(entry)?.['template']) === template)
        .map((entry) => asString(asRecord(entry)?.['id']))
        .filter((id): id is string => id !== null);
      if (instanceIds.length === 0) continue;
      const locationCount = asArray(world['locations']).length;
      if (locationCount < 2) continue;
      const connected = asArray(world['connections']).some((entry) => {
        const record = asRecord(entry);
        if (record?.['enabled'] === false) return false;
        const origin = asString(record?.['origin']);
        const destination = asString(record?.['destination']);
        return (
          (origin !== null && instanceIds.includes(origin)) ||
          (destination !== null && instanceIds.includes(destination))
        );
      });
      if (!connected) {
        diagnostics.push(
          diag('exchange_unreachable', {
            definition: exchange.id,
            path: `/exchanges/${exchange.id}/location`,
            args: { world: world.id, location: template },
          }),
        );
      }
    }
  }
  return diagnostics;
}
