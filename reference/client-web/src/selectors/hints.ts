/**
 * Contextual hints (REF-12.6): a short, localized explanation of a block
 * reason or a rejected command, with arguments filled from the DTO. Hints
 * explain state; they never propose new mechanics or hide the underlying data.
 *
 * Source: REF-12.6, PIC-7
 */
import type { EntityDetailDto } from '@aesfw/protocol';

import type { I18n } from '../i18n/index.js';

/** The hint keys the presentation package may provide (REF-12.6). */
export const HINT_KEYS: Readonly<Record<string, string>> = {
  missing_input: 'hint.missing_input',
  missing_capability: 'hint.missing_capability',
  missing_throughput: 'hint.missing_throughput',
  throughput_throttled: 'hint.throughput_throttled',
  missing_inventory_access: 'hint.missing_inventory_access',
  entity_disabled: 'hint.entity_disabled',
  paused_by_deficit: 'hint.paused_by_deficit',
  invalid_recipe: 'hint.invalid_recipe',
  condition_false: 'hint.condition_false',
  location_inactive: 'hint.location_inactive',
  not_enough_resources: 'hint.not_enough_resources',
  insufficient_capacity: 'hint.insufficient_capacity',
  occupied: 'hint.occupied',
  not_buildable: 'hint.not_buildable',
};

/** A rendered hint. */
export interface Hint {
  readonly key: string;
  readonly text: string;
}

/**
 * The hint of a block reason (REF-12.6). An unknown reason falls back to the
 * raw code, which keeps the client honest about what the host reported.
 *
 * Source: REF-12.6, PIC-7
 */
export function hintForReason(reason: string, i18n: I18n): Hint {
  const key = HINT_KEYS[reason];
  if (key === undefined) return { key: reason, text: reason };
  const text = i18n.t(key);
  return { key, text: text === key ? reason : text };
}

/**
 * The hints of an entity (REF-12.6): one per block reason, then the deficit
 * pause. Hints are ordered by the host's block-reason order so they are stable.
 *
 * Source: REF-12.6
 */
export function hintsForEntity(detail: EntityDetailDto, i18n: I18n): readonly Hint[] {
  const hints = detail.block_reasons.map((reason) => hintForReason(reason, i18n));
  if (detail.paused_by_deficit === true) hints.push(hintForReason('paused_by_deficit', i18n));
  return hints;
}

/**
 * The hint of a rejected command (REF-13.4): the first error code explained,
 * or `null` when the command was accepted.
 *
 * Source: REF-13.4, REF-12.6
 */
export function hintForRejection(
  errors: readonly { readonly code: string }[],
  i18n: I18n,
): Hint | null {
  const first = errors[0];
  return first === undefined ? null : hintForReason(first.code, i18n);
}
