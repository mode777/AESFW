/**
 * Write-set enforcement (TDS-11.2, VER-5.4). In test builds a system may mutate
 * only the stores it declares in `writes`; every other store is wrapped
 * read-only for that system's run.
 *
 * Source: TDS-11.2, VER-5.4
 */
import type { JsonValue } from '../det/index.js';
import { InvariantViolation } from '../errors/invariant-violation.js';
import type { ComponentKind, ComponentStore, ComponentStores } from '../world/component-store.js';
import type { StoreKey } from './types.js';

const readOnlyStore = <T extends JsonValue>(store: ComponentStore<T>): ComponentStore<T> => ({
  kind: store.kind,
  has: (entity) => store.has(entity),
  get: (entity) => store.get(entity),
  getOrThrow: (entity) => store.getOrThrow(entity),
  set: () => {
    throw new InvariantViolation('write_set_violation', { kind: store.kind, operation: 'set' });
  },
  markRemoved: () => {
    throw new InvariantViolation('write_set_violation', {
      kind: store.kind,
      operation: 'markRemoved',
    });
  },
  ids: () => store.ids(),
  size: () => store.size(),
  compact: () => {
    throw new InvariantViolation('write_set_violation', { kind: store.kind, operation: 'compact' });
  },
});

/**
 * Returns a view of `stores` where only the kinds in `writes` are mutable.
 *
 * Source: TDS-11.2
 */
export function guardStores(stores: ComponentStores, writes: readonly StoreKey[]): ComponentStores {
  const writable = new Set<StoreKey>(writes);
  return {
    kinds: stores.kinds,
    get<T extends JsonValue = JsonValue>(kind: ComponentKind): ComponentStore<T> {
      const store = stores.get<T>(kind);
      return writable.has(kind) ? store : readOnlyStore(store);
    },
  };
}
