/**
 * Session types (TDS-18.1). A `SessionState` is the pure application-layer
 * container: the compiled content, the world, the revision, the command log,
 * and the hash checkpoints.
 *
 * Source: TDS-18.1, TDS-18.2, TDS-18.3
 */
import type {
  Command,
  CommandOutcome,
  Diagnostic,
  OwnerHandle,
  StringId,
  Tick,
  TickOutput,
  World,
} from '@aesfw/core';
import type { CommandResultDto } from '@aesfw/protocol';
import type { CompiledContent } from '@aesfw/content';

/** Immutable session settings (TDS-18.1). */
export interface SessionSettings {
  readonly hashInterval: number;
  readonly journal: boolean;
  readonly actor: OwnerHandle;
  readonly actorId: string;
  readonly tickDurationMs: number;
}

/** One accepted command, kept for replay (TDS-18.2, 02 §16.2). */
export interface AcceptedCommandRecord {
  readonly commandId: string;
  readonly actor: OwnerHandle;
  readonly tick: Tick;
  readonly seq: number;
  readonly command: Command;
}

/** A recorded state hash (TDS-19.4). */
export interface HashCheckpoint {
  readonly tick: Tick;
  readonly hash: string;
}

/** The pure session state (TDS-18.1). */
export interface SessionState {
  readonly sessionId: string;
  readonly content: CompiledContent;
  world: World;
  revision: number;
  nextSubmissionSeq: number;
  commandLog: AcceptedCommandRecord[];
  hashLog: HashCheckpoint[];
  readonly settings: SessionSettings;
}

/** Options for `createSession` (TDS-18.1). */
export interface SessionOptions {
  readonly sessionId: string;
  readonly seed: [number, number];
  readonly tickDurationMs: number;
  readonly world: StringId | null;
  readonly enabledModules: readonly StringId[];
  readonly hashInterval: number;
  readonly journal: boolean;
  readonly actor: OwnerHandle;
  readonly actorId: string;
}

/** The result of `submitCommand` (TDS-18.1). */
export interface SubmitResult {
  readonly session: SessionState;
  readonly result: CommandResultDto;
}

/** The result of `advance` (TDS-18.1). */
export interface AdvanceResult {
  readonly session: SessionState;
  readonly outputs: readonly TickOutput[];
}

/** Re-exported so hosts can name the diagnostics without importing core. */
export type SessionDiagnostic = Diagnostic;

/** Re-exported for hosts that inspect command outcomes. */
export type SessionCommandOutcome = CommandOutcome;
