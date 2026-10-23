/**
 * Resource-source advancement (GDD-9.5, GDD-10.4). An infinite source deposits
 * its rate every tick; a finite source deposits until its remaining amount is
 * exhausted; a regenerating deposit replenishes after each deposit; an
 * area-dependent source scales its rate by a location property in permille.
 *
 * Source: GDD-9.5, GDD-10.4, GDD-6.5
 */
import { mulDiv } from '../../fx/index.js';
import type { ItemAmount, ResourceSource } from './types.js';

/** The output a source produces this tick and its updated state. */
export interface SourceTick {
  readonly amounts: readonly ItemAmount[];
  readonly source: ResourceSource;
}

/**
 * Advances one source by one tick (phase 12). `scalePermille` is the referenced
 * location property value for an area-dependent source, or `1000`.
 *
 * Source: GDD-9.5, GDD-10.4, GDD-6.5
 */
export function advanceSource(
  source: ResourceSource,
  scalePermille = 1000,
  throttlePermille = 1000,
): SourceTick {
  const amounts: ItemAmount[] = [];
  const outputs = source.outputs.map((output) => {
    const scaled =
      source.policy === 'area_dependent'
        ? mulDiv(output.rate, scalePermille, 1000, 'floor')
        : output.rate;
    const rate =
      throttlePermille >= 1000 ? scaled : mulDiv(scaled, throttlePermille, 1000, 'floor');
    if (output.remaining === null) {
      if (rate > 0) amounts.push({ resource: output.resource, quantity: rate });
      return output;
    }
    const available = output.remaining < rate ? output.remaining : rate;
    if (available > 0) amounts.push({ resource: output.resource, quantity: available });
    const depleted = output.remaining - available;
    if (source.policy === 'regenerating_deposit' && output.regeneration !== undefined) {
      const replenished = depleted + output.regeneration;
      const capped =
        output.maximum !== undefined && replenished > output.maximum ? output.maximum : replenished;
      return { ...output, remaining: capped };
    }
    return { ...output, remaining: depleted };
  });
  return { amounts, source: { ...source, outputs } };
}
