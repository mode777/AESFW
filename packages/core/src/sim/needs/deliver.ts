/**
 * Need delivery (phase 20, GDD-12.2). Consumption needs withdraw from the
 * location's accessible inventories; availability needs only test supply;
 * capacity, coverage, and state-query needs are served by service providers
 * and condition evaluation.
 *
 * Source: GDD-12.2, GDD-12.4, ARCH-12
 */
import type { EventWriter } from '../../events/event-writer.js';
import type { DefinitionHandle, EntityId } from '../../ids/index.js';
import type { PlacementConditionEvaluator } from '../placement/types.js';
import type { TransactionWriter } from '../../tx/index.js';
import { quantityOf } from '../../tx/inventory.js';
import type { Inventory } from '../../tx/inventory.js';
import { sharedLocationPolicy } from '../../policies/inventory-access/index.js';
import type { World } from '../../world/types.js';
import { withinRadius } from '../spatial.js';
import { isResidence } from '../population/types.js';
import { throttlePermilleOf, throttleQuantity } from '../internal-logistics/throttle.js';
import type { Residence } from '../population/types.js';
import { isNeedStates } from './types.js';
import type { NeedRuntime, NeedStates, ServiceProvider } from './types.js';

const stock = (world: World, inventory: EntityId, resource: DefinitionHandle): number => {
  const component = world.stores.get<Inventory>('inventory').get(inventory);
  return component === undefined ? 0 : quantityOf(component, resource);
};

/** Narrows a `modifierSet` entry to a service provider. */
const isServiceProvider = (
  value: ServiceProvider | { readonly kind: 'storage_provider' },
): value is ServiceProvider => value.kind === 'service_provider';

/** The coverage test of the v1 spatial relation (CONT-6.12, ARCH-11). */
const covers = withinRadius;

const coverageCount = (
  world: World,
  residence: EntityId,
  providers: readonly (readonly [EntityId, ServiceProvider])[],
  service: DefinitionHandle,
  required: number,
): boolean => {
  let count = 0;
  for (const [entity, provider] of providers) {
    if (provider.service !== service) continue;
    const radius = provider.radiusCells;
    if (radius === undefined) continue;
    if (covers(world, entity, residence, radius)) {
      count += 1;
      if (count >= required) return true;
    }
  }
  return false;
};

/**
 * Delivers need resources from accessible inventories (phase 20).
 *
 * Source: GDD-12.2, ARCH-12
 */
export function deliverNeeds(
  world: World,
  tx: TransactionWriter,
  events: EventWriter,
  conditionEvaluator: PlacementConditionEvaluator = () => true,
): void {
  const residenceStore = world.stores.get<Residence>('residence');
  const needStore = world.stores.get<NeedStates>('needStates');
  const providerStore = world.stores.get<ServiceProvider | { readonly kind: 'storage_provider' }>(
    'modifierSet',
  );
  const capacityRemaining = new Map<string, number>();
  const providersAt = (location: EntityId): readonly (readonly [EntityId, ServiceProvider])[] => {
    const list: (readonly [EntityId, ServiceProvider])[] = [];
    const transform = world.stores.get<{ location: EntityId }>('transform');
    const enabled = world.stores.get<{ enabled: boolean }>('enabled');
    const locationStore = world.stores.get<{ active: boolean }>('location');
    if (locationStore.get(location)?.active === false) return list;
    for (const providerEntity of providerStore.ids()) {
      if (enabled.get(providerEntity)?.enabled === false) continue;
      const entry = providerStore.get(providerEntity);
      if (entry === undefined || !isServiceProvider(entry)) continue;
      const provider = entry;
      const at = transform.get(providerEntity)?.location;
      if (at !== location) continue;
      list.push([providerEntity, provider] as const);
    }
    return list;
  };
  for (const entity of residenceStore.ids()) {
    const residence = residenceStore.get(entity);
    if (!isResidence(residence)) continue;
    const states = needStore.get(entity);
    if (!isNeedStates(states)) continue;
    const specs = residence.needs ?? [];
    const throttle = throttlePermilleOf(world, entity);
    const locationProviders =
      residence.location !== null ? providersAt(residence.location) : ([] as const);
    const updated: NeedRuntime[] = [];
    for (const state of states.needs) {
      const spec = specs.find((entry) => entry.need === state.need);
      if (spec === undefined) {
        updated.push(state);
        continue;
      }
      let delivered = 0;
      if (
        spec.type === 'service_capacity' &&
        spec.service !== undefined &&
        residence.location !== null
      ) {
        const key = `${residence.location}:${spec.service}`;
        let remaining = capacityRemaining.get(key);
        if (remaining === undefined) {
          remaining = 0;
          for (const [, provider] of locationProviders) {
            if (provider.mode === 'capacity' && provider.service === spec.service) {
              remaining += provider.quantityPerTick ?? 0;
            }
          }
        }
        delivered = state.demanded < remaining ? state.demanded : remaining;
        capacityRemaining.set(key, remaining - delivered);
      } else if (spec.type === 'spatial_coverage' && spec.service !== undefined) {
        const required = spec.requiredDistinctProviders ?? 1;
        delivered = coverageCount(world, entity, locationProviders, spec.service, required)
          ? state.demanded
          : 0;
      } else if (spec.type === 'state_query' && spec.condition !== undefined) {
        delivered = conditionEvaluator(world, spec.condition, entity) ? state.demanded : 0;
      } else if (residence.location !== null) {
        const inventories = sharedLocationPolicy.accessibleInventories(
          world,
          residence.location,
          spec.resource,
          'population_need',
        );
        let available = 0;
        for (const inventory of inventories) available += stock(world, inventory, spec.resource);
        delivered = state.demanded < available ? state.demanded : available;
        if (spec.type === 'resource_consumption') {
          delivered = throttleQuantity(delivered, throttle);
        }
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
