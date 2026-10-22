/**
 * Codecs for full snapshots and incremental deltas (PIC-9).
 *
 * Source: PIC-9, TDS-22
 */
import type { ProtocolError } from '../errors.js';
import { err, ok, type DecodeResult } from '../result.js';
import type {
  EntityDto,
  EntityUpdateDto,
  InventoryDto,
  InventoryEntryDto,
  InventoryUpdateDto,
  LocationDto,
  OwnerDto,
  SnapshotDeltaDto,
  SnapshotDto,
} from '../snapshot.js';
import {
  invalidField,
  isBoolean,
  isJsonObject,
  isNonNegativeInteger,
  isObject,
  isString,
  isStringArray,
} from './guards.js';

function decodeOwner(value: unknown, path: string, errors: ProtocolError[]): OwnerDto | null {
  if (!isObject(value)) {
    errors.push(invalidField(path));
    return null;
  }
  const ownerId = value['owner_id'];
  if (!isString(ownerId)) errors.push(invalidField(`${path}.owner_id`));
  const resources = value['resources'];
  if (!isJsonObject(resources)) errors.push(invalidField(`${path}.resources`));
  if (!isString(ownerId) || !isJsonObject(resources)) return null;
  return { owner_id: ownerId, resources: resources as Readonly<Record<string, number>> };
}

function decodeInventoryEntry(
  value: unknown,
  path: string,
  errors: ProtocolError[],
): InventoryEntryDto | null {
  if (!isObject(value)) {
    errors.push(invalidField(path));
    return null;
  }
  const resourceId = value['resource_id'];
  const stored = value['stored'];
  const reserved = value['reserved'];
  if (!isString(resourceId)) errors.push(invalidField(`${path}.resource_id`));
  if (!isNonNegativeInteger(stored)) errors.push(invalidField(`${path}.stored`));
  if (!isNonNegativeInteger(reserved)) errors.push(invalidField(`${path}.reserved`));
  if (!isString(resourceId) || !isNonNegativeInteger(stored) || !isNonNegativeInteger(reserved)) {
    return null;
  }
  const entry: InventoryEntryDto = { resource_id: resourceId, stored, reserved };
  return entry;
}

function decodeInventory(
  value: unknown,
  path: string,
  errors: ProtocolError[],
): InventoryDto | null {
  if (!isObject(value)) {
    errors.push(invalidField(path));
    return null;
  }
  const inventoryId = value['inventory_id'];
  if (!isNonNegativeInteger(inventoryId)) errors.push(invalidField(`${path}.inventory_id`));
  const rawEntries = value['entries'];
  const entries: InventoryEntryDto[] = [];
  if (!Array.isArray(rawEntries)) {
    errors.push(invalidField(`${path}.entries`));
  } else {
    rawEntries.forEach((raw, index) => {
      const decoded = decodeInventoryEntry(raw, `${path}.entries[${index}]`, errors);
      if (decoded !== null) entries.push(decoded);
    });
  }
  if (!isNonNegativeInteger(inventoryId)) return null;
  return { inventory_id: inventoryId, entries };
}

