/**
 * Wire scalar aliases (TDS-22). All quantities on the wire are base-unit
 * integers; display scaling and formatting are client concerns.
 *
 * Source: TDS-22, PIC-3
 */

/** A JSON object value as it appears on the wire. */
export type JsonValue = string | number | boolean | null | readonly JsonValue[] | JsonObject;

/** A JSON object value as it appears on the wire. */
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

/** A base-unit integer quantity or count. */
export type WireInt = number;

/** A stable string identifier (definition ID, owner ID, session ID). */
export type WireId = string;
