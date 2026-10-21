/**
 * Capability supply rebuild (ARCH-13 step 2). Aggregates provider rates by
 * `(scope, location, capability)` in ascending entity order.
 *
 * Source: GDD-14.1, ARCH-13
 */
import type { World } from '../../world/types.js';
import type { CapabilityPool, CapabilityProvider, CapabilitySupply } from './types.js';
import { poolKey } from './types.js';

/**
 * Builds the per-tick capability supply from providers (phase 05).
 *
 * Source: ARCH-13
 */
export function buildCapabilitySupply(world: World): CapabilitySupply {
  const store = world.stores.get<CapabilityProvider>('capabilityProvider');
  const supply = new Map<string, CapabilityPool>();
  for (const entity of store.ids()) {
    const provider = store.get(entity);
    if (provider === undefined) continue;
    const key = poolKey(provider.scope, provider.location, provider.capability);
    const existing = supply.get(key);
    if (existing === undefined) {
      supply.set(key, {
        scope: provider.scope,
        location: provider.location,
        capability: provider.capability,
        supply: provider.rate,
      });
    } else {
      supply.set(key, { ...existing, supply: existing.supply + provider.rate });
    }
  }
  return supply;
}
