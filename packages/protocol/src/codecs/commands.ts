/**
 * Codecs for command envelopes and command results (PIC-12, PIC-13).
 *
 * Source: PIC-12, PIC-13, TDS-22
 */
import type {
  CommandAcceptedDto,
  CommandEnvelopeDto,
  CommandErrorDto,
  CommandRejectedDto,
  CommandResultDto,
} from '../commands.js';
import type { ProtocolError } from '../errors.js';
import { err, ok, type DecodeResult } from '../result.js';
import type { JsonObject } from '../scalars.js';
import { invalidField, isJsonObject, isNonNegativeInteger, isObject, isString } from './guards.js';

function decodeCommandErrors(value: unknown, errors: ProtocolError[]): readonly CommandErrorDto[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(invalidField('errors'));
    return [];
  }
  const decoded: CommandErrorDto[] = [];
  value.forEach((entry, index) => {
    if (!isObject(entry)) {
      errors.push(invalidField(`errors[${index}]`));
      return;
    }
    const code = entry['code'];
    const args = entry['arguments'];
    if (!isString(code)) errors.push(invalidField(`errors[${index}].code`));
    if (!isJsonObject(args)) errors.push(invalidField(`errors[${index}].arguments`));
    if (isString(code) && isJsonObject(args)) {
      decoded.push({ code, arguments: args });
    }
  });
  return decoded;
}

/** Decodes a client-submitted command envelope (PIC-12). */
export function decodeCommandEnvelope(value: unknown): DecodeResult<CommandEnvelopeDto> {
  if (!isObject(value)) return err([invalidField('')]);
  const errors: ProtocolError[] = [];

  const commandId = value['command_id'];
  if (!isString(commandId)) errors.push(invalidField('command_id'));

  const actorId = value['actor_id'];
  if (!isString(actorId)) errors.push(invalidField('actor_id'));

  const expected = value['expected_session_revision'];
  if (expected !== undefined && !isNonNegativeInteger(expected)) {
    errors.push(invalidField('expected_session_revision'));
  }

  const type = value['type'];
  if (!isString(type)) errors.push(invalidField('type'));

  const payload = value['payload'];
  if (!isJsonObject(payload)) errors.push(invalidField('payload'));

  if (errors.length > 0) return err(errors);

  const base = {
    command_id: commandId as string,
    actor_id: actorId as string,
    type: type as string,
    payload: payload as JsonObject,
  };
  return ok(
    expected === undefined ? base : { ...base, expected_session_revision: expected as number },
  );
}

/** Decodes a command result (PIC-13). */
export function decodeCommandResult(value: unknown): DecodeResult<CommandResultDto> {
  if (!isObject(value)) return err([invalidField('')]);
  const errors: ProtocolError[] = [];

  const commandId = value['command_id'];
  if (!isString(commandId)) errors.push(invalidField('command_id'));

  const status = value['status'];
  if (status === 'accepted') {
    const scheduledTick = value['scheduled_tick'];
    if (!isNonNegativeInteger(scheduledTick)) errors.push(invalidField('scheduled_tick'));
    if (errors.length > 0) return err(errors);
    const accepted: CommandAcceptedDto = {
      command_id: commandId as string,
      status: 'accepted',
      scheduled_tick: scheduledTick as number,
    };
    return ok(accepted);
  }
  if (status === 'rejected') {
    const currentRevision = value['current_revision'];
    if (!isNonNegativeInteger(currentRevision)) errors.push(invalidField('current_revision'));
    const decodedErrors = decodeCommandErrors(value['errors'], errors);
    if (errors.length > 0) return err(errors);
    const rejected: CommandRejectedDto = {
      command_id: commandId as string,
      status: 'rejected',
      current_revision: currentRevision as number,
      errors: decodedErrors,
    };
    return ok(rejected);
  }

  errors.push(invalidField('status'));
  return err(errors);
}
