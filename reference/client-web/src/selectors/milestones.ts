/**
 * The client milestone tracker (REF-12.6): five opening-script milestones as
 * predicates over projected facts. Completion is client-local and per save slot
 * (07 §14.5); discarding it never affects the session (PIC-16).
 *
 * Source: REF-12.6, PIC-16
 */
import type { LocationSummaryDto, SnapshotDto } from '@aesfw/protocol';

import { STORAGE_KEY } from '../store/storage.js';
import type { StorageLike } from '../store/storage.js';

/** The browser storage, or `null` when unavailable (node, private mode). */
const browserStorage = (): StorageLike | null => {
  try {
    return (globalThis as { localStorage?: StorageLike }).localStorage ?? null;
  } catch {
    return null;
  }
};

/** One milestone (REF-12.6). */
export interface Milestone {
  readonly id: string;
  readonly description: string;
  readonly complete: boolean;
}

/** A milestone definition with its predicate. */
export interface MilestoneDefinition {
  readonly id: string;
  readonly description: string;
  readonly achieved: (facts: MilestoneFacts) => boolean;
}

/** The projected facts a milestone predicate may read (REF-12.6). */
export interface MilestoneFacts {
  readonly projection: SnapshotDto | null;
  readonly summaries: readonly LocationSummaryDto[];
}

const populationOf = (facts: MilestoneFacts): number => {
  let total = 0;
  for (const summary of facts.summaries) {
    total += summary.population_by_tier?.['ref.tier.population.s1'] ?? 0;
  }
  return total;
};

/**
 * The default five milestones (REF-12.6): the opening script's first steps.
 * Predicates read projected facts only.
 *
 * Source: REF-12.6
 */
export const DEFAULT_MILESTONES: readonly MilestoneDefinition[] = [
  {
    id: 'residence',
    description: 'Build a residence',
    achieved: (facts) =>
      (facts.projection?.entities ?? []).some(
        (entity) => entity.definition_id?.includes('residence') === true,
      ),
  },
  {
    id: 'producer',
    description: 'Build a producer',
    achieved: (facts) =>
      (facts.projection?.entities ?? []).some((entity) => entity.production !== undefined),
  },
  {
    id: 'population',
    description: 'Reach 50 inhabitants',
    achieved: (facts) => populationOf(facts) >= 50,
  },
  {
    id: 'advancement',
    description: 'Advance a residence to S2',
    achieved: (facts) =>
      (facts.projection?.entities ?? []).some(
        (entity) => entity.definition_id?.includes('residence_s2') === true,
      ),
  },
  {
    id: 'route',
    description: 'Run a transport route',
    achieved: (facts) =>
      (facts.projection?.entities ?? []).some((entity) => entity.transport !== undefined),
  },
];

/** The milestone list of a projection with completion merged in (REF-12.6). */
export function milestones(
  facts: MilestoneFacts,
  completed: readonly string[],
): readonly Milestone[] {
  return DEFAULT_MILESTONES.map((milestone) => ({
    id: milestone.id,
    description: milestone.description,
    complete: completed.includes(milestone.id) || milestone.achieved(facts),
  }));
}

/** The milestones that just became complete (REF-12.6). */
export const newlyComplete = (
  facts: MilestoneFacts,
  completed: readonly string[],
): readonly string[] =>
  DEFAULT_MILESTONES.filter(
    (milestone) => !completed.includes(milestone.id) && milestone.achieved(facts),
  ).map((milestone) => milestone.id);

/**
 * The storage key of one save slot's milestones (design D3/D5). A save slot
 * without an id falls back to `slot.default`, so a nameless session still
 * persists its tracker without colliding with the view settings.
 *
 * Source: REF-12.6, REF-14.5
 */
export const milestoneKey = (slotId: string | null): string =>
  `${STORAGE_KEY}:milestones:${slotId ?? 'slot.default'}`;

/** Reads the completed milestone ids of one slot (REF-12.6). */
export function readMilestones(
  slotId: string | null,
  storage: StorageLike | null = browserStorage(),
): readonly string[] {
  if (storage === null) return [];
  try {
    const raw = storage.getItem(milestoneKey(slotId));
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === 'string')
      : [];
  } catch {
    return [];
  }
}

/** Writes the completed milestone ids of one slot (REF-12.6). */
export function writeMilestones(
  slotId: string | null,
  completed: readonly string[],
  storage: StorageLike | null = browserStorage(),
): void {
  if (storage === null) return;
  try {
    storage.setItem(milestoneKey(slotId), JSON.stringify(completed));
  } catch {
    // Client-local and disposable (PIC-16).
  }
}
