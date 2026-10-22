/**
 * Protocol decode errors and the stable v1 error-code catalogue (TDS-22,
 * PIC-13). Codes are stable machine identifiers; text is localized client-side.
 *
 * Source: TDS-22, PIC-13
 */

/** Stable v1 protocol error codes. */
export const PROTOCOL_ERROR_CODES = {
  /** A required field is missing or has the wrong type. */
  invalidField: 'protocol.invalid_field',
  /** A worker message carries an unrecognized `kind`. */
  unknownKind: 'protocol.unknown_kind',
  /** A worker message carries a `protocol_version` other than the supported one. */
  versionMismatch: 'protocol.version_mismatch',
} as const;

/** A stable protocol error code. */
export type ProtocolErrorCode = (typeof PROTOCOL_ERROR_CODES)[keyof typeof PROTOCOL_ERROR_CODES];

/** Argument values attached to a protocol error. */
export type ProtocolErrorArguments = Readonly<Record<string, string | number | boolean>>;

/** A single decode failure. `path` is a JSON-pointer-like path into the DTO. */
export interface ProtocolError {
  readonly code: ProtocolErrorCode;
  readonly path: string;
  readonly arguments: ProtocolErrorArguments;
}
