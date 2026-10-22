/**
 * The pure save function (TDS-19.1, ARCH-15.2). Captures the canonical
 * authoritative state, the header, and the session tail.
 *
 * Source: TDS-19.1, TDS-19.3, ARCH-15.2
 */
import { WORLD_FORMAT_VERSION, encodeWorld, hashWorld } from '@aesfw/core';
import type { SessionState } from '../session/types.js';
import { FRAMEWORK_VERSION, HASH_ALGORITHM } from './types.js';
import type { SaveDocument } from './types.js';

/**
 * Captures `session` as a `SaveDocument` (TDS-19.1).
 *
 * Source: TDS-19.1, ARCH-15.2
 */
export function save(session: SessionState): SaveDocument {
  const registry = session.content.registry;
  const seed = session.world.rng.seed;
  return {
    header: {
      format: 'aesfw-save',
      format_version: 1,
      framework_version: FRAMEWORK_VERSION,
      schema_version: WORLD_FORMAT_VERSION,
      packages: session.content.packages.map((entry) => ({ id: entry.id, version: entry.version })),
      configuration_checksum: session.content.checksum,
      session_id: session.sessionId,
      tick: session.world.tick,
      tick_duration_ms: session.settings.tickDurationMs,
      seed: [seed[0], seed[1]],
      hash_algorithm: HASH_ALGORITHM,
      state_hash: hashWorld(session.world, registry),
    },
    state: encodeWorld(session.world, registry),
    session: {
      revision: session.revision,
      next_submission_seq: session.nextSubmissionSeq,
      command_log_tail: [...session.commandLog],
      settings: session.settings,
    },
  };
}
