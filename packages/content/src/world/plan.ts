/**
 * Default world plan (CONT-6.6). When no world definition is present, each
 * location template with `activation.initial: true` becomes one location for a
 * single default owner. The plan is plain data consumed by `instantiateWorld`.
 *
 * Source: CONT-6.4, CONT-6.6
 */
import { GRID_POLICY_ID, det, ids } from '@aesfw/core';
import type {
  ConnectionPlan,
  DefinitionHandle,
  Diagnostic,
  GeneratedAttributesPlan,
  InitialEntityPlan,
  InternalLogisticsPlan,
  InventoryPlan,
  LocationGridPlan,
  LocationPlan,
  LocationProperty,
  OwnerPlan,
  SourceSlot,
  WorldPlan,
} from '@aesfw/core';

import { diag } from '../diagnostics/diagnostics.js';
import { matchesGlob } from '../registry/references.js';
import type { ContentRegistry } from '../registry/types.js';
import type { JsonValue } from '../types.js';

/** The default seed stream of a seeded distribution rule (CONT-6.18). */
export const DEFAULT_GENERATION_STREAM = 'world_generation';

/** The outcome of deriving a default world plan. */
export interface DefaultWorldPlanResult {
  readonly plan: WorldPlan;
  readonly diagnostics: readonly Diagnostic[];
}

const asArray = (value: JsonValue | undefined): readonly JsonValue[] =>
  Array.isArray(value) ? (value as readonly JsonValue[]) : [];

const asString = (value: JsonValue | undefined): string | null =>
  typeof value === 'string' ? value : null;

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

