/**
 * Resolves an entity definition into the runtime placement spec and
 * construction plan (CONT-6.8, GDD-18.1). The definition data is read through
 * the optional `Registry.definitionDataOf` accessor so core stays content-free
 * (design D3); a missing accessor or definition yields `null`.
 *
 * Source: CONT-6.8, GDD-18.1, GDD-18.2, TDS-10.1
 */
import type { JsonValue } from '../../det/index.js';
import { stringId } from '../../ids/index.js';
import type { DefinitionHandle, EntityId } from '../../ids/index.js';
import type { Registry } from '../../registry/types.js';
import type { Footprint } from '../spatial.js';
import type {
  CommitPolicy,
  ConstructionCost,
  ConstructionPlan,
  DeconstructPolicy,
} from '../construction/types.js';
import type { PlacementSpec } from './types.js';

type Data = { readonly [key: string]: JsonValue };

const asRecord = (value: JsonValue | undefined): Data | null =>
  value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)
    ? (value as Data)
    : null;

const asArray = (value: JsonValue | undefined): readonly JsonValue[] =>
  Array.isArray(value) ? (value as readonly JsonValue[]) : [];

const asInt = (value: JsonValue | undefined): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) ? value : null;

const handle = (
  registry: Registry,
  type: Parameters<Registry['handleOf']>[0],
  id: JsonValue | undefined,
): DefinitionHandle | null =>
  typeof id === 'string' ? registry.handleOf(type, stringId(id)) : null;

const costsOf = (registry: Registry, value: JsonValue | undefined): readonly ConstructionCost[] => {
  const costs: ConstructionCost[] = [];
  for (const entry of asArray(value)) {
    const record = asRecord(entry);
    if (record === null) continue;
    const resource = handle(registry, 'resource', record['resource']);
    const quantity = asInt(record['quantity']);
    if (resource === null || quantity === null) continue;
    costs.push({ resource, quantity });
  }
  return costs;
};

const footprintOf = (value: JsonValue | undefined): Footprint | null => {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const list = value as readonly JsonValue[];
  const width = asInt(list[0]);
  const height = asInt(list[1]);
  if (width === null || height === null || width < 1 || height < 1) return null;
  return { width, height };
};

const conditionsOf = (
  registry: Registry,
  value: JsonValue | undefined,
): readonly DefinitionHandle[] => {
  const list: readonly JsonValue[] = Array.isArray(value)
    ? (value as readonly JsonValue[])
    : value === undefined
      ? []
      : [value];
  const conditions: DefinitionHandle[] = [];
  for (const entry of list) {
    const resolved = handle(registry, 'condition', entry);
    if (resolved !== null) conditions.push(resolved);
  }
  return conditions;
};

/** The raw component record of an entity definition, or `null`. */
export function entityComponentsOf(registry: Registry, definition: DefinitionHandle): Data | null {
  const data = registry.definitionDataOf?.('entity', definition);
  const record = data === undefined || data === null ? null : asRecord(data);
  return record === null ? null : asRecord(record['components']);
}

/** True when the registry can resolve `definition` to entity-definition data. */
export function isKnownEntityDefinition(registry: Registry, definition: DefinitionHandle): boolean {
  return entityComponentsOf(registry, definition) !== null;
}

/**
 * The resolved placement spec of an entity definition, or `null` when the
 * definition is unknown (CONT-6.8).
 *
 * Source: CONT-6.8, GDD-18.2
 */
export function placementSpecOf(
  registry: Registry,
  definition: DefinitionHandle,
): PlacementSpec | null {
  const components = entityComponentsOf(registry, definition);
  if (components === null) return null;
  const placement = asRecord(components['placement']) ?? {};
  const capacityCost = asInt(placement['capacity_cost']) ?? 0;
  return {
    capacityCost,
    footprint: footprintOf(placement['footprint']),
    conditions: conditionsOf(registry, placement['conditions']),
  };
}

/**
 * The resolved construction plan of an entity definition, or `null` when the
 * definition declares no `construction` component (GDD-18.1, CONT-6.8).
 *
 * Source: GDD-18.1, CONT-6.8
 */
export function constructionPlanOf(
  registry: Registry,
  definition: DefinitionHandle,
  inventory: EntityId | null,
): ConstructionPlan | null {
  const components = entityComponentsOf(registry, definition);
  if (components === null) return null;
  const construction = asRecord(components['construction']);
  if (construction === null) return null;
  const commitPolicy: CommitPolicy =
    construction['commit_policy'] === 'start' || construction['commit_policy'] === 'continuous'
      ? construction['commit_policy']
      : 'completion';
  const deconstruction = asRecord(construction['deconstruction']);
  const deconstruct: DeconstructPolicy | null =
    deconstruction === null
      ? null
      : {
          duration: asInt(deconstruction['duration_ticks']) ?? 0,
          returns: costsOf(registry, deconstruction['returns']),
          cancelReservations: deconstruction['cancel_reservations'] === true,
        };
  return {
    duration: asInt(construction['duration_ticks']) ?? 0,
    costs: costsOf(registry, construction['costs']),
    commitPolicy,
    inventory,
    deconstruct,
  };
}

/** True when the definition declares an `initially_enabled: false` lifecycle. */
export function initiallyEnabledOf(registry: Registry, definition: DefinitionHandle): boolean {
  const components = entityComponentsOf(registry, definition);
  const lifecycle = asRecord(components?.['lifecycle']);
  return lifecycle?.['initially_enabled'] !== false;
}
