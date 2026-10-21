/**
 * Population capability outputs (phase 26, GDD-11.3). Each residence publishes
 * a capability provider for the next tick's pools, advanced through a rate
 * accumulator (TDS-6.4).
 *
 * Source: GDD-11.3, ARCH-13, TDS-6.4
 */
import type { EventWriter } from '../../events/event-writer.js';
import { accumulate } from '../../fx/index.js';
import type { World } from '../../world/types.js';
import type { CapabilityProvider } from '../capabilities/index.js';
import { readCarry, writeCarry } from './accumulators.js';
import { isPopulationGroup, isResidence } from './types.js';
import type { PopulationGroup, Residence } from './types.js';

/**
 * Publishes the capability outputs of every residence (phase 26).
 *
 * Source: GDD-11.3, TDS-6.4
 */
export function applyPopulationOutputs(world: World, events: EventWriter): void {
  const residenceStore = world.stores.get<Residence>('residence');
  const groupStore = world.stores.get<PopulationGroup>('populationGroup');
  const providerStore = world.stores.get<CapabilityProvider>('capabilityProvider');
  for (const entity of residenceStore.ids()) {
    const residence = residenceStore.get(entity);
    if (!isResidence(residence)) continue;
    const group = groupStore.get(entity);
    if (!isPopulationGroup(group)) continue;
    const output = residence.outputs[0];
    if (output === undefined) continue;
    const baseRate = group.count * output.ratePerPopulationPerTick;
    const carry = readCarry(world, entity, 'population_need', output.resource);
    const result = accumulate(baseRate, 1000, carry);
    writeCarry(world, entity, 'population_need', output.resource, result.carry);
    providerStore.set(entity, {
      capability: output.resource,
      scope: output.scope,
      location: output.scope === 'location' ? residence.location : null,
      rate: result.amount,
    });
    if (result.amount > 0) {
      events.emit({
        type: 'PopulationOutputProduced',
        subjects: [entity],
        owner: null,
        location: residence.location,
        payload: { resource: output.resource, amount: result.amount },
      });
    }
  }
}
