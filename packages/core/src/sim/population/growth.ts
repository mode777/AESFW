/**
 * Population growth (phase 23, GDD-11.4). A residence's satisfaction and
 * available capacity select an increase or decrease step; the step quantity is
 * accumulated across the interval so the change is spread over ticks.
 *
 * Source: GDD-11.4, INV-07
 */
import type { EventWriter } from '../../events/event-writer.js';
import type { Int } from '../../fx/index.js';
import type { DefinitionHandle } from '../../ids/index.js';
import type { World } from '../../world/types.js';
import { readCarry, writeCarry } from './accumulators.js';
import { isPopulationGroup } from './types.js';
import type { PopulationGroup } from './types.js';

/** A resolved growth condition (v1). */
export type GrowthCondition = {
  readonly minSatisfaction: Int | null;
  readonly maxSatisfaction: Int | null;
  readonly requireCapacity: boolean;
};

/** A growth step. */
export type GrowthStep = {
  readonly quantity: Int;
  readonly condition: GrowthCondition | null;
};

/** A growth component. */
export type Growth = {
  readonly policy: DefinitionHandle;
  readonly intervalTicks: Int;
  readonly increase: GrowthStep | null;
  readonly decrease: GrowthStep | null;
};

const conditionMet = (
  condition: GrowthCondition | null,
  z: Int,
  group: PopulationGroup,
): boolean => {
  if (condition === null) return true;
  if (condition.minSatisfaction !== null && z < condition.minSatisfaction) return false;
  if (condition.maxSatisfaction !== null && z >= condition.maxSatisfaction) return false;
  if (condition.requireCapacity && group.count >= group.capacity) return false;
  return true;
};

/**
 * Applies growth and decline to every residence (phase 23).
 *
 * Source: GDD-11.4, INV-07
 */
export function updatePopulation(world: World, events: EventWriter): void {
  const growthStore = world.stores.get<Growth>('growth');
  const groupStore = world.stores.get<PopulationGroup>('populationGroup');
  const satisfactionStore = world.stores.get('satisfaction');
  for (const entity of growthStore.ids()) {
    const growth = growthStore.get(entity);
    if (growth === undefined) continue;
    const group = groupStore.get(entity);
    if (!isPopulationGroup(group)) continue;
    const z = (satisfactionStore.get(entity) as { readonly z?: number } | undefined)?.z ?? 1000;
    let direction = 0;
    let step: GrowthStep | null = null;
    if (
      growth.increase !== null &&
      conditionMet(growth.increase.condition, z, group) &&
      group.count < group.capacity
    ) {
      direction = 1;
      step = growth.increase;
    } else if (
      growth.decrease !== null &&
      conditionMet(growth.decrease.condition, z, group) &&
      group.count > 0
    ) {
      direction = -1;
      step = growth.decrease;
    }
    if (step === null) continue;
    const carry = readCarry(world, entity, 'population_transition', group.tier);
    const numerator = carry + step.quantity;
    const interval = growth.intervalTicks > 0 ? growth.intervalTicks : 1;
    const amount = Math.floor(numerator / interval);
    writeCarry(world, entity, 'population_transition', group.tier, numerator % interval);
    if (amount <= 0) continue;
    const next = Math.max(0, Math.min(group.capacity, group.count + direction * amount));
    if (next !== group.count) {
      groupStore.set(entity, { ...group, count: next });
      events.emit({
        type: 'PopulationChanged',
        subjects: [entity],
        owner: null,
        location: null,
        payload: { count: next, previous: group.count },
      });
    }
  }
}
