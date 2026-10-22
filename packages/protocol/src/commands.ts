/**
 * Command envelope and command result DTOs (PIC-12, PIC-13, TDS-22).
 *
 * Source: PIC-12, PIC-13, TDS-22
 */
import type { JsonObject, WireId, WireInt } from './scalars.js';

/**
 * A client-submitted command (PIC-12). `type` is a stable command type name
 * owned by the command's roadmap row; the envelope itself is versioned here.
 */
export interface CommandEnvelopeDto {
  readonly command_id: WireId;
  readonly actor_id: WireId;
  readonly expected_session_revision?: WireInt;
  readonly type: string;
  readonly payload: JsonObject;
}

/** One error attached to a rejected command (PIC-13). */
export interface CommandErrorDto {
  readonly code: string;
  readonly arguments: JsonObject;
}

/** An accepted command result (PIC-13). */
export interface CommandAcceptedDto {
  readonly command_id: WireId;
  readonly status: 'accepted';
  readonly scheduled_tick: WireInt;
}

/** A rejected command result (PIC-13). */
export interface CommandRejectedDto {
  readonly command_id: WireId;
  readonly status: 'rejected';
  readonly current_revision: WireInt;
  readonly errors: readonly CommandErrorDto[];
}

/** The result of submitting a command (PIC-13). */
export type CommandResultDto = CommandAcceptedDto | CommandRejectedDto;
