/**
 * Codecs for the M2 read models: entity detail, location summary, and need
 * breakdown (PIC-10.1–10.3).
 *
 * Source: PIC-10.1, PIC-10.2, PIC-10.3, TDS-22
 */
import type { ProtocolError } from '../errors.js';
import type {
  EntityDetailDto,
  LocationSummaryDto,
  NeedBreakdownDto,
  PlanningChainDto,
  PlanningChainStageDto,
  PlanningDto,
  PlanningScopeDto,
  PlanningTierDto,
  TransportActionDto,
  TransportCargoDto,
  TransportCargoSlotDto,
  TransportDetailDto,
  TransportProgressDto,
  TransportStationDto,
} from '../readmodels.js';
import { err, ok, type DecodeResult } from '../result.js';
import {
  invalidField,
  isBoolean,
  isJsonObject,
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
  const residence = value['residence'];
  if (residence !== undefined) {
    if (isObject(residence)) detail['residence'] = residence;
    else errors.push(invalidField('residence'));
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

/** Decodes the planning read model (PIC-10.5). */
export function decodePlanning(value: unknown): DecodeResult<PlanningDto> {
  if (!isObject(value)) return err([invalidField('')]);
  const errors: ProtocolError[] = [];

  const ownerId = value['owner_id'];
  if (!isString(ownerId)) errors.push(invalidField('owner_id'));

  const resources: { resource_id: string; scopes: PlanningScopeDto[] }[] = [];
  const rawResources = value['resources'];
  if (!Array.isArray(rawResources)) {
    errors.push(invalidField('resources'));
  } else {
    rawResources.forEach((rawResource, resourceIndex) => {
      if (!isObject(rawResource)) {
        errors.push(invalidField(`resources[${resourceIndex}]`));
        return;
      }
      const resourceId = rawResource['resource_id'];
      if (!isString(resourceId))
        errors.push(invalidField(`resources[${resourceIndex}].resource_id`));
      const scopes: PlanningScopeDto[] = [];
      const rawScopes = rawResource['scopes'];
      if (!Array.isArray(rawScopes)) {
        errors.push(invalidField(`resources[${resourceIndex}].scopes`));
        return;
      }
      rawScopes.forEach((rawScope, scopeIndex) => {
        if (!isObject(rawScope)) {
          errors.push(invalidField(`resources[${resourceIndex}].scopes[${scopeIndex}]`));
          return;
        }
        const scope = rawScope['scope'];
        if (scope !== 'owner' && scope !== 'location') {
          errors.push(invalidField(`resources[${resourceIndex}].scopes[${scopeIndex}].scope`));
          return;
        }
        const netPerTick = rawScope['net_per_tick'];
        if (!isNonNegativeInteger(netPerTick)) {
          errors.push(
            invalidField(`resources[${resourceIndex}].scopes[${scopeIndex}].net_per_tick`),
          );
          return;
        }
        const path = `resources[${resourceIndex}].scopes[${scopeIndex}]`;
        const scopeBase: {
          scope: 'owner' | 'location';
          net_per_tick: number;
          tiers: PlanningTierDto[];
          location_id?: number;
        } = { scope, net_per_tick: netPerTick, tiers: [] };
        const locationId = rawScope['location_id'];
        if (locationId !== undefined) {
          if (isNonNegativeInteger(locationId)) scopeBase.location_id = locationId;
          else errors.push(invalidField(`${path}.location_id`));
        }
        const rawTiers = rawScope['tiers'];
        if (!Array.isArray(rawTiers)) {
          errors.push(invalidField(`${path}.tiers`));
          return;
        }
        let scopeValid = true;
        rawTiers.forEach((rawTier, tierIndex) => {
          if (!isObject(rawTier)) {
            errors.push(invalidField(`${path}.tiers[${tierIndex}]`));
            scopeValid = false;
            return;
          }
          const tierId = rawTier['tier_id'];
          const perCapita = rawTier['per_capita_permille'];
          const supported = rawTier['supported'];
          const population = rawTier['consuming_population'];
          const coverage = rawTier['coverage_permille'];
          if (!isString(tierId)) errors.push(invalidField(`${path}.tiers[${tierIndex}].tier_id`));
          if (!isNonNegativeInteger(perCapita)) {
            errors.push(invalidField(`${path}.tiers[${tierIndex}].per_capita_permille`));
          }
          if (!isNonNegativeInteger(supported)) {
            errors.push(invalidField(`${path}.tiers[${tierIndex}].supported`));
          }
          if (!isNonNegativeInteger(population)) {
            errors.push(invalidField(`${path}.tiers[${tierIndex}].consuming_population`));
          }
          if (!isNonNegativeInteger(coverage)) {
            errors.push(invalidField(`${path}.tiers[${tierIndex}].coverage_permille`));
          }
          if (
            isString(tierId) &&
            isNonNegativeInteger(perCapita) &&
            isNonNegativeInteger(supported) &&
            isNonNegativeInteger(population) &&
            isNonNegativeInteger(coverage)
          ) {
            scopeBase.tiers.push({
              tier_id: tierId,
              per_capita_permille: perCapita,
              supported,
              consuming_population: population,
              coverage_permille: coverage,
            });
          } else {
            scopeValid = false;
          }
        });
        if (scopeValid) scopes.push(scopeBase);
      });
      if (isString(resourceId)) resources.push({ resource_id: resourceId, scopes });
    });
  }

  const chains: PlanningChainDto[] = [];
  const rawChains = value['chains'];
  if (!Array.isArray(rawChains)) {
    errors.push(invalidField('chains'));
  } else {
    rawChains.forEach((rawChain, chainIndex) => {
      if (!isObject(rawChain)) {
        errors.push(invalidField(`chains[${chainIndex}]`));
        return;
      }
      const resourceId = rawChain['resource_id'];
      if (!isString(resourceId)) errors.push(invalidField(`chains[${chainIndex}].resource_id`));
      const output = rawChain['output_per_tick'];
      if (!isNonNegativeInteger(output)) {
        errors.push(invalidField(`chains[${chainIndex}].output_per_tick`));
      }
      const stages: PlanningChainStageDto[] = [];
      const rawStages = rawChain['stages'];
      if (!Array.isArray(rawStages)) {
        errors.push(invalidField(`chains[${chainIndex}].stages`));
        return;
      }
      let chainValid = true;
      rawStages.forEach((rawStage, stageIndex) => {
        if (!isObject(rawStage)) {
          errors.push(invalidField(`chains[${chainIndex}].stages[${stageIndex}]`));
          chainValid = false;
          return;
        }
        const definitionId = rawStage['definition_id'];
        const count = rawStage['count'];
        const ratio = rawStage['ratio'];
        const stageOutput = rawStage['output_per_tick'];
        const footprint = rawStage['footprint'];
        const maintenance = rawStage['maintenance_per_interval'];
        const demand = rawStage['capability_demand'];
        if (!isString(definitionId)) {
          errors.push(invalidField(`chains[${chainIndex}].stages[${stageIndex}].definition_id`));
        }
        if (!isNonNegativeInteger(count)) {
          errors.push(invalidField(`chains[${chainIndex}].stages[${stageIndex}].count`));
        }
        if (!isNonNegativeInteger(ratio)) {
          errors.push(invalidField(`chains[${chainIndex}].stages[${stageIndex}].ratio`));
        }
        if (!isNonNegativeInteger(stageOutput)) {
          errors.push(invalidField(`chains[${chainIndex}].stages[${stageIndex}].output_per_tick`));
        }
        if (!isNonNegativeInteger(footprint)) {
          errors.push(invalidField(`chains[${chainIndex}].stages[${stageIndex}].footprint`));
        }
        if (!isNonNegativeInteger(maintenance)) {
          errors.push(
            invalidField(`chains[${chainIndex}].stages[${stageIndex}].maintenance_per_interval`),
          );
        }
        if (!isJsonObject(demand)) {
          errors.push(
            invalidField(`chains[${chainIndex}].stages[${stageIndex}].capability_demand`),
          );
        }
        if (
          isString(definitionId) &&
          isNonNegativeInteger(count) &&
          isNonNegativeInteger(ratio) &&
          isNonNegativeInteger(stageOutput) &&
          isNonNegativeInteger(footprint) &&
          isNonNegativeInteger(maintenance) &&
          isJsonObject(demand)
        ) {
          stages.push({
            definition_id: definitionId,
            count,
            ratio,
            output_per_tick: stageOutput,
            footprint,
            maintenance_per_interval: maintenance,
            capability_demand: demand as Readonly<Record<string, number>>,
          });
        } else {
          chainValid = false;
        }
      });
      if (isString(resourceId) && isNonNegativeInteger(output) && chainValid) {
        chains.push({ resource_id: resourceId, output_per_tick: output, stages });
      }
    });
  }

  if (errors.length > 0 || !isString(ownerId))
    return err(errors.length > 0 ? errors : [invalidField('owner_id')]);
  return ok({ owner_id: ownerId, resources, chains });
}

/** Decodes the transport detail read model (PIC-10.4). */
export function decodeTransportDetail(value: unknown): DecodeResult<TransportDetailDto> {
  if (!isObject(value)) return err([invalidField('')]);
  const errors: ProtocolError[] = [];
  const entityId = value['entity_id'];
  if (!isNonNegativeInteger(entityId)) errors.push(invalidField('entity_id'));
  const state = value['state'];
  if (!isString(state)) errors.push(invalidField('state'));
  if (errors.length > 0 || !isNonNegativeInteger(entityId) || !isString(state)) {
    return err(errors.length > 0 ? errors : [invalidField('entity_id')]);
  }
  const detail: {
    entity_id: number;
    state: string;
    order_id?: number;
    mode?: string;
    stations?: TransportStationDto[];
    current_station?: number;
    connection_path?: string[];
    cargo?: TransportCargoDto;
    progress?: TransportProgressDto;
    failure_reasons?: string[];
  } = { entity_id: entityId, state };
  const orderId = value['order_id'];
  if (orderId !== undefined) {
    if (isNonNegativeInteger(orderId)) detail.order_id = orderId;
    else errors.push(invalidField('order_id'));
  }
  const mode = value['mode'];
  if (mode !== undefined) {
    if (isString(mode)) detail.mode = mode;
    else errors.push(invalidField('mode'));
  }
  const currentStation = value['current_station'];
  if (currentStation !== undefined) {
    if (isNonNegativeInteger(currentStation)) detail.current_station = currentStation;
    else errors.push(invalidField('current_station'));
  }
  const connectionPath = value['connection_path'];
  if (connectionPath !== undefined) {
    if (isStringArray(connectionPath)) detail.connection_path = [...connectionPath];
    else errors.push(invalidField('connection_path'));
  }
  const failureReasons = value['failure_reasons'];
  if (failureReasons !== undefined) {
    if (isStringArray(failureReasons)) detail.failure_reasons = [...failureReasons];
    else errors.push(invalidField('failure_reasons'));
  }
  const rawStations = value['stations'];
  if (rawStations !== undefined) {
    if (!Array.isArray(rawStations)) {
      errors.push(invalidField('stations'));
    } else {
      const stations: TransportStationDto[] = [];
      rawStations.forEach((raw, index) => {
        if (!isObject(raw)) {
          errors.push(invalidField(`stations[${index}]`));
          return;
        }
        const endpoint = raw['endpoint_id'];
        const rawActions = raw['actions'];
        if (!isString(endpoint)) errors.push(invalidField(`stations[${index}].endpoint_id`));
        if (!Array.isArray(rawActions)) {
          errors.push(invalidField(`stations[${index}].actions`));
          return;
        }
        const actions: TransportActionDto[] = [];
        rawActions.forEach((rawAction, actionIndex) => {
          if (!isObject(rawAction)) {
            errors.push(invalidField(`stations[${index}].actions[${actionIndex}]`));
            return;
          }
          const resource = rawAction['resource_id'];
          const action = rawAction['action'];
          const ruleMode = rawAction['rule_mode'];
          const quantity = rawAction['quantity'];
          if (!isString(resource)) {
            errors.push(invalidField(`stations[${index}].actions[${actionIndex}].resource_id`));
          }
          if (!isString(action)) {
            errors.push(invalidField(`stations[${index}].actions[${actionIndex}].action`));
          }
          if (!isString(ruleMode)) {
            errors.push(invalidField(`stations[${index}].actions[${actionIndex}].rule_mode`));
          }
          if (quantity !== undefined && !isNonNegativeInteger(quantity)) {
            errors.push(invalidField(`stations[${index}].actions[${actionIndex}].quantity`));
          }
          if (isString(resource) && isString(action) && isString(ruleMode)) {
            actions.push({
              resource_id: resource,
              action,
              rule_mode: ruleMode,
              ...(isNonNegativeInteger(quantity) ? { quantity } : {}),
            });
          }
        });
        if (isString(endpoint)) stations.push({ endpoint_id: endpoint, actions });
      });
      detail.stations = stations;
    }
  }
  const rawCargo = value['cargo'];
  if (rawCargo !== undefined) {
    if (!isObject(rawCargo)) {
      errors.push(invalidField('cargo'));
    } else {
      const policy = rawCargo['policy'];
      const rawSlots = rawCargo['slots'];
      if (!isString(policy)) errors.push(invalidField('cargo.policy'));
      if (!Array.isArray(rawSlots)) {
        errors.push(invalidField('cargo.slots'));
      } else if (isString(policy)) {
        const slots: TransportCargoSlotDto[] = [];
        rawSlots.forEach((rawSlot, index) => {
          if (!isObject(rawSlot)) {
            errors.push(invalidField(`cargo.slots[${index}]`));
            return;
          }
          const slot = rawSlot['slot'];
          const resource = rawSlot['resource_id'];
          const quantity = rawSlot['quantity'];
          if (!isNonNegativeInteger(slot)) errors.push(invalidField(`cargo.slots[${index}].slot`));
          if (resource !== undefined && !isString(resource)) {
            errors.push(invalidField(`cargo.slots[${index}].resource_id`));
          }
          if (!isNonNegativeInteger(quantity)) {
            errors.push(invalidField(`cargo.slots[${index}].quantity`));
          }
          if (isNonNegativeInteger(slot) && isNonNegativeInteger(quantity)) {
            slots.push({
              slot,
              quantity,
              ...(isString(resource) ? { resource_id: resource } : {}),
            });
          }
        });
        detail.cargo = { policy, slots };
      }
    }
  }
  const rawProgress = value['progress'];
  if (rawProgress !== undefined) {
    if (!isObject(rawProgress)) {
      errors.push(invalidField('progress'));
    } else {
      const actionIndex = rawProgress['action_index'];
      const handled = rawProgress['handled'];
      const target = rawProgress['target'];
      if (!isNonNegativeInteger(actionIndex)) errors.push(invalidField('progress.action_index'));
      if (!isNonNegativeInteger(handled)) errors.push(invalidField('progress.handled'));
      if (!isNonNegativeInteger(target)) errors.push(invalidField('progress.target'));
      if (
        isNonNegativeInteger(actionIndex) &&
        isNonNegativeInteger(handled) &&
        isNonNegativeInteger(target)
      ) {
        detail.progress = { action_index: actionIndex, handled, target };
      }
    }
  }
  if (errors.length > 0) return err(errors);
  return ok(detail as unknown as TransportDetailDto);
}
