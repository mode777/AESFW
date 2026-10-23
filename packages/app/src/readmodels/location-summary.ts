/**
 * Location summary read model (PIC-10.2).
 *
 * Source: PIC-10.2, TDS-18.4
 */
import { readWorld } from '@aesfw/core';
import type {
  OwnerHandle,
  PopulationGroup,
  Registry,
  Residence,
  ThroughputPool,
} from '@aesfw/core';
import type { LocationSummaryDto } from '@aesfw/protocol';
import type { SessionState } from '../session/types.js';

const resourceId = (registry: Registry, handle: number): string =>
  registry.stringIdOf('resource', handle as never) ?? `resource.${handle}`;

const tierId = (registry: Registry, handle: number): string =>
  registry.stringIdOf('tier', handle as never) ?? `tier.${handle}`;

/**
 * Builds the location summary read model, or `null` when `location` is not a
 * location (PIC-10.2).
 *
 * Source: PIC-10.2
 */
export function locationSummary(
  session: SessionState,
  actor: OwnerHandle,
  location: number,
): LocationSummaryDto | null {
  const world = session.world;
  const registry = session.content.registry;
  const reader = readWorld(world, registry);
  const loc = reader.location(location as never);
  if (loc === undefined) return null;

  const inventoryTotals: Record<string, number> = {};
  const hub = reader.locationHub(location as never);
  for (const inventoryId of hub?.inventories ?? []) {
    const inventory = reader.inventory(inventoryId);
    if (inventory === undefined) continue;
    for (const entry of inventory.entries) {
      const key = resourceId(registry, entry.resource);
      inventoryTotals[key] = (inventoryTotals[key] ?? 0) + entry.quantity;
    }
  }

  const populationByTier: Record<string, number> = {};
  let entityCount = 0;
  for (const entity of reader.entityIds) {
    const producer = reader.producer(entity);
    const residence = world.stores.get<Residence>('residence').get(entity);
    const at = producer?.location ?? residence?.location ?? null;
    if (at !== location) continue;
    entityCount += 1;
    const group = world.stores.get<PopulationGroup>('populationGroup').get(entity);
    if (group !== undefined) {
      const key = tierId(registry, group.tier);
      populationByTier[key] = (populationByTier[key] ?? 0) + group.count;
    }
  }

  const pool = world.stores.get<ThroughputPool>('throughputPool').get(location as never);
  const region =
    loc.region === null ? undefined : (registry.stringIdOf('region', loc.region) ?? undefined);
  return {
    entity_id: location,
    knowledge: reader.knowledge(actor, location as never),
    active: loc.active,
    ...(region === undefined ? {} : { region }),
    ...(pool === undefined
      ? {}
      : {
          throughput: {
            capacity: pool.capacity,
            requested: pool.requested,
            throttle_permille: pool.throttlePermille,
          },
        }),
    inventory_totals: inventoryTotals,
    population_by_tier: populationByTier,
    entity_counts: { entities: entityCount },
    connections: [],
  };
}
