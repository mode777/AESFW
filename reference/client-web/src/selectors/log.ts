/**
 * The event log (REF-12.4, PIC-11): a bounded ring of domain events, newest
 * first, filtered by type, location, or entity. Lines carry the tick, the event
 * type, and their subject references so a click can select the subject.
 *
 * Source: REF-12.4, PIC-11
 */
import type { EventDto } from '@aesfw/protocol';

/** The filter of the log window (PIC-11). */
export interface LogFilter {
  readonly type: string | null;
  readonly location: number | null;
  readonly entity: number | null;
}

/** The empty filter. */
export const NO_LOG_FILTER: LogFilter = { type: null, location: null, entity: null };

/** One rendered log line (PIC-11). */
export interface LogLine {
  readonly tick: number;
  readonly sequence: number;
  readonly type: string;
  readonly text: string;
  readonly subjects: readonly number[];
  readonly location: number | null;
}

/** The ring size: enough history to read, small enough to stay cheap. */
export const LOG_LIMIT = 200;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const summarise = (event: EventDto): string => {
  const payload = asRecord(event.payload) ?? {};
  const parts: string[] = [];
  for (const [key, value] of Object.entries(payload)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'object') continue;
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      continue;
    }
    parts.push(`${key}=${String(value)}`);
  }
  return parts.length === 0 ? event.type : `${event.type} ${parts.join(' ')}`;
};

/**
 * Builds the log lines (PIC-11): newest first, at most `LOG_LIMIT`, filtered by
 * type, location, or entity. A filter matches when the event carries the
 * subject; an absent filter matches everything.
 *
 * Source: PIC-11
 */
export function logLines(
  events: readonly EventDto[],
  filter: LogFilter = NO_LOG_FILTER,
): readonly LogLine[] {
  const lines: LogLine[] = [];
  for (let index = events.length - 1; index >= 0 && lines.length < LOG_LIMIT; index -= 1) {
    const event = events[index];
    if (event === undefined) continue;
    if (filter.type !== null && event.type !== filter.type) continue;
    if (filter.location !== null) {
      const location = asRecord(event.payload)?.['location'];
      const matchesLocation =
        event.subjects.includes(filter.location) ||
        (typeof location === 'number' && location === filter.location);
      if (!matchesLocation) continue;
    }
    if (filter.entity !== null && !event.subjects.includes(filter.entity)) continue;
    lines.push({
      tick: event.tick,
      sequence: event.sequence,
      type: event.type,
      text: summarise(event),
      subjects: [...event.subjects],
      location: null,
    });
  }
  return lines;
}

/** The distinct event types present in the log, ascending (filter options). */
export const logTypes = (events: readonly EventDto[]): readonly string[] =>
  [...new Set(events.map((event) => event.type))].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
