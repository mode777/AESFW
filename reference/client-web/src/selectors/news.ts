/**
 * The news rail (REF-12.6): the newsworthy event families, block-onset dedupe
 * with re-arm, and pending warnings derived from the projection. Newest first,
 * capped. A news entry never computes mechanics; it points at a subject.
 *
 * Source: REF-12.6, PIC-11
 */
import type { EventDto, SnapshotDto } from '@aesfw/protocol';

/** The event families that reach the rail (REF-12.6). */
export const NEWSWORTHY_TYPES: readonly string[] = [
  'ConstructionCompleted',
  'TransitionStarted',
  'TransitionCompleted',
  'LocationEstablished',
  'LocationDiscovered',
  'MaintenanceShortage',
  'CapabilityShortageDetected',
  'ThroughputThrottled',
  'DeficitPaused',
  'DeficitResumed',
  'MaintenanceCharged',
];

/** The cap of the rail (REF-12.6). */
export const NEWS_LIMIT = 20;

/** One news entry (REF-12.6). */
export interface NewsEntry {
  readonly id: string;
  readonly tick: number;
  readonly type: string;
  readonly text: string;
  readonly subject: number | null;
  readonly warning: boolean;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const WARNING_TYPES = new Set([
  'MaintenanceShortage',
  'CapabilityShortageDetected',
  'ThroughputThrottled',
  'DeficitPaused',
]);

const summarise = (event: EventDto): string => {
  const payload = asRecord(event.payload) ?? {};
  const parts = Object.entries(payload)
    .filter(([, value]) => typeof value === 'string' || typeof value === 'number')
    .map(([key, value]) => `${key}=${String(value)}`);
  return parts.length === 0 ? event.type : `${event.type} ${parts.join(' ')}`;
};

/**
 * Builds the news entries (REF-12.6): newsworthy events newest first, plus one
 * pending warning per currently blocked entity. A block-onset entry is emitted
 * once and re-armed when the entity is no longer blocked, so a persistent block
 * does not flood the rail.
 *
 * Source: REF-12.6
 */
export function newsEntries(
  events: readonly EventDto[],
  projection: SnapshotDto | null,
  carry: Readonly<Record<string, number>> = {},
): readonly NewsEntry[] {
  const entries: NewsEntry[] = [];
  const blockedNow = new Set<number>();
  for (const entity of projection?.entities ?? []) {
    const reasons = entity.production?.block_reasons ?? [];
    if (reasons.length === 0) continue;
    blockedNow.add(entity.entity_id);
    const first = reasons[0] ?? 'blocked';
    const key = `block:${entity.entity_id}:${first}`;
    if (carry[key] !== undefined) continue;
    entries.push({
      id: key,
      tick: projection?.tick ?? 0,
      type: 'Blocked',
      text: `entity ${entity.entity_id} blocked: ${first}`,
      subject: entity.entity_id,
      warning: true,
    });
  }
  for (let index = events.length - 1; index >= 0 && entries.length < NEWS_LIMIT; index -= 1) {
    const event = events[index];
    if (event === undefined) continue;
    if (!NEWSWORTHY_TYPES.includes(event.type)) continue;
    entries.push({
      id: `${event.type}:${event.tick}:${event.sequence}`,
      tick: event.tick,
      type: event.type,
      text: summarise(event),
      subject: event.subjects[0] ?? null,
      warning: WARNING_TYPES.has(event.type),
    });
  }
  return entries.slice(0, NEWS_LIMIT);
}

/** The ids that should be marked as already reported (dedupe carry). */
export const newsCarry = (projection: SnapshotDto | null): Readonly<Record<string, number>> => {
  const carry: Record<string, number> = {};
  for (const entity of projection?.entities ?? []) {
    const reasons = entity.production?.block_reasons ?? [];
    if (reasons.length === 0) continue;
    carry[`block:${entity.entity_id}:${reasons[0] ?? 'blocked'}`] = projection?.tick ?? 0;
  }
  return carry;
};

/** The camera focus target of a news entry (REF-12.6). */
export const focusSubject = (
  entry: NewsEntry,
  projection: SnapshotDto | null,
): { readonly entity: number | null; readonly location: number | null } => {
  if (entry.subject === null) return { entity: null, location: null };
  const entity = projection?.entities.find((candidate) => candidate.entity_id === entry.subject);
  return {
    entity: entry.subject,
    location: entity?.location_id ?? (entity === undefined ? entry.subject : null),
  };
};
