/**
 * Fulfillment and satisfaction (phase 21, GDD-12.3–12.5). Fulfillment is
 * measured over the delivery window; categories aggregate their members; the
 * residence satisfaction `Z` aggregates the active categories.
 *
 * Source: GDD-12.3, GDD-12.4, GDD-12.5, INV-08
 */
import type { Int } from '../../fx/index.js';
import type { World } from '../../world/types.js';
import { isResidence } from '../population/types.js';
import type { Residence } from '../population/types.js';
import { isNeedStates } from './types.js';
import type { CategoryResult, CategorySpec, NeedRuntime } from './types.js';

const clamp1000 = (value: number): Int => (value < 0 ? 0 : value > 1000 ? 1000 : value);

const needFulfillment = (state: NeedRuntime): Int => {
  if (state.window.length === 0 || state.demanded === 0) return 1000;
  let sum = 0;
  for (const delivered of state.window) sum += delivered;
  const denominator = state.demanded * state.window.length;
  return clamp1000(Math.floor((1000 * sum) / denominator));
};

const aggregate = (category: CategorySpec, fulfillments: readonly Int[]): Int => {
  if (category.members.length === 0) return 1000;
  switch (category.mode) {
    case 'all':
    case 'minimum':
      return clamp1000(Math.min(...fulfillments));
    case 'any':
      return clamp1000(Math.max(...fulfillments));
    case 'average':
      return clamp1000(
        Math.floor(fulfillments.reduce((total, value) => total + value, 0) / fulfillments.length),
      );
    case 'weighted_score': {
      let score = 0;
      for (let index = 0; index < category.members.length; index += 1) {
        score += (category.members[index]?.weight ?? 0) * (fulfillments[index] ?? 0);
      }
      const required = category.requiredScore > 0 ? category.requiredScore : 1;
      return clamp1000(Math.floor(score / required));
    }
    case 'count': {
      const satisfied = fulfillments.filter((value) => value >= 1000).length;
      const required = category.requiredScore > 0 ? category.requiredScore : 1;
      return clamp1000(Math.floor((1000 * satisfied) / required));
    }
  }
};

/**
 * Computes fulfillment, category results, and satisfaction (phase 21).
 *
 * Source: GDD-12.3, GDD-12.5, INV-08
 */
export function updateSatisfaction(world: World): void {
  const residenceStore = world.stores.get<Residence>('residence');
  const needStore = world.stores.get('needStates');
  const satisfactionStore = world.stores.get('satisfaction');
  for (const entity of residenceStore.ids()) {
    const residence = residenceStore.get(entity);
    if (!isResidence(residence)) continue;
    const states = needStore.get(entity);
    const fulfillments = new Map<number, Int>();
    if (isNeedStates(states)) {
      for (const state of states.needs) fulfillments.set(state.need, needFulfillment(state));
    }
    const categories = residence.categories ?? [];
    const results: CategoryResult[] = [];
    for (const category of categories) {
      const memberFulfillments = category.members.map(
        (member) => fulfillments.get(member.need) ?? 1000,
      );
      results.push({
        category: category.category,
        fulfillment: aggregate(category, memberFulfillments),
      });
    }
    let z: Int;
    if (results.length === 0) {
      z = 1000;
    } else if (residence.satisfactionAggregation === 'minimum') {
      z = clamp1000(Math.min(...results.map((result) => result.fulfillment)));
    } else {
      z = clamp1000(
        Math.floor(
          results.reduce((total, result) => total + result.fulfillment, 0) / results.length,
        ),
      );
    }
    satisfactionStore.set(entity, { z, categories: results });
  }
}
