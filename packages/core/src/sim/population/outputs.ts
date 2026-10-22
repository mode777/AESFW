/**
 * Population outputs (phase 26, GDD-11.3, GDD-20.2). Each residence publishes
 * its first capability output as a provider for the next tick's pools and
 * credits its resource outputs as owner income, both advanced through rate
 * accumulators (TDS-6.4). Income is scaled by the output's satisfaction curve
 * evaluated at the residence's satisfaction Z.
 *
 * Source: GDD-11.3, GDD-20.2, ARCH-13, TDS-6.4
 */
import type { EventWriter } from '../../events/event-writer.js';
import { accumulate } from '../../fx/index.js';
import { InvariantViolation } from '../../errors/invariant-violation.js';
import type { Registry } from '../../registry/types.js';
import type { TransactionWriter } from '../../tx/index.js';
import type { World } from '../../world/types.js';
import type { CapabilityProvider } from '../capabilities/index.js';
import { locationOf } from '../location.js';
import { curveMultiplier, resourceStoragePolicy } from '../economy/resources.js';
import type { Satisfaction } from '../needs/types.js';
import { readCarry, writeCarry } from './accumulators.js';
import { isPopulationGroup, isResidence } from './types.js';
import type { PopulationGroup, Residence } from './types.js';

/** The reason tag on income account transactions. */
const INCOME_REASON = 'population_income';

/** The satisfaction Z used when no satisfaction component exists yet. */
const FULL_RATE = 1000;

/**
 * Applies the outputs of every residence (phase 26): the first
 * recomputed-storage output publishes the capability provider, every
 * normal-storage output credits the location owner's account.
 *
 * Source: GDD-11.3, GDD-20.2, TDS-6.4
 */
export function applyPopulationOutputs(
  world: World,
  registry: Registry,
  tx: TransactionWriter,
  events: EventWriter,
): void {
  const residenceStore = world.stores.get<Residence>('residence');
  const groupStore = world.stores.get<PopulationGroup>('populationGroup');
  const providerStore = world.stores.get<CapabilityProvider>('capabilityProvider');
  const satisfactionStore = world.stores.get<Satisfaction>('satisfaction');
  for (const entity of residenceStore.ids()) {
    const residence = residenceStore.get(entity);
    if (!isResidence(residence)) continue;
    const group = groupStore.get(entity);
    if (!isPopulationGroup(group)) continue;
    const satisfaction = satisfactionStore.get(entity);
    const z = satisfaction?.z ?? FULL_RATE;
    let providerPublished = false;
    for (const output of residence.outputs) {
      // Unknown storage policy (registries without definition data) keeps the
      // 1.11 behavior: the output is a capability provider.
      if (resourceStoragePolicy(registry, output.resource) !== 'normal') {
        if (providerPublished) continue;
        providerPublished = true;
        const baseRate = group.count * output.ratePerPopulationPerTick;
        const carry = readCarry(world, entity, 'population_need', output.resource);
        const result = accumulate(baseRate, FULL_RATE, carry);
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
        continue;
      }
      // Normal-storage output: owner income (GDD-20.2).
      if (residence.location === null) continue;
      const owner = locationOf(world, residence.location)?.owner ?? null;
      if (owner === null) continue;
      const multiplier =
        output.satisfactionCurve === null
          ? FULL_RATE
          : curveMultiplier(registry, output.satisfactionCurve, z);
      const baseRate = group.count * output.ratePerPopulationPerTick;
      const carry = readCarry(world, entity, 'population_need', output.resource);
      const result = accumulate(baseRate, multiplier, carry);
      writeCarry(world, entity, 'population_need', output.resource, result.carry);
      if (result.amount === 0) continue;
      const applied = tx.atomic((builder) => {
        builder.account({
          owner,
          resource: output.resource,
          delta: result.amount,
          reason: INCOME_REASON,
        });
      });
      if (!applied.ok) {
        throw new InvariantViolation('income_account_rejected', {
          owner: String(owner),
          resource: String(output.resource),
          amount: result.amount,
          code: applied.error.code,
        });
      }
      events.emit({
        type: 'PopulationOutputProduced',
        subjects: [entity],
        owner,
        location: residence.location,
        payload: { resource: output.resource, amount: result.amount },
      });
    }
  }
}
