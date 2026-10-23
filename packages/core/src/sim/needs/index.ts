/**
 * `sim/needs` — demand, delivery, fulfillment, and satisfaction (GDD-12).
 *
 * Source: GDD-12
 */
export { calculatePopulationDemand } from './demand.js';
export { deliverNeeds } from './deliver.js';
export { updateSatisfaction } from './fulfillment.js';
export { isNeedStates } from './types.js';
export { applyServiceProvider } from './providers.js';
export type {
  CategoryMember,
  CategoryMode,
  CategoryResult,
  CategorySpec,
  NeedRuntime,
  NeedSpec,
  NeedStates,
  NeedType,
  ServiceProvider,
  Satisfaction,
  SatisfactionAggregation,
} from './types.js';
