/**
 * The pure load function (TDS-19.1, ARCH-15.4). Compares content identity and
 * decodes the canonical state.
 *
 * Source: TDS-19.1, ARCH-15.4
 */
import { decodeWorld, err, ok } from '@aesfw/core';
import type { Diagnostic, Result } from '@aesfw/core';
import type { CompiledContent } from '@aesfw/content';
import type { SessionState } from '../session/types.js';
import type { SaveDocument } from './types.js';

const contentMismatch = (args: Record<string, string | number | boolean>): Diagnostic => ({
  code: 'content_mismatch',
  severity: 'error',
  package: null,
  file: null,
  path: null,
  definition: null,
  args,
});

const packageSignature = (packages: readonly { id: string; version: string }[]): string =>
  packages.map((entry) => `${entry.id}@${entry.version}`).join(',');

/**
 * Loads a save document against `content` (TDS-19.1).
 *
 * Source: TDS-19.1, ARCH-15.4
 */
export function load(
  content: CompiledContent,
  doc: SaveDocument,
): Result<SessionState, Diagnostic[]> {
  if (doc.header.configuration_checksum !== content.checksum) {
    return err([
      contentMismatch({
        expected: content.checksum,
        actual: doc.header.configuration_checksum,
      }),
    ]);
  }
  if (packageSignature(doc.header.packages) !== packageSignature(content.packages)) {
    return err([
      contentMismatch({
        expected: packageSignature(content.packages),
        actual: packageSignature(doc.header.packages),
      }),
    ]);
  }
  const decoded = decodeWorld(content.registry, doc.state);
  if (!decoded.ok) return decoded;
  return ok({
    sessionId: doc.header.session_id,
    content,
    world: decoded.value,
    revision: doc.session.revision,
    nextSubmissionSeq: doc.session.next_submission_seq,
    commandLog: [...doc.session.command_log_tail],
    hashLog: [],
    settings: doc.session.settings,
  });
}
