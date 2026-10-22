/**
 * The command error-code registry (TDS-16.3). Codes are stable `snake_case`
 * identifiers; each declares its argument names and is never reused for a
 * different meaning.
 *
 * Source: TDS-16.3, 04 §13
 */

/** The argument names a command error code carries. */
export interface ErrorCodeSpec {
  readonly arguments: readonly string[];
}

/** Every command error code and its argument names (TDS-16.3). */
export const ERROR_CODES = {
  state_revision_mismatch: { arguments: ['expected', 'actual'] },
  unknown_entity: { arguments: ['entity'] },
  not_owner: { arguments: ['actor'] },
  invalid_recipe: { arguments: ['entity', 'recipe'] },
  unknown_capability: { arguments: ['entity', 'capability'] },
  unknown_command: { arguments: ['type'] },
  not_supported: { arguments: ['type'] },
  unknown_definition: { arguments: ['type', 'definition'] },
  unknown_location: { arguments: ['location'] },
  location_inactive: { arguments: ['location'] },
  out_of_bounds: { arguments: ['location'] },
  not_buildable: { arguments: ['location'] },
  occupied: { arguments: ['location'] },
  insufficient_capacity: { arguments: ['required', 'available'] },
  placement_condition_failed: { arguments: ['condition'] },
  invalid_construction_state: { arguments: ['entity', 'state'] },
} as const satisfies Readonly<Record<string, ErrorCodeSpec>>;

/** A stable command error code. */
export type ErrorCode = keyof typeof ERROR_CODES;
