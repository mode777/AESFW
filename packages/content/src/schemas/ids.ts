/**
 * Stable definition identifiers (CONT-4): lowercase ASCII, two or more
 * period-separated segments, each containing lowercase letters, digits, and
 * underscores. The rule lives in one predicate so the loader, the registry
 * compilation (1.4), and later validators agree.
 *
 * Source: CONT-4
 */
const DEFINITION_ID_PATTERN = /^[a-z0-9_]+(?:\.[a-z0-9_]+)+$/;

/**
 * True when `value` is a well-formed definition ID (CONT-4).
 *
 * Source: CONT-4
 */
export function isValidDefinitionId(value: string): boolean {
  return DEFINITION_ID_PATTERN.test(value);
}
