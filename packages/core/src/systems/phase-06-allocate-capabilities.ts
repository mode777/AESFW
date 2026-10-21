/**
 * Phase 06 — allocateCapabilities (TDS-11.1, ARCH-13). Allocates each pool to
 * its consumers and publishes allocation components.
 *
 * Source: TDS-11.1, ARCH-13, GDD-14.2, INV-05
 */
import { allocateCapabilities, buildCapabilitySupply } from '../sim/capabilities/index.js';
import type { CapabilitySupply } from '../sim/capabilities/index.js';
import type { SystemDescriptor } from '../pipeline/types.js';

const supplyOf = (
  scratch: unknown,
  world: Parameters<typeof buildCapabilitySupply>[0],
): CapabilitySupply =>
  scratch instanceof Map ? (scratch as CapabilitySupply) : buildCapabilitySupply(world);

export const phase06AllocateCapabilities: SystemDescriptor = {
  phase: 6,
  name: 'allocateCapabilities',
  reads: ['capabilityProvider', 'capabilityConsumer'],
  writes: ['capabilityAllocation'],
  run: (ctx) => {
    const supply = supplyOf(ctx.scratch.values.get('capabilitySupply'), ctx.world);
    allocateCapabilities(ctx.world, supply, ctx.events);
  },
};
