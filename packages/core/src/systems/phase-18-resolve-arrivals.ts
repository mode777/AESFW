/**
 * Phase 18 — resolveArrivals (ARCH-14.4). Any arrival of an owner's transport
 * unit raises that owner's knowledge of the location to at least `discovered`;
 * `explore` mode is an order whose only purpose is that arrival.
 *
 * Source: GDD-16.1, ARCH-14.4, ARCH-5.2
 */
import type { SystemDescriptor } from '../pipeline/types.js';
import { readTransportArrivals } from '../sim/transport/route.js';
import type { OwnerHandle } from '../ids/index.js';
import type { KnowledgeLevel } from '../world/types.js';

const LEVEL_ORDER: Readonly<Record<KnowledgeLevel, number>> = {
  unknown: 0,
  discovered: 1,
  established: 2,
};

export const phase18ResolveArrivals: SystemDescriptor = {
  phase: 18,
  name: 'resolveArrivals',
  reads: [],
  writes: ['owners'],
  run: (ctx) => {
    const arrivals = readTransportArrivals(ctx.scratch);
    if (arrivals.length === 0) return;
    const ownerStore = ctx.world.stores.get<{ owner: OwnerHandle }>('owner');
    for (const arrival of arrivals) {
      const owner = ownerStore.get(arrival.unit)?.owner;
      if (owner === undefined) continue;
      const owners = [...ctx.world.owners.owners];
      const state = owners[owner];
      if (state === undefined) continue;
      const existing = state.knowledge.find((entry) => entry.location === arrival.location);
      const current = existing?.level ?? 'unknown';
      if (LEVEL_ORDER[current] >= LEVEL_ORDER.discovered) continue;
      const knowledge = [
        ...state.knowledge.filter((entry) => entry.location !== arrival.location),
        { location: arrival.location, level: 'discovered' as const },
      ].sort((a, b) => a.location - b.location);
      owners[owner] = { ...state, knowledge };
      ctx.world.owners = { owners };
      ctx.events.emit({
        type: 'LocationDiscovered',
        subjects: [arrival.location],
        owner,
        location: arrival.location,
        payload: { owner, location: arrival.location },
      });
    }
  },
};
