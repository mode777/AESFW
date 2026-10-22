/**
 * Web-worker message DTOs (TDS-21.1, TDS-22). Every message carries
 * `protocol_version` and a `kind` discriminator.
 *
 * Source: TDS-21.1, TDS-22
 */
import type { CommandEnvelopeDto, CommandResultDto } from './commands.js';
import type { EventDto } from './events.js';
import type { SnapshotDeltaDto, SnapshotDto } from './snapshot.js';
import type { JsonObject, WireId, WireInt } from './scalars.js';
import type { ProtocolVersion } from './version.js';

/** The clock/control actions the client may send (TDS-21.1). */
export type WorkerControlAction = 'run' | 'pause' | 'step' | 'speed';

/** A single content file passed to the worker (TDS-21.1). */
export interface ContentFileDto {
  readonly path: string;
  readonly text: string;
}

/** A content package source passed to the worker (TDS-21.1). */
export interface ContentSourceDto {
  readonly root: string;
  readonly files: readonly ContentFileDto[];
}

/** Starts or loads a session in the worker (TDS-21.1). */
export interface WorkerInitRequestDto {
  readonly kind: 'init';
  readonly protocol_version: ProtocolVersion;
  readonly save_slot?: string;
  readonly content?: readonly ContentSourceDto[];
}

/** Subscribes the client to one actor's projections (TDS-21.1). */
export interface WorkerSubscribeRequestDto {
  readonly kind: 'subscribe';
  readonly protocol_version: ProtocolVersion;
  readonly actor_id: WireId;
}

/** Submits a command (TDS-21.1, PIC-12). */
export interface WorkerCommandRequestDto {
  readonly kind: 'command';
  readonly protocol_version: ProtocolVersion;
  readonly command: CommandEnvelopeDto;
}

/** Controls the clock (TDS-21.1). */
export interface WorkerControlRequestDto {
  readonly kind: 'control';
  readonly protocol_version: ProtocolVersion;
  readonly action: WorkerControlAction;
  readonly speed?: WireInt;
  readonly ticks?: WireInt;
}

/** Runs a read-only query (TDS-21.1). */
export interface WorkerQueryRequestDto {
  readonly kind: 'query';
  readonly protocol_version: ProtocolVersion;
  readonly actor_id: WireId;
  readonly query: JsonObject;
}

/** Saves the session to a slot (TDS-21.1). */
export interface WorkerSaveRequestDto {
  readonly kind: 'save';
  readonly protocol_version: ProtocolVersion;
  readonly slot: string;
}

/** Loads the session from a slot (TDS-21.1). */
export interface WorkerLoadRequestDto {
  readonly kind: 'load';
  readonly protocol_version: ProtocolVersion;
  readonly slot: string;
}

/** Any request the client sends to the worker (TDS-21.1). */
export type WorkerRequestDto =
  | WorkerInitRequestDto
  | WorkerSubscribeRequestDto
  | WorkerCommandRequestDto
  | WorkerControlRequestDto
  | WorkerQueryRequestDto
  | WorkerSaveRequestDto
  | WorkerLoadRequestDto;

/** The session is ready for projections (TDS-21.1). */
export interface WorkerReadyResponseDto {
  readonly kind: 'ready';
  readonly protocol_version: ProtocolVersion;
  readonly session_id: WireId;
  readonly tick: WireInt;
  readonly revision: WireInt;
  readonly configuration_checksum: string;
}

/** A full projection snapshot (TDS-21.1, PIC-9.1). */
export interface WorkerSnapshotResponseDto {
  readonly kind: 'snapshot';
  readonly protocol_version: ProtocolVersion;
  readonly snapshot: SnapshotDto;
}

/** A coalesced delta with the events since the last publication (TDS-21.1). */
export interface WorkerDeltaResponseDto {
  readonly kind: 'delta';
  readonly protocol_version: ProtocolVersion;
  readonly delta: SnapshotDeltaDto;
  readonly events: readonly EventDto[];
  readonly hash?: string;
}

/** The result of a submitted command (TDS-21.1, PIC-13). */
export interface WorkerCommandResultResponseDto {
  readonly kind: 'command_result';
  readonly protocol_version: ProtocolVersion;
  readonly result: CommandResultDto;
}

/** The result of a query (TDS-21.1). */
export interface WorkerQueryResultResponseDto {
  readonly kind: 'query_result';
  readonly protocol_version: ProtocolVersion;
  readonly result: JsonObject;
}

/** The session was saved to a slot (TDS-21.1). */
export interface WorkerSavedResponseDto {
  readonly kind: 'saved';
  readonly protocol_version: ProtocolVersion;
  readonly slot: string;
}

/** The session was loaded from a slot (TDS-21.1). */
export interface WorkerLoadedResponseDto {
  readonly kind: 'loaded';
  readonly protocol_version: ProtocolVersion;
  readonly slot: string;
}

/** An error report, including the last good hash on an invariant violation (TDS-21.1). */
export interface WorkerErrorResponseDto {
  readonly kind: 'error';
  readonly protocol_version: ProtocolVersion;
  readonly code: string;
  readonly arguments: JsonObject;
  readonly last_good_hash?: string;
}

/** Any message the worker sends to the client (TDS-21.1). */
export type WorkerResponseDto =
  | WorkerReadyResponseDto
  | WorkerSnapshotResponseDto
  | WorkerDeltaResponseDto
  | WorkerCommandResultResponseDto
  | WorkerQueryResultResponseDto
  | WorkerSavedResponseDto
  | WorkerLoadedResponseDto
  | WorkerErrorResponseDto;
