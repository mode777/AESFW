/**
 * News, hints, and milestones (REF-12.6).
 *
 * Source: REF-12.6, PIC-16
 */
import { describe, expect, it } from 'vitest';

import type { EventDto, SnapshotDto } from '@aesfw/protocol';

import { createI18n } from '../i18n/index.js';
import { hintForReason, hintForRejection, hintsForEntity } from './hints.js';
import { focusSubject, newsCarry, newsEntries, NEWS_LIMIT } from './news.js';
import {
  DEFAULT_MILESTONES,
  milestoneKey,
  milestones,
  newlyComplete,
  readMilestones,
  writeMilestones,
} from './milestones.js';
import type { StorageLike } from '../store/storage.js';

const i18n = createI18n({
  'hint.missing_input': 'Waiting for input',
  'hint.paused_by_deficit': 'Paused by the deficit policy',
});

const event = (
  tick: number,
  sequence: number,
  type: string,
  subjects: number[] = [],
): EventDto => ({
  session_id: 's',
  tick,
  sequence,
  type,
  subjects,
  payload: { entity: subjects[0] ?? 0 },
});

const projection = (blocked: readonly number[]): SnapshotDto => ({
  session_id: 's',
  tick: 10,
  revision: 0,
  configuration_checksum: 'c',
  owners: [],
  locations: [],
  entities: blocked.map((entityId) => ({
    entity_id: entityId,
    production: {
      state: 'blocked',
      progress: 0,
      progress_scale: 1,
      block_reasons: ['missing_input'],
    },
  })),
});

describe('[REF-12.6] news rail', () => {
  it('[REF-12.6] newsworthy events are listed newest first and bounded', () => {
    const events = Array.from({ length: NEWS_LIMIT + 10 }, (_, index) =>
      event(index, index, 'ConstructionCompleted', [index]),
    );
    const entries = newsEntries(events, null);
    expect(entries).toHaveLength(NEWS_LIMIT);
    expect(entries[0]?.tick).toBe(events.length - 1);
    expect(entries[0]?.warning).toBe(false);
  });

  it('[REF-12.6] non-newsworthy events stay out of the rail', () => {
    expect(newsEntries([event(1, 0, 'CommandApplied')], null)).toEqual([]);
  });

  it('[REF-12.6] block onset is emitted once and re-armed after it clears', () => {
    const first = newsEntries([], projection([4]));
    expect(first).toHaveLength(1);
    expect(first[0]?.warning).toBe(true);
    const carry = newsCarry(projection([4]));
    expect(newsEntries([], projection([4]), carry)).toEqual([]);
    // The block clears, so the next onset reports again.
    const rearmed = newsCarry(projection([]));
    expect(newsEntries([], projection([4]), rearmed)).toHaveLength(1);
  });

  it('[REF-12.6] a warning family carries the warning mark and a subject', () => {
    const entries = newsEntries([event(2, 0, 'MaintenanceShortage', [9])], null);
    expect(entries[0]?.warning).toBe(true);
    // An entity absent from the projection is treated as a location subject
    // (news can arrive before its snapshot entry).
    expect(focusSubject(entries[0]!, projection([]))).toEqual({ entity: 9, location: 9 });
  });
});

describe('[REF-12.6] contextual hints', () => {
  it('[REF-12.6] known reasons resolve to localized text and unknown ones stay honest', () => {
    expect(hintForReason('missing_input', i18n).text).toBe('Waiting for input');
    expect(hintForReason('mystery', i18n).text).toBe('mystery');
  });

  it('[REF-12.6] an entity hint list follows block order and adds the deficit pause', () => {
    const hints = hintsForEntity(
      {
        entity_id: 3,
        definition_id: 'x',
        lifecycle: 'blocked',
        enabled: true,
        paused_by_deficit: true,
        available_commands: [],
        block_reasons: ['missing_input', 'unknown_reason'],
      },
      i18n,
    );
    expect(hints.map((hint) => hint.text)).toEqual([
      'Waiting for input',
      'unknown_reason',
      'Paused by the deficit policy',
    ]);
  });

  it('[REF-13.4] a rejection hint explains the first error code', () => {
    expect(hintForRejection([{ code: 'missing_input' }], i18n)?.text).toBe('Waiting for input');
    expect(hintForRejection([], i18n)).toBeNull();
  });
});

describe('[REF-12.6] milestones', () => {
  const facts = (entities: SnapshotDto['entities'], summaries: { tier: number }[] = []) => ({
    projection: { ...projection([]), entities },
    summaries: summaries.map((entry, index) => ({
      entity_id: index + 1,
      knowledge: 'established',
      active: true,
      population_by_tier: { 'ref.tier.population.s1': entry.tier },
    })),
  });

  it('[REF-12.6] the default five milestones start locked', () => {
    expect(DEFAULT_MILESTONES).toHaveLength(5);
    expect(milestones(facts([]), []).every((entry) => !entry.complete)).toBe(true);
  });

  it('[REF-12.6] projected facts complete their milestone', () => {
    const complete = milestones(
      facts(
        [
          { entity_id: 1, definition_id: 'ref.tier.entity.residence_s1' },
          { entity_id: 2, definition_id: 'ref.tier.entity.residence_s2' },
        ],
        [{ tier: 30 }, { tier: 25 }],
      ),
      [],
    );
    expect(complete.find((entry) => entry.id === 'residence')?.complete).toBe(true);
    expect(complete.find((entry) => entry.id === 'population')?.complete).toBe(true);
    expect(complete.find((entry) => entry.id === 'advancement')?.complete).toBe(true);
    expect(complete.find((entry) => entry.id === 'route')?.complete).toBe(false);
  });

  it('[REF-12.6] newly complete ids are returned once', () => {
    const model = facts([{ entity_id: 1, definition_id: 'ref.tier.entity.residence_s1' }]);
    expect(newlyComplete(model, [])).toContain('residence');
    expect(newlyComplete(model, ['residence'])).not.toContain('residence');
  });

  it('[PIC-16] milestones persist per save slot and never throw', () => {
    const values: Record<string, string> = {};
    const storage: StorageLike = {
      getItem: (key) => values[key] ?? null,
      setItem: (key, value) => {
        values[key] = value;
      },
    };
    writeMilestones('slot.a', ['residence'], storage);
    expect(readMilestones('slot.a', storage)).toEqual(['residence']);
    expect(readMilestones('slot.b', storage)).toEqual([]);
    expect(milestoneKey(null)).toContain('slot.default');
    const failing: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readMilestones('slot.a', failing)).toEqual([]);
    expect(() => writeMilestones('slot.a', ['x'], failing)).not.toThrow();
  });
});
