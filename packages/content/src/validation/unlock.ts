/**
 * Unlock-graph validation (CONT-11.5): an unlock depends on every unlock that
 * exposes a tier its condition counts (`population_count` /
 * `residence_population` with a `tier` argument); cycles are errors, and a
 * package whose every entity definition is gated behind an unlock has no
 * initial content. The v1 condition set has no entity-availability query, so
 * only tier edges arise (recorded limitation).
 *
 * Source: CONT-11.5
 */
import { det } from '@aesfw/core';
import type { Diagnostic } from '@aesfw/core';

import { diag } from '../diagnostics/diagnostics.js';
import type { RawDefinitions } from '../schemas/validate.js';
import type { JsonValue } from '../types.js';
import { asArray, asRecord, asString, collection } from './common.js';

const QUERY_OPS_WITH_TIERS: ReadonlySet<string> = new Set([
  'population_count',
  'residence_population',
]);
const WRAPPER_OPS: ReadonlySet<string> = new Set([
  'all',
  'any',
  'not',
  'eq',
  'ne',
  'gt',
  'ge',
  'lt',
  'le',
  'add',
  'sub',
  'mul',
  'div',
  'minimum',
  'maximum',
  'clamp',
  'sum',
  'count',
  'average',
  'minimum_of',
  'maximum_of',
]);
const AGG_OPS: ReadonlySet<string> = new Set(['sum', 'count', 'average', 'minimum', 'maximum']);

const collectTiers = (value: JsonValue | undefined, into: Set<string>): void => {
  if (value === undefined || value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const entry of value as readonly JsonValue[]) collectTiers(entry, into);
    return;
  }
  const record = value as { readonly [key: string]: JsonValue };
  const entries = Object.entries(record);
  if (entries.length !== 1) {
    for (const entry of entries) collectTiers(entry[1], into);
    return;
  }
  const op = entries[0]?.[0] ?? '';
  const inner = entries[0]?.[1];
  if (QUERY_OPS_WITH_TIERS.has(op)) {
    const args = asRecord(inner);
    const tier = asString(args?.['tier']);
    if (tier !== null) into.add(tier);
    return;
  }
  if (AGG_OPS.has(op)) {
    const of = asRecord(asRecord(inner)?.['of']);
    if (of !== null) {
      for (const queryName of Object.keys(of)) {
        if (!QUERY_OPS_WITH_TIERS.has(queryName)) continue;
        const tier = asString(asRecord(of[queryName])?.['tier']);
        if (tier !== null) into.add(tier);
      }
    }
    return;
  }
  if (op === 'sustained') {
    collectTiers(asRecord(inner)?.['condition'], into);
    return;
  }
  if (WRAPPER_OPS.has(op)) {
    collectTiers(inner, into);
  }
};

/**
 * Validates the unlock graph over a composed definition set, reporting
 * `unlock_cycle` and `no_initial_content`.
 *
 * Source: CONT-11.5
 */
export function validateUnlockGraph(definitions: RawDefinitions): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const unlockIds: string[] = [];
  const tiersByUnlock = new Map<string, Set<string>>();
  const exposesTier = new Map<string, Set<string>>();
  const exposesEntity = new Set<string>();

  for (const unlock of collection(definitions, 'unlocks')) {
    unlockIds.push(unlock.id);
    const conditionId = asString(unlock['condition']);
    const tiers = new Set<string>();
    if (conditionId !== null) {
      for (const condition of collection(definitions, 'conditions')) {
        if (condition.id !== conditionId) continue;
        collectTiers(condition['expression'], tiers);
        break;
      }
    }
    tiersByUnlock.set(unlock.id, tiers);
    const exposed = new Set<string>();
    for (const target of asArray(unlock['targets'])) {
      const record = asRecord(target);
      const type = asString(record?.['type']);
      const targetId = asString(record?.['id']);
      if (type === 'population_tier' && targetId !== null) exposed.add(targetId);
      if (type === 'entity_definition' && targetId !== null) exposesEntity.add(targetId);
    }
    exposesTier.set(unlock.id, exposed);
  }

  const successors = new Map<string, string[]>();
  for (const unlockId of unlockIds) {
    const next = new Set<string>();
    for (const tier of tiersByUnlock.get(unlockId) ?? []) {
      for (const otherId of unlockIds) {
        if (otherId === unlockId) continue;
        if (exposesTier.get(otherId)?.has(tier) === true) next.add(otherId);
      }
    }
    successors.set(unlockId, [...next].sort(det.compareStrings));
  }

  // Self-dependence: an unlock whose condition counts a tier that only it
  // exposes can never fire.
  for (const unlockId of unlockIds) {
    const tiers = [...(tiersByUnlock.get(unlockId) ?? [])];
    if (tiers.length === 0) continue;
    const own = exposesTier.get(unlockId) ?? new Set<string>();
    const selfOnly = tiers.filter((tier) => {
      if (!own.has(tier)) return false;
      return !unlockIds.some(
        (otherId) => otherId !== unlockId && exposesTier.get(otherId)?.has(tier) === true,
      );
    });
    if (selfOnly.length > 0) {
      diagnostics.push(
        diag('unlock_cycle', {
          definition: unlockId,
          args: { cycle: unlockId },
        }),
      );
    }
  }

  // Inter-unlock cycles via ascending Tarjan (unlocks are sorted by compose).
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  let counter = 0;
  const strongConnect = (start: string): void => {
    const frames: { id: string; cursor: number }[] = [{ id: start, cursor: 0 }];
    while (frames.length > 0) {
      const frame = frames[frames.length - 1];
      if (frame === undefined) break;
      const next = successors.get(frame.id) ?? [];
      if (frame.cursor === 0) {
        index.set(frame.id, counter);
        low.set(frame.id, counter);
        counter += 1;
        stack.push(frame.id);
        onStack.add(frame.id);
      }
      if (frame.cursor < next.length) {
        const target = next[frame.cursor];
        frame.cursor += 1;
        if (target === undefined) continue;
        if (!index.has(target)) frames.push({ id: target, cursor: 0 });
        else if (onStack.has(target)) {
          const targetIndex = index.get(target) ?? 0;
          if (targetIndex < (low.get(frame.id) ?? 0)) low.set(frame.id, targetIndex);
        }
        continue;
      }
      frames.pop();
      const parent = frames[frames.length - 1];
      if (parent !== undefined && (low.get(frame.id) ?? 0) < (low.get(parent.id) ?? 0)) {
        low.set(parent.id, low.get(frame.id) ?? 0);
      }
      if (low.get(frame.id) === index.get(frame.id)) {
        const component: string[] = [];
        for (;;) {
          const member = stack.pop();
          if (member === undefined) break;
          onStack.delete(member);
          component.push(member);
          if (member === frame.id) break;
        }
        component.sort(det.compareStrings);
        if (component.length > 1) {
          diagnostics.push(
            diag('unlock_cycle', {
              definition: component[0] ?? '',
              args: { cycle: component.join(',') },
            }),
          );
        }
      }
    }
  };
  for (const unlockId of unlockIds) {
    if (!index.has(unlockId)) strongConnect(unlockId);
  }

  const entities = collection(definitions, 'entity_definitions');
  if (unlockIds.length > 0 && entities.length > 0) {
    const allGated = entities.every((entity) => exposesEntity.has(entity.id));
    if (allGated) {
      diagnostics.push(
        diag('no_initial_content', {
          definition: entities[0]?.id ?? null,
          args: { gated: String(entities.length) },
        }),
      );
    }
  }
  return diagnostics;
}
