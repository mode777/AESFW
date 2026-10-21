/**
 * Domain events and the per-tick event writer (TDS-17). Events state facts,
 * never presentation instructions; the writer stamps each event with the tick
 * being computed and a monotonic per-tick sequence.
 *
 * Source: TDS-17
 */
import type { JsonValue } from '../det/index.js';
import type { EntityId, OwnerHandle, Tick } from '../ids/index.js';

/** A domain event (TDS-17). */
export interface DomainEvent {
  readonly tick: Tick;
  readonly seq: number;
  readonly type: string;
  readonly subjects: readonly EntityId[];
  readonly owner: OwnerHandle | null;
  readonly location: EntityId | null;
  readonly payload: JsonValue;
}

/** An event as supplied by a system; the writer adds `tick` and `seq`. */
export type DomainEventInput = Omit<DomainEvent, 'tick' | 'seq'>;

/** Appends domain events for one tick (TDS-17). */
export interface EventWriter {
  emit(event: DomainEventInput): void;
  readonly events: readonly DomainEvent[];
}

/**
 * Creates an event writer for the tick being computed. `seq` starts at `0`
 * and increases monotonically within the tick.
 *
 * Source: TDS-17
 */
export function createEventWriter(tick: Tick): EventWriter {
  const events: DomainEvent[] = [];
  return {
    emit(event) {
      events.push({ ...event, tick, seq: events.length });
    },
    get events() {
      return events;
    },
  };
}
