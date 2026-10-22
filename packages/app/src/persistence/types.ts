/**
 * The versioned save document (TDS-19.1, ARCH-15). `session.settings` is an
 * additive field so `load(content, doc)` can restore a usable session.
 *
 * Source: TDS-19.1, ARCH-15.1, ARCH-15.2
 */
import type { CanonicalState } from '@aesfw/core';
import type { AcceptedCommandRecord, SessionSettings } from '../session/types.js';

/** The framework version recorded in a save header. */
export const FRAMEWORK_VERSION = '0.1.0';

/** The hash algorithm tag of TDS-19.4. */
export const HASH_ALGORITHM = 'fnv1a64-canonical-json-v1' as const;

/** A save header (TDS-19.1). */
export interface SaveHeader {
  readonly format: 'aesfw-save';
  readonly format_version: 1;
  readonly framework_version: string;
  readonly schema_version: number;
  readonly packages: readonly { readonly id: string; readonly version: string }[];
  readonly configuration_checksum: string;
  readonly session_id: string;
  readonly tick: number;
  readonly tick_duration_ms: number;
  readonly seed: readonly [number, number];
  readonly hash_algorithm: typeof HASH_ALGORITHM;
  readonly state_hash: string;
}

/** The session tail of a save (TDS-19.1, plus `settings`). */
export interface SaveSessionState {
  readonly revision: number;
  readonly next_submission_seq: number;
  readonly command_log_tail: readonly AcceptedCommandRecord[];
  readonly settings: SessionSettings;
}

/** A save document (TDS-19.1). */
export interface SaveDocument {
  readonly header: SaveHeader;
  readonly state: CanonicalState;
  readonly session: SaveSessionState;
}
