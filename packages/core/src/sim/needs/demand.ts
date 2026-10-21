/**
 * Population demand (phase 08, GDD-12.4). Demand is computed from the
 * population count as it was at the end of the previous tick.
 *
 * Source: GDD-12.4, GDD-4.2
 */
import type { EventWriter } from '../../events/event-writer.js';
import { mul, mulDiv } from '../../fx/index.js';
import type { World } from '../../world/types.js';
import { isPopulationGroup, isResidence } from '../population/types.js';
import type { PopulationGroup, Residence } from '../population/types.js';
import { isNeedStates } from './types.js';
import type { NeedRuntime, NeedStates } from './types.js';

/**
 * Computes the demand of every residence (phase 08).
 *
 * Source: GDD-12.4
 */
export function calculatePopulationDemand(world: World, events: EventWriter): void {
  const residenceStore = world.stores.get<Residence>('residence');
  const groupStore = world.stores.get<PopulationGroup>('populationGroup');
  const needStore = world.stores.get<NeedStates>('needStates');
  for (const entity of residenceStore.ids()) {
    const residence = residenceStore.get(entity);
    if (!isResidence(residence)) continue;
    const group = groupStore.get(entity);
    if (!isPopulationGroup(group)) continue;
    const previous = needStore.get(entity);
    const needs: NeedRuntime[] = [];
    for (const spec of residence.needs ?? []) {
      const base = mul(spec.quantityPerPopulationPerTick, group.count);
      const demanded = mulDiv(base, residence.consumptionFactor, 1000, 'floor');
      const window =
        (isNeedStates(previous)
          ? previous.needs.find((state) => state.need === spec.need)?.window
          : undefined) ?? [];
      needs.push({ need: spec.need, demanded, window });
      if (demanded > 0) {
        events.emit({
          type: 'NeedDemandChanged',
          subjects: [entity],
          owner: null,
          location: residence.location,
          payload: { need: spec.need, demanded },
        });
      }
    }
    needStore.set(entity, { needs });
  }
}