function decodeLocation(value: unknown, path: string, errors: ProtocolError[]): LocationDto | null {
  if (!isObject(value)) {
    errors.push(invalidField(path));
    return null;
  }
  const entityId = value['entity_id'];
  if (!isNonNegativeInteger(entityId)) {
    errors.push(invalidField(`${path}.entity_id`));
    return null;
  }
  const location: { entity_id: number } & Record<string, unknown> = { entity_id: entityId };
  const definitionId = value['definition_id'];
  if (definitionId !== undefined) {
    if (isString(definitionId)) location['definition_id'] = definitionId;
    else errors.push(invalidField(`${path}.definition_id`));
  }
  const ownerId = value['owner_id'];
  if (ownerId !== undefined) {
    if (isString(ownerId)) location['owner_id'] = ownerId;
    else errors.push(invalidField(`${path}.owner_id`));
  }
  const active = value['active'];
  if (active !== undefined) {
    if (isBoolean(active)) location['active'] = active;
    else errors.push(invalidField(`${path}.active`));
  }
  const rawInventories = value['inventories'];
  if (rawInventories !== undefined) {
    if (!Array.isArray(rawInventories)) {
      errors.push(invalidField(`${path}.inventories`));
    } else {
      const inventories: InventoryDto[] = [];
      rawInventories.forEach((raw, index) => {
        const decoded = decodeInventory(raw, `${path}.inventories[${index}]`, errors);
        if (decoded !== null) inventories.push(decoded);
      });
      location['inventories'] = inventories;
    }
  }
  const connections = value['connections'];
  if (connections !== undefined) {
    if (isStringArray(connections)) location['connections'] = connections;
    else errors.push(invalidField(`${path}.connections`));
  }
  return location;
}

function decodeEntity(value: unknown, path: string, errors: ProtocolError[]): EntityDto | null {
  if (!isObject(value)) {
    errors.push(invalidField(path));
    return null;
  }
  const entityId = value['entity_id'];
  if (!isNonNegativeInteger(entityId)) {
    errors.push(invalidField(`${path}.entity_id`));
    return null;
  }
  const entity: { entity_id: number } & Record<string, unknown> = { entity_id: entityId };
  const definitionId = value['definition_id'];
  if (definitionId !== undefined) {
    if (isString(definitionId)) entity['definition_id'] = definitionId;
    else errors.push(invalidField(`${path}.definition_id`));
  }
  const locationId = value['location_id'];
  if (locationId !== undefined) {
    if (isNonNegativeInteger(locationId)) entity['location_id'] = locationId;
    else errors.push(invalidField(`${path}.location_id`));
  }
  return entity;
}

function decodeEntityUpdate(
  value: unknown,
  path: string,
  errors: ProtocolError[],
): EntityUpdateDto | null {
  if (!isObject(value)) {
    errors.push(invalidField(path));
    return null;
  }
  const entityId = value['entity_id'];
  const component = value['component'];
  const fields = value['fields'];
  if (!isNonNegativeInteger(entityId)) errors.push(invalidField(`${path}.entity_id`));
  if (!isString(component)) errors.push(invalidField(`${path}.component`));
  if (!isJsonObject(fields)) errors.push(invalidField(`${path}.fields`));
  if (!isNonNegativeInteger(entityId) || !isString(component) || !isJsonObject(fields)) return null;
  return { entity_id: entityId, component, fields };
}

function decodeInventoryUpdate(
  value: unknown,
  path: string,
  errors: ProtocolError[],
): InventoryUpdateDto | null {
  if (!isObject(value)) {
    errors.push(invalidField(path));
    return null;
  }
  const inventoryId = value['inventory_id'];
  const resourceId = value['resource_id'];
  const stored = value['stored'];
  const reserved = value['reserved'];
  if (!isNonNegativeInteger(inventoryId)) errors.push(invalidField(`${path}.inventory_id`));
  if (!isString(resourceId)) errors.push(invalidField(`${path}.resource_id`));
  if (!isNonNegativeInteger(stored)) errors.push(invalidField(`${path}.stored`));
  if (!isNonNegativeInteger(reserved)) errors.push(invalidField(`${path}.reserved`));
  if (
    !isNonNegativeInteger(inventoryId) ||
    !isString(resourceId) ||
    !isNonNegativeInteger(stored) ||
    !isNonNegativeInteger(reserved)
  ) {
    return null;
  }
  return { inventory_id: inventoryId, resource_id: resourceId, stored, reserved };
}

