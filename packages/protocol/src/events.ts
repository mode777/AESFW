/**
 * Domain event DTO (PIC-11, TDS-22). Presentation may animate, log, aggregate,
 * or ignore an event; unknown `type` values are legal so clients can ignore
 * events they do not know.
 *
 * Source: PIC-11, TDS-22
 */
import type { JsonObject, WireId, WireInt } from './scalars.js';

/** An ordered domain event (PIC-11). */
export interface EventDto {
  readonly session_id: WireId;
  readonly tick: WireInt;
  readonly sequence: WireInt;
  readonly type: string;
  readonly subjects: readonly WireInt[];
  readonly payload: JsonObject;
}
