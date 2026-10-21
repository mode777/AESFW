/**
 * Resource-source advancement (GDD-9.5, GDD-10.4). An infinite source deposits
 * its rate every tick; a finite source deposits until its remaining amount is
 * exhausted.
 *
 * Source: GDD-9.5, GDD-10.4
 */
import type { ItemAmount, ResourceSource } from './types.js';

/** The output a source produces this tick and its updated state. */
export interface SourceTick {
  readonly amounts: readonly ItemAmount[];
  readonly source: ResourceSource;
}

/**
 * Advances one source by one tick (phase 12).
 *
 * Source: GDD-9.5, GDD-10.4
 */
export function advanceSource(source: ResourceSource): SourceTick {
  const amounts: ItemAmount[] = [];
  const outputs = source.outputs.map((output) => {
    if (output.remaining === null) {
      if (output.rate > 0) amounts.push({ resource: output.resource, quantity: output.rate });
      return output;
    }
    const available = output.remaining < output.rate ? output.remaining : output.rate;
    if (available > 0) amounts.push({ resource: output.resource, quantity: available });
    return { ...output, remaining: output.remaining - available };
  });
  return { amounts, source: { ...source, outputs } };
}
