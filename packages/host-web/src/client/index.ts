/**
 * The main-thread `SessionClient` proxy (TDS-21.1). It depends only on
 * `@aesfw/protocol` (TDS-4.2, TDS-4.3): it sends versioned request messages
 * and delivers decoded responses.
 *
 * Source: TDS-21.1, TDS-4.2
 */
import { PROTOCOL_VERSION, decodeWorkerResponse } from '@aesfw/protocol';
import type {
  CommandEnvelopeDto,
  ContentSourceDto,
  JsonObject,
  WorkerControlAction,
  WorkerRequestDto,
  WorkerResponseDto,
} from '@aesfw/protocol';

/** The main-thread entry point identifier. */
export const HOST_WEB_CLIENT_ENTRY_ID = '@aesfw/host-web/client' as const;

/** The port the client posts to (a `Worker` in the browser). */
export interface SessionClientPort {
  postMessage(message: WorkerRequestDto): void;
  onMessage(handler: (data: unknown) => void): void;
}

/** The client proxy (TDS-21.1). */
export interface SessionClient {
  init(content?: readonly ContentSourceDto[], saveSlot?: string): void;
  subscribe(actorId: string): void;
  command(command: CommandEnvelopeDto): void;
  control(action: WorkerControlAction, options?: { speed?: number; ticks?: number }): void;
  query(actorId: string, query: JsonObject): void;
  save(slot: string): void;
  load(slot: string): void;
  onMessage(handler: (response: WorkerResponseDto) => void): void;
}

/**
 * Creates the main-thread client over `port` (TDS-21.1).
 *
 * Source: TDS-21.1
 */
export function createSessionClient(port: SessionClientPort): SessionClient {
  return {
    init(content, saveSlot) {
      port.postMessage({
        kind: 'init',
        protocol_version: PROTOCOL_VERSION,
        ...(content === undefined ? {} : { content }),
        ...(saveSlot === undefined ? {} : { save_slot: saveSlot }),
      });
    },
    subscribe(actorId) {
      port.postMessage({
        kind: 'subscribe',
        protocol_version: PROTOCOL_VERSION,
        actor_id: actorId,
      });
    },
    command(command) {
      port.postMessage({ kind: 'command', protocol_version: PROTOCOL_VERSION, command });
    },
    control(action, options = {}) {
      port.postMessage({
        kind: 'control',
        protocol_version: PROTOCOL_VERSION,
        action,
        ...(options.speed === undefined ? {} : { speed: options.speed }),
        ...(options.ticks === undefined ? {} : { ticks: options.ticks }),
      });
    },
    query(actorId, query) {
      port.postMessage({
        kind: 'query',
        protocol_version: PROTOCOL_VERSION,
        actor_id: actorId,
        query,
      });
    },
    save(slot) {
      port.postMessage({ kind: 'save', protocol_version: PROTOCOL_VERSION, slot });
    },
    load(slot) {
      port.postMessage({ kind: 'load', protocol_version: PROTOCOL_VERSION, slot });
    },
    onMessage(handler) {
      port.onMessage((data) => {
        const decoded = decodeWorkerResponse(data);
        if (decoded.ok) handler(decoded.value);
      });
    },
  };
}