const mapInternalLogistics = (
  registry: ContentRegistry,
  value: JsonValue | undefined,
): InternalLogisticsPlan | undefined => {
  const record = asRecord(value);
  if (record === null) return undefined;
  const policy = record['policy'];
  if (typeof policy !== 'string') return undefined;
  const base = record['base_throughput'];
  const capabilityId = record['base_throughput_capability'];
  const capability =
    typeof capabilityId === 'string'
      ? registry.handleOf('resource', ids.stringId(capabilityId))
      : null;
  return {
    policy,
    baseThroughput: typeof base === 'number' && Number.isInteger(base) && base >= 0 ? base : 0,
    baseThroughputCapability: capability,
  };
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

const templatePlan = (
  registry: ContentRegistry,
  definition: { readonly handle: number; readonly id: string; readonly data: unknown },
  overrides: Record<string, JsonValue> | null,
  diagnostics: Diagnostic[],
): LocationPlan | null => {
  const data = asRecord(definition.data as JsonValue);
  if (data === null) return null;
  const merged: Record<string, JsonValue> = { ...data };
  if (overrides !== null) {
    for (const key of Object.keys(overrides)) {
      if (key === 'properties') {
        merged['properties'] = {
          ...(asRecord(data['properties']) ?? {}),
          ...(asRecord(overrides['properties']) ?? {}),
        };
      } else {
        merged[key] = overrides[key] ?? null;
      }
    }
  }
  // The effective region: an explicit world override (possibly clearing the
  // template's) wins, else the template's region field (CONT-6.18).
  const templateRegionId = typeof data['region'] === 'string' ? data['region'] : null;
  const overrideRegion =
    overrides !== null && Object.prototype.hasOwnProperty.call(overrides, 'region')
      ? typeof overrides['region'] === 'string'
        ? overrides['region']
        : null
      : undefined;
  const regionId = overrideRegion !== undefined ? overrideRegion : templateRegionId;
  const regionHandle =
    regionId === null ? null : registry.handleOf('region', ids.stringId(regionId));
  if (regionId !== null && regionHandle === null) {
    diagnostics.push(
      diag('unresolved_reference', {
        definition: definition.id,
        path: `/location_templates/${definition.id}/region`,
        args: { reference: regionId, expected: 'region' },
      }),
    );
  }
  // The establishment governing founding (CONT-6.20); validated at load, so a
  // dangling name here resolves to null and is reported the same way.
  const establishmentId =
    typeof merged['establishment'] === 'string' ? merged['establishment'] : null;
  const establishmentHandle =
    establishmentId === null
      ? null
      : registry.handleOf('establishment', ids.stringId(establishmentId));
  if (establishmentId !== null && establishmentHandle === null) {
    diagnostics.push(
      diag('unresolved_reference', {
        definition: definition.id,
        path: `/location_templates/${definition.id}/establishment`,
        args: { reference: establishmentId, expected: 'establishment' },
      }),
    );
  }
  const activation = asRecord(merged['activation']);
  const active = activation?.['initial'] !== false;
  const spatialPolicy =
    typeof merged['spatial_policy'] === 'string' ? merged['spatial_policy'] : '';
  const params = asRecord(merged['spatial_parameters']);
  const internalLogistics = mapInternalLogistics(registry, merged['internal_logistics']);
  if (spatialPolicy === GRID_POLICY_ID) {
    const grid = mapGrid(params);
    if (grid === null) {
      diagnostics.push(
        diag('unsupported_spatial_parameter', {
          definition: definition.id,
          args: { policy: spatialPolicy, parameter: 'width_height' },
        }),
      );
      return null;
    }
    return {
      template: definition.handle as LocationPlan['template'],
      spatialPolicy,
      capacity: grid.width * grid.height,
      properties: mapProperties(merged['properties']),
      sourceSlots: mapSourceSlots(merged['source_slots']),
      region: regionHandle,
      ...(establishmentHandle === undefined || establishmentHandle === null
        ? {}
        : { establishment: establishmentHandle }),
      active,
      inventories: mapInventories(merged['inventories']),
      grid,
      ...(internalLogistics === undefined ? {} : { internalLogistics }),
    };
  }
  const totalCapacity = params?.['total_capacity'];
  if (typeof totalCapacity !== 'number' || !Number.isInteger(totalCapacity) || totalCapacity < 0) {
    diagnostics.push(
      diag('unsupported_spatial_parameter', {
        definition: definition.id,
        args: { policy: spatialPolicy, parameter: 'total_capacity' },
      }),
    );
    return null;
  }
  return {
    template: definition.handle as LocationPlan['template'],
    spatialPolicy,
    capacity: totalCapacity,
    properties: mapProperties(merged['properties']),
    sourceSlots: mapSourceSlots(merged['source_slots']),
    region: regionHandle,
    ...(establishmentHandle === null ? {} : { establishment: establishmentHandle }),
    active,
    inventories: mapInventories(merged['inventories']),
    ...(internalLogistics === undefined ? {} : { internalLogistics }),
  };
};

/**
 * Attaches seeded generation descriptors (CONT-6.18) to the plan's locations.
 * The matched-name universes are the property names and slot types authored on
 * the catalogue's location templates plus the selected world's location
 * entries; each rule assigns them to its regions at instantiation time.
 *
 * Source: GDD-6.5, CONT-6.18
 */
const attachGeneration = (
  registry: ContentRegistry,
  plan: WorldPlan,
  worldData: Record<string, JsonValue> | null,
): WorldPlan => {
  const rules = registry.definitionsOf('distributionRule');
  if (rules.length === 0) return plan;
  const propertyUniverse = new Set<string>();
  const slotUniverse = new Set<string>();
  const absorb = (data: Record<string, JsonValue> | null): void => {
    if (data === null) return;
    const properties = asRecord(data['properties']);
    if (properties !== null) {
      for (const name of Object.keys(properties)) propertyUniverse.add(name);
    }
    for (const raw of asArray(data['source_slots'])) {
      const slot = asRecord(raw);
      const type = typeof slot?.['type'] === 'string' ? slot['type'] : null;
      if (type !== null) slotUniverse.add(type);
    }
  };
  for (const definition of registry.definitionsOf('location')) {
    absorb(definition.data as Record<string, JsonValue>);
  }
  if (worldData !== null) {
    for (const raw of asArray(worldData['locations'])) {
      const entry = asRecord(raw);
      if (entry !== null) absorb(entry);
    }
  }
  const descriptors = new Map<DefinitionHandle, GeneratedAttributesPlan>();
  const sortedRules = [...rules].sort((a, b) => det.compareStrings(a.id, b.id));
  for (const rule of sortedRules) {
    const data = asRecord(rule.data);
    if (data === null) continue;
    const generation = asRecord(data['generation']);
    if (generation?.['mode'] !== 'seeded') continue;
    const disjoint = asRecord(data['disjoint']);
    const globs = asArray(disjoint?.['properties']).filter(
      (entry): entry is string => typeof entry === 'string',
    );
    const wantSlots = disjoint?.['source_slot_types'] === true;
    const stream =
      typeof generation['seed_stream'] === 'string'
        ? generation['seed_stream']
        : DEFAULT_GENERATION_STREAM;
    const regions = asArray(data['regions'])
      .map((entry) =>
        typeof entry === 'string' ? registry.handleOf('region', ids.stringId(entry)) : null,
      )
      .filter((handle): handle is DefinitionHandle => handle !== null)
      .sort((a, b) => a - b);
    if (regions.length < 2) continue;
    const propertyNames = [...propertyUniverse]
      .filter((name) => globs.some((pattern) => matchesGlob(name, pattern)))
      .sort(det.compareStrings)
      .map((name) => ids.stringId(name));
    const slotTypes = wantSlots
      ? [...slotUniverse].sort(det.compareStrings).map((type) => ids.stringId(type))
      : [];
    const descriptor: GeneratedAttributesPlan = {
      streamName: stream,
      regions,
      propertyNames,
      slotTypes,
    };
    for (const handle of regions) descriptors.set(handle, descriptor);
  }
  if (descriptors.size === 0) return plan;
  const locations = plan.locations.map((location) => {
    if (location.region === null) return location;
    const generated = descriptors.get(location.region);
    return generated === undefined ? location : { ...location, generated };
  });
  return { ...plan, locations };
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
    const plan = templatePlan(registry, definition, null, diagnostics);
    if (plan !== null) locations.push(plan);
  }
  const result: WorldPlan = { owner: ids.ownerHandle(0), locations };
  return { plan: attachGeneration(registry, result, null), diagnostics };
}

