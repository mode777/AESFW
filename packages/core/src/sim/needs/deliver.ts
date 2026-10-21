/**
 * Need delivery (phase 20, GDD-12.2). Consumption needs withdraw from the
 * location's accessible inventories; availability needs only test supply.
 *
 * Source: GDD-12.2, GDD-12.4, ARCH-12
 */
import type { EventWriter } from '../../events/event-writer.js';
import type { DefinitionHandle, EntityId } from '../../ids/index.js';
import type { TransactionWriter } from '../../tx/index.js';
import { quantityOf } from '../../tx/inventory.js';
import type { Inventory } from '../../tx/inventory.js';
import { sharedLocationPolicy } from '../../policies/inventory-access/index.js';
import type { World } from '../../world/types.js';
import { isResidence } from '../population/types.js';
import type { Residence } from '../population/types.js';
import { isNeedStates } from './types.js';
import type { NeedRuntime, NeedStates } from './types.js';

const stock = (world: World, inventory: EntityId, resource: DefinitionHandle): number => {
  const component = world.stores.get<Inventory>('inventory').get(inventory);
  return component === undefined ? 0 : quantityOf(component, resource);
};

/**
 * Delivers need resources from accessible inventories (phase 20).
 *
 * Source: GDD-12.2, ARCH-12
 */
export function deliverNeeds(world: World, tx: TransactionWriter, events: EventWriter): void {
  const residenceStore = world.stores.get<Residence>('residence');
  const needStore = world.stores.get<NeedStates>('needStates');
  for (const entity of residenceStore.ids()) {
    const residence = residenceStore.get(entity);
    if (!isResidence(residence)) continue;
    const states = needStore.get(entity);
    if (!isNeedStates(states)) continue;
    const specs = residence.needs ?? [];
    const updated: NeedRuntime[] = [];
    for (const state of states.needs) {
      const spec = specs.find((entry) => entry.need === state.need);
      if (spec === undefined) {
        updated.push(state);
        continue;
      }
      let delivered = 0;
      if (residence.location !== null) {
        const inventories = sharedLocationPolicy.accessibleInventories(
          world,
          residence.location,
          spec.resource,
        );
        let available = 0;
        for (const inventory of inventories) available += stock(world, inventory, spec.resource);
        delivered = state.demanded < available ? state.demanded : available;
        if (spec.type === 'resource_consumption' && delivered > 0) {
          let remaining = delivered;
          for (const inventory of inventories) {
            if (remaining <= 0) break;
            const held = stock(world, inventory, spec.resource);
            const take = held < remaining ? held : remaining;
            if (take > 0) {
              tx.atomic((builder) =>
                builder.withdraw({
                  inventory,
                  resource: spec.resource,
                  quantity: take,
                  purpose: 'population_need',
                  sink: entity,
                  reason: 'need_consumption',
                }),
              );
              remaining -= take;
            }
          }
        }
      }
      const length = spec.measurementWindowTicks > 0 ? spec.measurementWindowTicks : 1;
      const window = [...state.window, delivered].slice(-length);
      updated.push({ need: state.need, demanded: state.demanded, window });
      events.emit({
        type: delivered >= state.demanded ? 'NeedFulfilled' : 'NeedUnfulfilled',
        subjects: [entity],
        owner: null,
        location: residence.location,
        payload: { need: state.need, demanded: state.demanded, delivered },
      });
    }
    needStore.set(entity, { needs: updated });
  }
}
