/**
 * Codecs for the M2 read models: entity detail, location summary, and need
 * breakdown (PIC-10.1–10.3).
 *
 * Source: PIC-10.1, PIC-10.2, PIC-10.3, TDS-22
 */
import type { ProtocolError } from '../errors.js';
import type { EntityDetailDto, LocationSummaryDto, NeedBreakdownDto } from '../readmodels.js';
import { err, ok, type DecodeResult } from '../result.js';
import {
  invalidField,
  isBoolean,
  isNonNegativeInteger,
  isObject,
  isString,
  isStringArray,
} from './guards.js';

/** Decodes the entity detail read model (PIC-10.1). */
export function decodeEntityDetail(value: unknown): DecodeResult<EntityDetailDto> {
  if (!isObject(value)) return err([invalidField('')]);
  const errors: ProtocolError[] = [];

  const entityId = value['entity_id'];
  if (!isNonNegativeInteger(entityId)) errors.push(invalidField('entity_id'));
  const definitionId = value['definition_id'];
  if (!isString(definitionId)) errors.push(invalidField('definition_id'));
  const lifecycle = value['lifecycle'];
  if (!isString(lifecycle)) errors.push(invalidField('lifecycle'));
  const enabled = value['enabled'];
  if (!isBoolean(enabled)) errors.push(invalidField('enabled'));
  const availableCommands = value['available_commands'];
  if (!isStringArray(availableCommands)) errors.push(invalidField('available_commands'));
  const blockReasons = value['block_reasons'];
  if (!isStringArray(blockReasons)) errors.push(invalidField('block_reasons'));

  if (errors.length > 0) return err(errors);

  const detail: { entity_id: number } & Record<string, unknown> = {
    entity_id: entityId as number,
    definition_id: definitionId,
    lifecycle: lifecycle,
    enabled: enabled,
    available_commands: availableCommands,
    block_reasons: blockReasons,
  };
  const locationId = value['location_id'];
  if (locationId !== undefined) {
    if (isNonNegativeInteger(locationId)) detail['location_id'] = locationId;
    else errors.push(invalidField('location_id'));
  }
  const ownerId = value['owner_id'];
  if (ownerId !== undefined) {
    if (isString(ownerId)) detail['owner_id'] = ownerId;
    else errors.push(invalidField('owner_id'));
  }
  if (errors.length > 0) return err(errors);
  return ok(detail as unknown as EntityDetailDto);
}

/** Decodes the location summary read model (PIC-10.2). */
export function decodeLocationSummary(value: unknown): DecodeResult<LocationSummaryDto> {
  if (!isObject(value)) return err([invalidField('')]);
  const errors: ProtocolError[] = [];

  const entityId = value['entity_id'];
  if (!isNonNegativeInteger(entityId)) errors.push(invalidField('entity_id'));
  const knowledge = value['knowledge'];
  if (!isString(knowledge)) errors.push(invalidField('knowledge'));
  const active = value['active'];
  if (!isBoolean(active)) errors.push(invalidField('active'));

  if (errors.length > 0) return err(errors);
  return ok({
    entity_id: entityId as number,
    knowledge: knowledge as string,
    active: active as boolean,
  });
}

/** Decodes the need breakdown read model (PIC-10.3). */
export function decodeNeedBreakdown(value: unknown): DecodeResult<NeedBreakdownDto> {
  if (!isObject(value)) return err([invalidField('')]);
  const errors: ProtocolError[] = [];

  const entityId = value['entity_id'];
  if (!isNonNegativeInteger(entityId)) errors.push(invalidField('entity_id'));
  const needId = value['need_id'];
  if (!isString(needId)) errors.push(invalidField('need_id'));
  const demand = value['demand'];
  if (!isNonNegativeInteger(demand)) errors.push(invalidField('demand'));
  const delivered = value['delivered'];
  if (!isNonNegativeInteger(delivered)) errors.push(invalidField('delivered'));
  const fulfillment = value['fulfillment'];
  if (!isNonNegativeInteger(fulfillment)) errors.push(invalidField('fulfillment'));
  const category = value['category'];
  if (!isString(category)) errors.push(invalidField('category'));
  const categoryResult = value['category_result'];
  if (!isNonNegativeInteger(categoryResult)) errors.push(invalidField('category_result'));

  if (errors.length > 0) return err(errors);
  return ok({
    entity_id: entityId as number,
    need_id: needId as string,
    demand: demand as number,
    delivered: delivered as number,
    fulfillment: fulfillment as number,
    category: category as string,
    category_result: categoryResult as number,
  });
}
