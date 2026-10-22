/**
 * Codecs for web-worker messages (TDS-21.1). The version is checked before the
 * `kind`, then the payload is decoded with the matching DTO codec.
 *
 * Source: TDS-21.1, TDS-22
 */
import { decodeCommandEnvelope, decodeCommandResult } from './commands.js';
import { decodeEvent } from './events.js';
import { decodeSnapshot, decodeSnapshotDelta } from './snapshot.js';
import type { EventDto } from '../events.js';
import type { ProtocolError } from '../errors.js';
import { err, ok, type DecodeResult } from '../result.js';
import type { ContentSourceDto, WorkerRequestDto, WorkerResponseDto } from '../worker.js';
import { PROTOCOL_VERSION } from '../version.js';
import {
  invalidField,
  isInteger,
  isJsonObject,
  isNonNegativeInteger,
  isObject,
  isString,
  unknownKind,
  versionMismatch,
} from './guards.js';

const REQUEST_KINDS: readonly string[] = [
  'init',
  'subscribe',
  'command',
  'control',
  'query',
  'save',
  'load',
];

const RESPONSE_KINDS: readonly string[] = [
  'ready',
  'snapshot',
  'delta',
  'command_result',
  'query_result',
  'saved',
  'loaded',
  'error',
];

const CONTROL_ACTIONS: readonly string[] = ['run', 'pause', 'step', 'speed'];

function checkEnvelope(value: Record<string, unknown>, kinds: readonly string[]): ProtocolError[] {
  const version = value['protocol_version'];
  if (!isInteger(version)) return [invalidField('protocol_version')];
  if (version !== PROTOCOL_VERSION) return [versionMismatch(version)];
  const kind = value['kind'];
  if (!isString(kind) || !kinds.includes(kind)) {
    return [unknownKind(isString(kind) ? kind : '<non-string>')];
  }
  return [];
}

/** Decodes a request sent from the client to the worker (TDS-21.1). */
export function decodeWorkerRequest(value: unknown): DecodeResult<WorkerRequestDto> {
  if (!isObject(value)) return err([invalidField('')]);
  const envelopeErrors = checkEnvelope(value, REQUEST_KINDS);
  if (envelopeErrors.length > 0) return err(envelopeErrors);
  const version = PROTOCOL_VERSION;
  const kind = value['kind'] as string;

  switch (kind) {
    case 'init': {
      const saveSlot = value['save_slot'];
      if (saveSlot !== undefined && !isString(saveSlot)) return err([invalidField('save_slot')]);
      const rawContent = value['content'];
      let content: ContentSourceDto[] | undefined;
      if (rawContent !== undefined) {
        if (!Array.isArray(rawContent)) return err([invalidField('content')]);
        const sources = rawContent as readonly unknown[];
        content = [];
        for (let index = 0; index < sources.length; index += 1) {
          const source = sources[index];
          if (!isObject(source) || !isString(source['root'])) {
            return err([invalidField(`content[${index}]`)]);
          }
          const rawFiles = source['files'];
          if (!Array.isArray(rawFiles)) return err([invalidField(`content[${index}].files`)]);
          const fileList = rawFiles as readonly unknown[];
          const files: { path: string; text: string }[] = [];
          for (let fileIndex = 0; fileIndex < fileList.length; fileIndex += 1) {
            const file = fileList[fileIndex];
            if (!isObject(file) || !isString(file['path']) || !isString(file['text'])) {
              return err([invalidField(`content[${index}].files[${fileIndex}]`)]);
            }
            files.push({ path: file['path'], text: file['text'] });
          }
          content.push({ root: source['root'], files });
        }
      }
      return ok({
        kind: 'init',
        protocol_version: version,
        ...(saveSlot === undefined ? {} : { save_slot: saveSlot }),
        ...(content === undefined ? {} : { content }),
      });
    }
    case 'subscribe': {
      const actorId = value['actor_id'];
      if (!isString(actorId)) return err([invalidField('actor_id')]);
      return ok({ kind: 'subscribe', protocol_version: version, actor_id: actorId });
    }
    case 'command': {
      const decoded = decodeCommandEnvelope(value['command']);
      if (!decoded.ok) return err(decoded.error);
      return ok({ kind: 'command', protocol_version: version, command: decoded.value });
    }
    case 'control': {
      const action = value['action'];
      if (!isString(action) || !CONTROL_ACTIONS.includes(action)) {
        return err([invalidField('action')]);
      }
      const errors: ProtocolError[] = [];
      const speed = value['speed'];
      if (speed !== undefined && !isNonNegativeInteger(speed)) errors.push(invalidField('speed'));
      const ticks = value['ticks'];
      if (ticks !== undefined && !isNonNegativeInteger(ticks)) errors.push(invalidField('ticks'));
      if (errors.length > 0) return err(errors);
      return ok({
        kind: 'control',
        protocol_version: version,
        action: action as 'run' | 'pause' | 'step',
        ...(speed === undefined ? {} : { speed: speed as number }),
        ...(ticks === undefined ? {} : { ticks: ticks as number }),
      });
    }
    case 'query': {
      const actorId = value['actor_id'];
      if (!isString(actorId)) return err([invalidField('actor_id')]);
      const query = value['query'];
      if (!isJsonObject(query)) return err([invalidField('query')]);
      return ok({ kind: 'query', protocol_version: version, actor_id: actorId, query });
    }
    case 'save':
    case 'load': {
      const slot = value['slot'];
      if (!isString(slot)) return err([invalidField('slot')]);
      return ok({ kind, protocol_version: version, slot });
    }
    default:
      return err([unknownKind(kind)]);
  }
}