/** Decodes a full snapshot (PIC-9.1). */
export function decodeSnapshot(value: unknown): DecodeResult<SnapshotDto> {
  if (!isObject(value)) return err([invalidField('')]);
  const errors: ProtocolError[] = [];

  const sessionId = value['session_id'];
  if (!isString(sessionId)) errors.push(invalidField('session_id'));
  const tick = value['tick'];
  if (!isNonNegativeInteger(tick)) errors.push(invalidField('tick'));
  const revision = value['revision'];
  if (!isNonNegativeInteger(revision)) errors.push(invalidField('revision'));
  const checksum = value['configuration_checksum'];
  if (!isString(checksum)) errors.push(invalidField('configuration_checksum'));

  const rawOwners = value['owners'];
  const owners: OwnerDto[] = [];
  if (!Array.isArray(rawOwners)) {
    errors.push(invalidField('owners'));
  } else {
    rawOwners.forEach((raw, index) => {
      const decoded = decodeOwner(raw, `owners[${index}]`, errors);
      if (decoded !== null) owners.push(decoded);
    });
  }

  const rawLocations = value['locations'];
  const locations: LocationDto[] = [];
  if (!Array.isArray(rawLocations)) {
    errors.push(invalidField('locations'));
  } else {
    rawLocations.forEach((raw, index) => {
      const decoded = decodeLocation(raw, `locations[${index}]`, errors);
      if (decoded !== null) locations.push(decoded);
    });
  }

  const rawEntities = value['entities'];
  const entities: EntityDto[] = [];
  if (!Array.isArray(rawEntities)) {
    errors.push(invalidField('entities'));
  } else {
    rawEntities.forEach((raw, index) => {
      const decoded = decodeEntity(raw, `entities[${index}]`, errors);
      if (decoded !== null) entities.push(decoded);
    });
  }

  if (errors.length > 0) return err(errors);
  return ok({
    session_id: sessionId as string,
    tick: tick as number,
    revision: revision as number,
    configuration_checksum: checksum as string,
    owners,
    locations,
    entities,
  });
}

/** Decodes an incremental delta (PIC-9.2). */
export function decodeSnapshotDelta(value: unknown): DecodeResult<SnapshotDeltaDto> {
  if (!isObject(value)) return err([invalidField('')]);
  const errors: ProtocolError[] = [];

  const sessionId = value['session_id'];
  if (!isString(sessionId)) errors.push(invalidField('session_id'));
  const fromRevision = value['from_revision'];
  if (!isNonNegativeInteger(fromRevision)) errors.push(invalidField('from_revision'));
  const toRevision = value['to_revision'];
  if (!isNonNegativeInteger(toRevision)) errors.push(invalidField('to_revision'));
  const tick = value['tick'];
  if (!isNonNegativeInteger(tick)) errors.push(invalidField('tick'));

  const rawEntityUpdates = value['entity_updates'];
  const entityUpdates: EntityUpdateDto[] = [];
  if (!Array.isArray(rawEntityUpdates)) {
    errors.push(invalidField('entity_updates'));
  } else {
    rawEntityUpdates.forEach((raw, index) => {
      const decoded = decodeEntityUpdate(raw, `entity_updates[${index}]`, errors);
      if (decoded !== null) entityUpdates.push(decoded);
    });
  }

  const rawInventoryUpdates = value['inventory_updates'];
  const inventoryUpdates: InventoryUpdateDto[] = [];
  if (!Array.isArray(rawInventoryUpdates)) {
    errors.push(invalidField('inventory_updates'));
  } else {
    rawInventoryUpdates.forEach((raw, index) => {
      const decoded = decodeInventoryUpdate(raw, `inventory_updates[${index}]`, errors);
      if (decoded !== null) inventoryUpdates.push(decoded);
    });
  }

  if (errors.length > 0) return err(errors);
  return ok({
    session_id: sessionId as string,
    from_revision: fromRevision as number,
    to_revision: toRevision as number,
    tick: tick as number,
    entity_updates: entityUpdates,
    inventory_updates: inventoryUpdates,
  });
}
