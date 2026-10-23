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
import type { Registry } from '../../registry/types.js';
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

/** Parses a growth policy from its raw definition data (CONT-6.14). */
export function resolveGrowthPolicy(registry: Registry, policy: DefinitionHandle): Growth | null {
  const data = registry.definitionDataOf?.('growthPolicy', policy);
  if (data === null || data === undefined || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }
  const record = data as { readonly [key: string]: unknown };
  const asRecord = (value: unknown): { readonly [key: string]: unknown } | null =>
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as { readonly [key: string]: unknown })
      : null;
  const asInt = (value: unknown, fallback: number): Int =>
    typeof value === 'number' ? value : fallback;
  const increase = asRecord(record['increase']);
  const decrease = asRecord(record['decrease']);
  return {
    policy,
    intervalTicks: asInt(record['interval_ticks'], 1),
    increase:
      increase === null
        ? null
        : {
            quantity: asInt(increase['quantity'], 0),
            condition: { minSatisfaction: 800, maxSatisfaction: null, requireCapacity: true },
          },
    decrease:
      decrease === null
        ? null
        : {
            quantity: asInt(decrease['quantity'], 0),
            condition: { minSatisfaction: null, maxSatisfaction: 250, requireCapacity: false },
          },
  };
}

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
  const bandStore = world.stores.get<{ readonly growthOverride: Growth | null }>('bandState');
  for (const entity of growthStore.ids()) {
    const baseGrowth = growthStore.get(entity);
    if (baseGrowth === undefined) continue;
    // A satisfaction band's growth effect replaces the tier policy while the
    // residence is in that band (GDD-12.6).
    const growth = bandStore.get(entity)?.growthOverride ?? baseGrowth;
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