/** Decodes a response sent from the worker to the client (TDS-21.1). */
export function decodeWorkerResponse(value: unknown): DecodeResult<WorkerResponseDto> {
  if (!isObject(value)) return err([invalidField('')]);
  const envelopeErrors = checkEnvelope(value, RESPONSE_KINDS);
  if (envelopeErrors.length > 0) return err(envelopeErrors);
  const version = PROTOCOL_VERSION;
  const kind = value['kind'] as string;

  switch (kind) {
    case 'ready': {
      const sessionId = value['session_id'];
      if (!isString(sessionId)) return err([invalidField('session_id')]);
      const tick = value['tick'];
      if (!isNonNegativeInteger(tick)) return err([invalidField('tick')]);
      const revision = value['revision'];
      if (!isNonNegativeInteger(revision)) return err([invalidField('revision')]);
      const checksum = value['configuration_checksum'];
      if (!isString(checksum)) return err([invalidField('configuration_checksum')]);
      return ok({
        kind: 'ready',
        protocol_version: version,
        session_id: sessionId,
        tick,
        revision,
        configuration_checksum: checksum,
      });
    }
    case 'snapshot': {
      const decoded = decodeSnapshot(value['snapshot']);
      if (!decoded.ok) return err(decoded.error);
      return ok({ kind: 'snapshot', protocol_version: version, snapshot: decoded.value });
    }
    case 'delta': {
      const decodedDelta = decodeSnapshotDelta(value['delta']);
      if (!decodedDelta.ok) return err(decodedDelta.error);
      const rawEvents = value['events'];
      if (!Array.isArray(rawEvents)) return err([invalidField('events')]);
      const events: EventDto[] = [];
      for (let index = 0; index < rawEvents.length; index += 1) {
        const decodedEvent = decodeEvent(rawEvents[index]);
        if (!decodedEvent.ok) return err(decodedEvent.error);
        events.push(decodedEvent.value);
      }
      return ok({
        kind: 'delta',
        protocol_version: version,
        delta: decodedDelta.value,
        events,
        ...(value['hash'] === undefined
          ? {}
          : isString(value['hash'])
            ? { hash: value['hash'] }
            : {}),
      });
    }
    case 'command_result': {
      const decoded = decodeCommandResult(value['result']);
      if (!decoded.ok) return err(decoded.error);
      return ok({ kind: 'command_result', protocol_version: version, result: decoded.value });
    }
    case 'query_result': {
      const result = value['result'];
      if (!isJsonObject(result)) return err([invalidField('result')]);
      return ok({
        kind: 'query_result',
        protocol_version: version,
        result: result,
      });
    }
    case 'saved':
    case 'loaded': {
      const slot = value['slot'];
      if (!isString(slot)) return err([invalidField('slot')]);
      return ok({ kind, protocol_version: version, slot });
    }
    case 'error': {
      const code = value['code'];
      if (!isString(code)) return err([invalidField('code')]);
      const args = value['arguments'];
      if (!isJsonObject(args)) return err([invalidField('arguments')]);
      const lastGoodHash = value['last_good_hash'];
      if (lastGoodHash !== undefined && !isString(lastGoodHash)) {
        return err([invalidField('last_good_hash')]);
      }
      return ok({
        kind: 'error',
        protocol_version: version,
        code,
        arguments: args,
        ...(lastGoodHash === undefined ? {} : { last_good_hash: lastGoodHash }),
      });
    }
    default:
      return err([unknownKind(kind)]);
  }
}
