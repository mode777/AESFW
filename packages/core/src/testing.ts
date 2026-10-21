/**
 * Test-only API of `@aesfw/core` (TDS-4.4, TDS-10.3). Entry points for the
 * tick-pipeline test harness (`runPhases`, `stores`, `phaseTable`) arrive
 * with roadmap rows 0.6 and 0.7; this entry currently ships only the
 * deep-freeze helper that test builds use to freeze definition data
 * (TDS-5.2, TDS-5.5).
 */

/**
 * Deep-freezes an object graph for test builds: the value itself and every
 * plain object or array reachable through its own enumerable properties
 * becomes frozen, so mutation attempts throw in strict mode. Handles cycles.
 * Returns the input reference unchanged. Non-frozen exotic objects
 * (`Map`, `Set`, functions) are frozen themselves, but their internal slots
 * are not walked.
 *
 * Source: TDS-5.2, TDS-5.5, TDS-10.3
 */
export function deepFreeze<T>(value: T): T {
  const seen = new WeakSet<object>();
  const freeze = (current: unknown): void => {
    if (current === null || typeof current !== 'object') return;
    const object = current as Record<string, unknown>;
    if (seen.has(object)) return;
    seen.add(object);
    Object.freeze(object);
    for (const key of Object.keys(object)) {
      freeze(object[key]);
    }
  };
  freeze(value);
  return value;
}
