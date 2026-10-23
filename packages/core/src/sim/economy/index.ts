/**
 * `sim/economy` — the owner balance model runtime (GDD-7.5, GDD-20).
 *
 * Source: GDD-7.5, GDD-20
 */
export { applyMaintenance, dueLines, isCharging } from './maintenance.js';
export {
  applyDeficitPolicy,
  compareBalance,
  dueForResource,
  ownerIncomePerTick,
  ownerMaintenancePerTick,
  ownerNetRate,
  resolveDeficitPolicies,
} from './deficit.js';
export type { BalanceComparison, DeficitPolicySpec, ResumePolicy } from './deficit.js';
export { curveMultiplier, resourceStoragePolicy } from './resources.js';
export type { ChargePolicy, Maintenance, MaintenanceInput, ShortagePolicy } from './types.js';
