/**
 * Default world plan (CONT-6.6). When no world definition is present, each
 * location template with `activation.initial: true` becomes one location for a
 * single default owner. The plan is plain data consumed by `instantiateWorld`.
 *
 * Source: CONT-6.4, CONT-6.6
 */
import { GRID_POLICY_ID, det, ids } from '@aesfw/core';
import type {
  Diagnostic,
  InventoryPlan,
  LocationGridPlan,
  LocationPlan,
  LocationProperty,
  SourceSlot,
  WorldPlan,
} from '@aesfw/core';

import { diag } from '../diagnostics/diagnostics.js';
import type { ContentRegistry } from '../registry/types.js';
import type { JsonValue } from '../types.js';

/** The outcome of deriving a default world plan. */
export interface DefaultWorldPlanResult {
  readonly plan: WorldPlan;
  readonly diagnostics: readonly Diagnostic[];
}

const asRecord = (value: JsonValue | undefined): Record<string, JsonValue> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, JsonValue>)
    : null;

const mapProperties = (value: JsonValue | undefined): LocationProperty[] => {
  const record = asRecord(value);
  if (record === null) return [];
  return Object.keys(record)
    .sort(det.compareStrings)
    .map((key) => ({ property: ids.stringId(key), value: Number(record[key] ?? 0) }));
};

const mapSourceSlots = (value: JsonValue | undefined): SourceSlot[] => {
  if (!Array.isArray(value)) return [];
  const slots: SourceSlot[] = [];
  for (const entry of value as readonly JsonValue[]) {
    const record = asRecord(entry);
    if (record === null) continue;
    const type = record['type'];
    const count = record['count'];
    if (typeof type !== 'string') continue;
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) continue;
    slots.push({ type: ids.stringId(type), count });
  }
  return slots.sort((a, b) => det.compareStrings(a.type, b.type));
};

const mapInventories = (value: JsonValue | undefined): InventoryPlan[] => {
  if (!Array.isArray(value)) return [];
  const list = value as readonly JsonValue[];
  const result: InventoryPlan[] = [];
  for (const entry of list) {
    const record = asRecord(entry);
    if (record === null) continue;
    const capacity = asRecord(record['capacity']);
    const quantity = capacity?.['quantity'];
    if (typeof quantity !== 'number') continue;
    const perResource = capacity?.['mode'] === 'per_resource';
    result.push({
      capacity: perResource
        ? { total: null, perResource: quantity }
        : { total: quantity, perResource: null },
      acceptance: { accepts: [] },
      policy: typeof record['access_policy'] === 'string' ? record['access_policy'] : '',
    });
  }
  return result;
};

const isPositiveInt = (value: JsonValue | undefined): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

const mapGrid = (params: Record<string, JsonValue> | null): LocationGridPlan | null => {
  const width = params?.['width'];
  const height = params?.['height'];
  if (!isPositiveInt(width) || !isPositiveInt(height)) return null;
  const blockedCells = params?.['blocked_cells'];
  if (Array.isArray(blockedCells)) {
    const blocked = blockedCells
      .filter((cell): cell is number => typeof cell === 'number' && Number.isInteger(cell))
      .sort((a, b) => a - b);
    return { width, height, blocked, buildableRatio: null };
  }
  const ratio = asRecord(params?.['buildable_ratio']);
  const min = ratio?.['min'];
  const max = ratio?.['max'];
  if (typeof min !== 'number' || !Number.isInteger(min)) return null;
  if (typeof max !== 'number' || !Number.isInteger(max)) return null;
  return { width, height, blocked: null, buildableRatio: { min, max } };
};

/**
 * Derives the default world plan from compiled location templates (CONT-6.6).
 *
 * Source: CONT-6.4, CONT-6.6
 */
export function defaultWorldPlan(registry: ContentRegistry): DefaultWorldPlanResult {
  const diagnostics: Diagnostic[] = [];
  const locations: LocationPlan[] = [];
  for (const definition of registry.definitionsOf('location')) {
    if (registry.stringIdOf('location', definition.handle) === null) {
      diagnostics.push(diag('unknown_location_template', { definition: definition.id }));
      continue;
    }
    const data = asRecord(definition.data);
    if (data === null) continue;
    const activation = asRecord(data['activation']);
    if (activation?.['initial'] !== true) continue;
    const spatialPolicy = typeof data['spatial_policy'] === 'string' ? data['spatial_policy'] : '';
    const params = asRecord(data['spatial_parameters']);
    if (spatialPolicy === GRID_POLICY_ID) {
      const grid = mapGrid(params);
      if (grid === null) {
        diagnostics.push(
          diag('unsupported_spatial_parameter', {
            definition: definition.id,
            args: { policy: spatialPolicy, parameter: 'width_height' },
          }),
        );
        continue;
      }
      locations.push({
        template: definition.handle,
        spatialPolicy,
        capacity: grid.width * grid.height,
        properties: mapProperties(data['properties']),
        sourceSlots: mapSourceSlots(data['source_slots']),
        region: null,
        active: true,
        inventories: mapInventories(data['inventories']),
        grid,
      });
      continue;
    }
    const totalCapacity = params?.['total_capacity'];
    if (
      typeof totalCapacity !== 'number' ||
      !Number.isInteger(totalCapacity) ||
      totalCapacity < 0
    ) {
      diagnostics.push(
        diag('unsupported_spatial_parameter', {
          definition: definition.id,
          args: { policy: spatialPolicy, parameter: 'total_capacity' },
        }),
      );
      continue;
    }
    locations.push({
      template: definition.handle,
      spatialPolicy,
      capacity: totalCapacity,
      properties: mapProperties(data['properties']),
      sourceSlots: mapSourceSlots(data['source_slots']),
      region: null,
      active: true,
      inventories: mapInventories(data['inventories']),
    });
  }
  return { plan: { owner: ids.ownerHandle(0), locations }, diagnostics };
}
