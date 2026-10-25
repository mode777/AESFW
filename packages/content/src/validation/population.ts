/**
 * Population-graph validation (CONT-11.5): advancement transitions are
 * reachable from a root tier unless explicitly `optional`. Roots are tiers
 * with no incoming advancement edge or tiers inhabited by a residence
 * definition. Decline transitions (listed in a tier's `decline_transitions`)
 * are not advancement edges.
 *
 * Source: CONT-11.5
 */
import type { Diagnostic } from '@aesfw/core';

import { diag } from '../diagnostics/diagnostics.js';
import type { RawDefinitions } from '../schemas/validate.js';
import { asArray, collection } from './common.js';

/**
 * Validates population-graph reachability over a composed definition set,
 * reporting `transition_unreachable`.
 *
 * Source: CONT-11.5
 */
export function validatePopulationGraph(definitions: RawDefinitions): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const declineIds = new Set<string>();
  const tiers: string[] = [];
  for (const tier of collection(definitions, 'population_tiers')) {
    tiers.push(tier.id);
    for (const entry of asArray(tier['decline_transitions'])) {
      if (typeof entry === 'string') declineIds.add(entry);
    }
  }

  const advancement: { id: string; source: string; target: string }[] = [];
  for (const transition of collection(definitions, 'transitions')) {
    if (declineIds.has(transition.id)) continue;
    const source = transition['source_tier'];
    const target = transition['target_tier'];
    if (typeof source !== 'string' || typeof target !== 'string') continue;
    advancement.push({ id: transition.id, source, target });
  }

  const inhabited = new Set<string>();
  for (const entity of collection(definitions, 'entity_definitions')) {
    const tier = entity['components'];
    if (tier === null || typeof tier !== 'object') continue;
    const residence = (tier as { readonly [key: string]: unknown })['residence'];
    if (residence === null || typeof residence !== 'object') continue;
    const tierId = (residence as { readonly [key: string]: unknown })['population_tier'];
    if (typeof tierId === 'string') inhabited.add(tierId);
  }

  // Roots: tiers a residence definition can instantiate — every inhabited
  // tier is by construction reachable. Advancement closes over them.
  const reachable = new Set<string>();
  const queue: string[] = [];
  for (const tier of inhabited) {
    reachable.add(tier);
    queue.push(tier);
  }
  const bySource = new Map<string, string[]>();
  for (const edge of advancement) {
    const existing = bySource.get(edge.source);
    if (existing === undefined) bySource.set(edge.source, [edge.target]);
    else existing.push(edge.target);
  }
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) continue;
    for (const target of bySource.get(current) ?? []) {
      if (reachable.has(target)) continue;
      reachable.add(target);
      queue.push(target);
    }
  }

  for (const edge of advancement) {
    if (reachable.has(edge.source)) continue;
    if (transitionOptional(definitions, edge.id)) continue;
    diagnostics.push(
      diag('transition_unreachable', {
        definition: edge.id,
        args: { source_tier: edge.source },
      }),
    );
  }
  return diagnostics;
}

const transitionOptional = (definitions: RawDefinitions, id: string): boolean => {
  for (const transition of collection(definitions, 'transitions')) {
    if (transition.id !== id) continue;
    return transition['optional'] === true;
  }
  return false;
};
