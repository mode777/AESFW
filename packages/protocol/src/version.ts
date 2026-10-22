/**
 * Protocol version (TDS-22). Additive fields are minor changes; removing or
 * changing a field is a breaking change that needs a new version and a
 * compatibility note in 04.
 *
 * Source: TDS-22
 */
export const PROTOCOL_VERSION = 1 as const;

/** The integer type of `protocol_version` on the wire. */
export type ProtocolVersion = typeof PROTOCOL_VERSION;
