/**
 * Phase 18 — resolveArrivals (ARCH-14.4). Any arrival of an owner's transport
 * unit raises that owner's knowledge of the location to at least `discovered`
 * (`explore` mode is an order whose only purpose is that arrival), and the
 * arrival of an `establish` order's target station executes the establishment
 * transaction (GDD-16.3).
 *
 * Source: GDD-16.1, GDD-16.3, ARCH-14.4, ARCH-5.2
 */
import type { SystemDescriptor } from '../pipeline/types.js';
import type { OwnerHandle } from '../ids/index.js';
import { readTransportArrivals } from '../sim/transport/route.js';
import { raiseKnowledge, runEstablishOrders } from '../sim/transport/orders.js';

export const phase18ResolveArrivals: SystemDescriptor = {
  phase: 18,
  name: 'resolveArrivals',
  reads: [],
  writes: [
    'owners',
    'cargo',
    'location',
    'stationCursor',
    'transportAssignment',
    'route',
    'definition',
    'owner',
    'resourceSource',
    'producer',
    'capabilityConsumer',
    'residence',
    'populationGroup',
    'growth',
    'connectivityNode',
    'maintenance',
    'modifierSet',
    'movement',
    'handling',
  ],
  run: (ctx) => {
    const arrivals = readTransportArrivals(ctx.scratch);
    const ownerStore = ctx.world.stores.get<{ owner: OwnerHandle }>('owner');
    for (const arrival of arrivals) {
      const owner = ownerStore.get(arrival.unit)?.owner;
      if (owner === undefined) continue;
      if (raiseKnowledge(ctx.world, owner, arrival.location, 'discovered') === 'changed') {
        ctx.events.emit({
          type: 'LocationDiscovered',
          subjects: [arrival.location],
          owner,
          location: arrival.location,
          payload: { owner, location: arrival.location },
        });
      }
    }
    runEstablishOrders(ctx.world, ctx.registry, ctx.scratch, ctx.events, ctx.establishmentSystem);
  },
};
