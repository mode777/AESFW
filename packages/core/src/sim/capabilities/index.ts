/**
 * `sim/capabilities` — capability supply and allocation (GDD-14, ARCH-13).
 *
 * Source: GDD-14, ARCH-13
 */
export { buildCapabilitySupply } from './supply.js';
export { allocateCapabilities } from './allocate.js';
export { allocateModel } from './models.js';
export type { CapabilityRequest } from './models.js';
export { poolKey } from './types.js';
export type {
  AllocationModel,
  CapabilityAllocation,
  CapabilityConsumer,
  CapabilityPool,
  CapabilityProvider,
  CapabilityScope,
  CapabilitySupply,
} from './types.js';