/**
 * Derives a world plan from a world definition (CONT-6.6). With no id, the
 * first world definition in ascending ID order is used; with no world
 * definition at all, the default plan is returned.
 *
 * Source: CONT-6.6
 */
export function worldPlan(
  registry: ContentRegistry,
  worldId: string | null = null,
): DefaultWorldPlanResult {
  const worlds = registry.definitionsOf('world');
  if (worlds.length === 0) return defaultWorldPlan(registry);
  let world = worlds[0];
  if (worldId !== null) {
    world = worlds.find((entry) => entry.id === worldId);
    if (world === undefined) {
      return {
        plan: { owner: ids.ownerHandle(0), locations: [] },
        diagnostics: [diag('unknown_world', { definition: worldId })],
      };
    }
  }
  if (world === undefined) return defaultWorldPlan(registry);
  const data = asRecord(world.data);
  if (data === null) return defaultWorldPlan(registry);
  const diagnostics: Diagnostic[] = [];

  const ownerEntries = asArray(data['owners'])
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, JsonValue> => entry !== null)
    .sort((a, b) => det.compareStrings(asString(a['id']) ?? '', asString(b['id']) ?? ''));
  const locationEntries = asArray(data['locations'])
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, JsonValue> => entry !== null)
    .sort((a, b) => det.compareStrings(asString(a['id']) ?? '', asString(b['id']) ?? ''));
  const locationIndexById = new Map<string, number>();
  locationEntries.forEach((entry, index) =>
    locationIndexById.set(asString(entry['id']) ?? '', index),
  );
  const locationOwnerByIndex = new Map<number, number>();
  ownerEntries.forEach((entry, index) => {
    for (const locationId of asArray(entry['established_locations'])) {
      const locationIndex = locationIndexById.get(asString(locationId) ?? '');
      if (locationIndex !== undefined && !locationOwnerByIndex.has(locationIndex)) {
        locationOwnerByIndex.set(locationIndex, index);
      }
    }
  });

  const locations: LocationPlan[] = [];
  for (let locationIndex = 0; locationIndex < locationEntries.length; locationIndex += 1) {
    const entry = locationEntries[locationIndex];
    if (entry === undefined) continue;
    const templateId = typeof entry['template'] === 'string' ? entry['template'] : '';
    const handle = registry.handleOf('location', ids.stringId(templateId));
    if (handle === null) {
      diagnostics.push(
        diag('unknown_world_location', {
          definition: world.id,
          args: { location: asString(entry['id']) ?? '', template: templateId },
        }),
      );
      continue;
    }
    const definition = registry.definitionOf('location', handle);
    if (definition === null) continue;
    const plan = templatePlan(registry, definition, entry, diagnostics);
    if (plan === null) continue;
    const establishedOwner = locationOwnerByIndex.get(locationIndex);
    const owner = establishedOwner === undefined ? null : ids.ownerHandle(establishedOwner);
    const initialInventory = asArray(entry['initial_inventory'])
      .map((item) => {
        const record = asRecord(item);
        const resourceId = asString(record?.['resource']);
        const quantity = record?.['quantity'];
        const resource =
          resourceId === null ? null : registry.handleOf('resource', ids.stringId(resourceId));
        if (resource === null || typeof quantity !== 'number' || !Number.isInteger(quantity)) {
          return null;
        }
        return { resource, quantity };
      })
      .filter(
        (item): item is { resource: DefinitionHandle; quantity: number } => item !== null,
      );
    locations.push({
      ...plan,
      owner,
      ...(initialInventory.length === 0 ? {} : { initialInventory }),
    });
  }

  const connections: ConnectionPlan[] = [];
  const connectionEntries = asArray(data['connections'])
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, JsonValue> => entry !== null)
    .sort((a, b) => det.compareStrings(asString(a['id']) ?? '', asString(b['id']) ?? ''));
  for (const entry of connectionEntries) {
    const definitionId = typeof entry['definition'] === 'string' ? entry['definition'] : '';
    const definitionHandle = registry.handleOf('connection', ids.stringId(definitionId));
    const definitionData =
      definitionHandle === null
        ? null
        : asRecord(registry.definitionDataOf?.('connection', definitionHandle));
    if (definitionHandle === null || definitionData === null) {
      diagnostics.push(
        diag('unknown_world_connection', {
          definition: world.id,
          args: { connection: asString(entry['id']) ?? '', definition: definitionId },
        }),
      );
      continue;
    }
    const originIndex = locationIndexById.get(asString(entry['origin']) ?? '');
    const destinationIndex = locationIndexById.get(asString(entry['destination']) ?? '');
    if (originIndex === undefined || destinationIndex === undefined) continue;
    const traversal = asRecord(definitionData['traversal']);
    const instanceDuration = entry['base_duration_ticks'];
    const baseDuration =
      typeof instanceDuration === 'number' && Number.isInteger(instanceDuration)
        ? instanceDuration
        : typeof traversal?.['base_duration_ticks'] === 'number'
          ? traversal['base_duration_ticks']
          : 1;
    const tags = asArray(definitionData['allowed_transport_tags']).filter(
      (tag): tag is string => typeof tag === 'string',
    );
    connections.push({
      id: ids.stringId(asString(entry['id']) ?? ''),
      definition: definitionHandle,
      originIndex,
      destinationIndex,
      direction: definitionData['direction'] === 'one_way' ? 'one_way' : 'bidirectional',
      baseDurationTicks: baseDuration,
      enabled: entry['enabled'] !== false,
      allowedTransportTags: tags.map((tag) => ids.stringId(tag)),
    });
  }

  const initialEntities: InitialEntityPlan[] = [];
  ownerEntries.forEach((entry, ownerIndex) => {
    for (const raw of asArray(entry['initial_entities'])) {
      const record = asRecord(raw);
      const definitionId = asString(record?.['definition']);
      const locationId = asString(record?.['location']);
      if (definitionId === null || locationId === null) continue;
      const definition = registry.handleOf('entity', ids.stringId(definitionId));
      const locationIndex = locationIndexById.get(locationId);
      if (definition === null || locationIndex === undefined) continue;
      initialEntities.push({
        definition,
        locationIndex,
        owner: ids.ownerHandle(ownerIndex),
      });
    }
  });

  const owners: OwnerPlan[] = ownerEntries.map((entry, index) => {
    const accounts = asArray(entry['initial_resources'])
      .map((resource) => {
        const record = asRecord(resource);
        const resourceId = typeof record?.['resource'] === 'string' ? record['resource'] : '';
        const handle = registry.handleOf('resource', ids.stringId(resourceId));
        const quantity = record?.['quantity'];
        if (handle === null || typeof quantity !== 'number' || !Number.isInteger(quantity)) {
          return null;
        }
        return { resource: handle, amount: quantity };
      })
      .filter(
        (account): account is { resource: DefinitionHandle; amount: number } => account !== null,
      )
      .sort((a, b) => a.resource - b.resource);
    const knowledge: { locationIndex: number; level: 'discovered' | 'established' }[] = [];
    for (const locationId of asArray(entry['established_locations'])) {
      const locationIndex = locationIndexById.get(asString(locationId) ?? '');
      if (locationIndex !== undefined) knowledge.push({ locationIndex, level: 'established' });
    }
    for (const locationId of asArray(entry['known_locations'])) {
      const locationIndex = locationIndexById.get(asString(locationId) ?? '');
      if (locationIndex !== undefined) knowledge.push({ locationIndex, level: 'discovered' });
    }
    return {
      handle: ids.ownerHandle(index),
      accounts,
      knowledge,
    };
  });

  const plan: WorldPlan = {
    owner: ids.ownerHandle(0),
    ...(owners.length === 0 ? {} : { owners }),
    locations,
    ...(connections.length === 0 ? {} : { connections }),
    ...(initialEntities.length === 0 ? {} : { initialEntities }),
  };
  return { plan: attachGeneration(registry, plan, data), diagnostics };
}
