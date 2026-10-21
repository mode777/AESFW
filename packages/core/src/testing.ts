/**
 * Test-only API of `@aesfw/core` (TDS-4.4, TDS-10.3): the deep-freeze helper
 * (TDS-5.2, TDS-5.5) and the tick-pipeline test harness `runPhases`,
 * `runSystem`, `stores`, and `phaseTable` (roadmap 0.6).
 */
import type { ComponentStores } from './world/component-store.js';
import type { World } from './world/types.js';

export { runPhases, runSystem } from './pipeline/step.js';
export { phaseTable } from './pipeline/phase-table.js';

/** Direct store access for test setup (TDS-10.3). */
export function stores(world: World): ComponentStores {
  return world.stores;
}

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
