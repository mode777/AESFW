/**
 * Codec for domain events (PIC-11). Unknown event `type` values decode, so
 * clients can ignore events they do not know.
 *
 * Source: PIC-11, TDS-22
 */
import type { EventDto } from '../events.js';
import type { ProtocolError } from '../errors.js';
import { err, ok, type DecodeResult } from '../result.js';
import type { JsonObject } from '../scalars.js';
import {
  invalidField,
  isIntegerArray,
  isJsonObject,
  isNonNegativeInteger,
  isObject,
  isString,
} from './guards.js';

/** Decodes an ordered domain event (PIC-11). */
export function decodeEvent(value: unknown): DecodeResult<EventDto> {
  if (!isObject(value)) return err([invalidField('')]);
  const errors: ProtocolError[] = [];

  const sessionId = value['session_id'];
  if (!isString(sessionId)) errors.push(invalidField('session_id'));
  const tick = value['tick'];
  if (!isNonNegativeInteger(tick)) errors.push(invalidField('tick'));
  const sequence = value['sequence'];
  if (!isNonNegativeInteger(sequence)) errors.push(invalidField('sequence'));
  const type = value['type'];
  if (!isString(type)) errors.push(invalidField('type'));
  const subjects = value['subjects'];
  if (!isIntegerArray(subjects)) errors.push(invalidField('subjects'));
  const payload = value['payload'];
  if (!isJsonObject(payload)) errors.push(invalidField('payload'));

  if (errors.length > 0) return err(errors);
  return ok({
    session_id: sessionId as string,
    tick: tick as number,
    sequence: sequence as number,
    type: type as string,
    subjects: subjects as readonly number[],
    payload: payload as JsonObject,
  });
}
