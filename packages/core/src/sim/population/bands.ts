/**
 * Satisfaction bands (phase 22, GDD-12.6, CONT-6.19). A residence's Z selects
 * exactly one band of its tier's band table; the band's effects are resolved
 * into authoritative `bandState` so phases 23 and 26 consume them without
 * re-reading content.
 *
 * Source: GDD-12.6, CONT-6.19, INV-09
 */
import type { Int } from '../../fx/index.js';
import { stringId } from '../../ids/index.js';
import type { DefinitionHandle } from '../../ids/index.js';
import type { Registry } from '../../registry/types.js';
import type { World } from '../../world/types.js';
import { isResidence } from './types.js';
import type { Residence } from './types.js';
import type { Satisfaction } from '../needs/types.js';
import { resolveGrowthPolicy } from './growth.js';
import type { Growth } from './growth.js';

/** An output multiplier of a band (GDD-12.6). */
export type BandMultiplier = {
  readonly resource: DefinitionHandle;
  readonly value: Int;
};

/** The resolved effects of one band (GDD-12.6). */
export type BandEffects = {
  readonly advancementEnabled: boolean;
  readonly growthOverride: Growth | null;
  readonly outputMultipliers: readonly BandMultiplier[];
  readonly declineGraceTicks: Int | null;
  readonly declineTransition: DefinitionHandle | null;
};

/** A residence's satisfaction-band state (phase 22, GDD-12.6). */
export type BandState = {
  readonly band: DefinitionHandle;
  readonly bandIndex: Int;
  readonly declineTicks: Int;
  readonly advancementEnabled: boolean;
  readonly growthOverride: Growth | null;
  readonly outputMultipliers: readonly BandMultiplier[];
  readonly declineGraceTicks: Int | null;
  readonly declineTransition: DefinitionHandle | null;
};

/** A band table parsed from definition data (CONT-6.19). */
export type BandTable = {
  readonly bands: readonly { readonly min: Int; readonly effects: BandEffects }[];
};

const asRecord = (value: unknown): { readonly [key: string]: unknown } | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as { readonly [key: string]: unknown })
    : null;

const asArray = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

const asInt = (value: unknown): Int => (typeof value === 'number' ? value : 0);

/**
 * Parses a band table from its raw definition data (CONT-6.19). An
 * unparseable table yields `null`.
 *
 * Source: CONT-6.19, GDD-12.6
 */
export function bandTableOf(registry: Registry, handle: DefinitionHandle): BandTable | null {
  const data = asRecord(registry.definitionDataOf?.('band', handle) ?? null);
  if (data === null) return null;
  const bands = asArray(data['bands']).map((entry) => {
    const band = asRecord(entry) ?? {};
    let advancementEnabled = false;
    let growthOverride: Growth | null = null;
    let declineGraceTicks: Int | null = null;
    let declineTransition: DefinitionHandle | null = null;
    const outputMultipliers: BandMultiplier[] = [];
    for (const effectEntry of asArray(band['effects'])) {
      const effect = asRecord(effectEntry);
      if (effect === null) continue;
      if (effect['type'] === 'growth') {
        const policyId = effect['policy'];
        const policy =
          typeof policyId === 'string'
            ? registry.handleOf?.('growthPolicy', stringId(policyId))
            : null;
        if (policy !== null && policy !== undefined) {
          growthOverride = resolveGrowthPolicy(registry, policy);
        }
      } else if (effect['type'] === 'output_multiplier') {
        const resourceId = effect['resource'];
        const resource =
          typeof resourceId === 'string'
            ? registry.handleOf?.('resource', stringId(resourceId))
            : null;
        if (resource !== null && resource !== undefined) {
          outputMultipliers.push({ resource, value: asInt(effect['value']) });
        }
      } else if (effect['type'] === 'enable_advancement') {
        advancementEnabled = true;
      } else if (effect['type'] === 'trigger_decline') {
        declineGraceTicks = asInt(effect['grace_ticks']);
        const transitionId = effect['transition'];
        declineTransition =
          typeof transitionId === 'string'
            ? (registry.handleOf?.('transition', stringId(transitionId)) ?? null)
            : null;
      }
    }
    outputMultipliers.sort((left, right) => left.resource - right.resource);
    return {
      min: asInt(band['min']),
      effects: {
        advancementEnabled,
        growthOverride,
        outputMultipliers,
        declineGraceTicks,
        declineTransition,
      },
    };
  });
  if (bands.length === 0) return null;
  return { bands };
}

/**
 * Selects the band index for `z`: the highest band whose `min` is at or below
 * `z` (CONT-6.19). Returns `null` when the table is empty.
 *
 * Source: GDD-12.6
 */
export function bandIndexFor(table: BandTable, z: Int): number | null {
  let selected: number | null = null;
  for (let index = 0; index < table.bands.length; index += 1) {
    const band = table.bands[index];
    if (band === undefined) continue;
    if (z >= band.min) selected = index;
  }
  return selected;
}

/**
 * Updates the satisfaction-band state of every residence (phase 22). The
 * decline grace counter resets when the band changes and otherwise advances
 * while the band carries `trigger_decline`.
 *
 * Source: GDD-12.6, INV-09
 */
export function updateBands(world: World, registry: Registry): void {
  const residenceStore = world.stores.get<Residence>('residence');
  const satisfactionStore = world.stores.get<Satisfaction>('satisfaction');
  const bandStore = world.stores.get<BandState>('bandState');
  for (const entity of residenceStore.ids()) {
    const residence = residenceStore.get(entity);
    if (!isResidence(residence)) continue;
    const bands = residence.bands;
    if (bands === undefined) continue;
    const satisfaction = satisfactionStore.get(entity);
    if (satisfaction === undefined) continue;
    const table = bandTableOf(registry, bands);
    if (table === null) continue;
    const index = bandIndexFor(table, satisfaction.z);
    if (index === null) continue;
    const band = table.bands[index];
    if (band === undefined) continue;
    const previous = bandStore.get(entity);
    const sameBand =
      previous !== undefined && previous.bandIndex === index && previous.band === bands;
    const grace = band.effects.declineGraceTicks;
    const declineTicks = grace !== null ? (sameBand ? previous.declineTicks + 1 : 1) : 0;
    bandStore.set(entity, {
      band: bands,
      bandIndex: index,
      declineTicks,
      advancementEnabled: band.effects.advancementEnabled,
      growthOverride: band.effects.growthOverride,
      outputMultipliers: band.effects.outputMultipliers,
      declineGraceTicks: band.effects.declineGraceTicks,
      declineTransition: band.effects.declineTransition,
    });
  }
}
