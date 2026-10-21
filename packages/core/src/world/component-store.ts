/**
 * Component stores (TDS-8.2). Values are keyed by `EntityId`; iteration is
 * always in ascending entity-ID order, and removal is a tombstone compacted in
 * phase 30 (INV-24). The v1 store kinds are the catalogue of TDS-8.3.
 *
 * Source: TDS-8.2, TDS-8.3, INV-24
 */
import { InvariantViolation } from '../errors/invariant-violation.js';
import type { JsonValue } from '../det/index.js';
import type { EntityId } from '../ids/index.js';

/** The v1 store kinds of TDS-8.3, in canonical order. */
export const COMPONENT_KINDS = [
  'definition',
  'owner',
  'location',
  'lifecycle',
  'enabled',
  'revision',
  'transform',
  'footprint',
  'workingArea',
  'connectivityNode',
  'regionMembership',
  'locationProperties',
  'establishment',
  'locationHub',
  'throughputPool',
  'inventory',
  'resourceSource',
  'sourceSlotBinding',
  'producer',
  'throughputAllocation',
  'modifierSet',
  'residence',
  'populationGroup',
  'needStates',
  'satisfaction',
  'bandState',
  'growth',
  'transition',
  'capabilityProvider',
  'capabilityConsumer',
  'capabilityAllocation',
  'maintenance',
  'deficitPause',
  'exchangeRef',
  'cargo',
  'transportAssignment',
  'transportOrder',
  'route',
  'stationCursor',
  'movement',
  'handling',
  'constructionPlan',
  'constructionProgress',
  'placement',
] as const;

/** A v1 component store kind (TDS-8.3). */
export type ComponentKind = (typeof COMPONENT_KINDS)[number];

/** A typed component store (TDS-8.2). */
export interface ComponentStore<T extends JsonValue = JsonValue> {
  readonly kind: ComponentKind;
  has(entity: EntityId): boolean;
  get(entity: EntityId): T | undefined;
  getOrThrow(entity: EntityId): T;
  set(entity: EntityId, value: T): void;
  markRemoved(entity: EntityId): void;
  ids(): readonly EntityId[];
  size(): number;
  /** Drops tombstoned slots (the phase-30 compaction hook, TDS-8.2). */
  compact(): void;
}

/**
 * Creates an empty store of `kind`. Values are held in a dense array indexed by
 * entity ID; tombstones are tracked alongside so iteration order is ascending
 * and identical before and after save/load.
 *
 * Source: TDS-8.2
 */
export function createComponentStore<T extends JsonValue = JsonValue>(
  kind: ComponentKind,
): ComponentStore<T> {
  const values: (T | undefined)[] = [];
  const removed: boolean[] = [];

  const live = (entity: number): boolean =>
    entity >= 0 &&
    entity < values.length &&
    values[entity] !== undefined &&
    removed[entity] !== true;

  return {
    kind,
    has(entity) {
      return live(entity);
    },
    get(entity) {
      return live(entity) ? values[entity] : undefined;
    },
    getOrThrow(entity) {
      if (!live(entity)) {
        throw new InvariantViolation('unknown_component', { kind, entity });
      }
      return values[entity] as T;
    },
    set(entity, value) {
      values[entity] = value;
      removed[entity] = false;
    },
    markRemoved(entity) {
      if (entity >= 0 && entity < values.length) {
        removed[entity] = true;
      }
    },
    ids() {
      const result: EntityId[] = [];
      for (let entity = 0; entity < values.length; entity += 1) {
        if (live(entity)) result.push(entity as EntityId);
      }
      return result;
    },
    size() {
      let count = 0;
      for (let entity = 0; entity < values.length; entity += 1) {
        if (live(entity)) count += 1;
      }
      return count;
    },
    compact() {
      for (let entity = 0; entity < values.length; entity += 1) {
        if (removed[entity] === true) {
          values[entity] = undefined;
          removed[entity] = false;
        }
      }
    },
  };
}

/** The container of all v1 stores (TDS-8.3). */
export interface ComponentStores {
  readonly kinds: readonly ComponentKind[];
  get<T extends JsonValue = JsonValue>(kind: ComponentKind): ComponentStore<T>;
}

/** Creates one empty store per v1 kind. */
export function createComponentStores(): ComponentStores {
  const stores = new Map<ComponentKind, ComponentStore<JsonValue>>();
  for (const kind of COMPONENT_KINDS) {
    stores.set(kind, createComponentStore<JsonValue>(kind));
  }
  return {
    kinds: COMPONENT_KINDS,
    get<T extends JsonValue = JsonValue>(kind: ComponentKind): ComponentStore<T> {
      const store = stores.get(kind);
      if (store === undefined) {
        throw new InvariantViolation('unknown_store_kind', { kind });
      }
      return store as ComponentStore<T>;
    },
  };
}
