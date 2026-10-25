/**
 * Economic diagnostics (CONT-11.6): static balance checks over composed
 * definitions. Every finding is warning severity by default and error
 * severity when `LoadOptions.economic_diagnostics` is `'error'`. Rates are
 * per-tick integers (design D2): source outputs at their static maximum, one
 * producer instance per recipe, population outputs excluded from supply
 * maxima because they scale with population.
 *
 * Source: CONT-11.6
 */
import type { Diagnostic } from '@aesfw/core';

import { diag } from '../diagnostics/diagnostics.js';
import type { RawDefinitions } from '../schemas/validate.js';
import type { LoadOptions } from '../types.js';
import {
  asArray,
  asRecord,
  asString,
  collection,
  entityIndex,
  recipeIndex,
  resourceIndex,
} from './common.js';

const promoted = (options: LoadOptions | undefined): boolean =>
  options?.economic_diagnostics === 'error';

/** Per-resource static rates the checks share. */
interface EconomyIndex {
  /** Maximum static production rate per tick, excluding population outputs. */
  readonly staticRate: Map<string, number>;
  /** Resources with at least one provider of any kind (incl. population). */
  readonly provided: Set<string>;
  /** Capability resources with at least one producer (population or source). */
  readonly capabilityProvided: Set<string>;
  /** Owner-scoped income sources per resource. */
  readonly ownerIncome: Set<string>;
  /** Base buy prices per exchange good. */
  readonly buyPrice: Map<string, number>;
  /** Base sell prices per exchange good. */
  readonly sellPrice: Map<string, number>;
}

const buildEconomyIndex = (definitions: RawDefinitions): EconomyIndex => {
  const staticRate = new Map<string, number>();
  const provided = new Set<string>();
  const capabilityProvided = new Set<string>();
  const ownerIncome = new Set<string>();
  const buyPrice = new Map<string, number>();
  const sellPrice = new Map<string, number>();
  const noteRate = (
    resource: string | null,
    rate: number,
    provider: 'plain' | 'capability',
  ): void => {
    if (resource === null) return;
    provided.add(resource);
    if (provider === 'capability') capabilityProvided.add(resource);
    staticRate.set(resource, Math.max(staticRate.get(resource) ?? 0, rate));
  };

  for (const entity of collection(definitions, 'entity_definitions')) {
    const source = asRecord(asRecord(entity['components'])?.['resource_source']);
    for (const entry of asArray(source?.['outputs'])) {
      const resource = asString(asRecord(entry)?.['resource']);
      const rate = asRecord(entry)?.['quantity_per_tick'];
      noteRate(resource, typeof rate === 'number' ? rate : 0, 'plain');
    }
  }
  for (const tier of collection(definitions, 'population_tiers')) {
    for (const entry of asArray(tier['outputs'])) {
      const record = asRecord(entry);
      const resource = asString(record?.['resource']);
      const scope = asString(record?.['scope']);
      if (resource === null) continue;
      provided.add(resource);
      capabilityProvided.add(resource);
      if (scope === 'owner' || scope === 'global') ownerIncome.add(resource);
    }
  }
  for (const exchange of collection(definitions, 'exchanges')) {
    for (const entry of asArray(exchange['goods'])) {
      const good = asRecord(entry);
      const resource = asString(good?.['resource']);
      if (resource === null) continue;
      const buy = asRecord(good?.['buy_from_exchange'])?.['base_price'];
      const sell = asRecord(good?.['sell_to_exchange'])?.['base_price'];
      provided.add(resource);
      if (typeof buy === 'number') {
        buyPrice.set(resource, buy);
        ownerIncome.add(resource);
      }
      if (typeof sell === 'number') sellPrice.set(resource, sell);
    }
  }
  return { staticRate, provided, capabilityProvided, ownerIncome, buyPrice, sellPrice };
};

/**
 * Runs the CONT-11.6 economic checks over a composed definition set,
 * reporting `capability_deficit`, `negative_maintenance_balance`,
 * `inadequate_production`, `throughput_below_equilibrium`,
 * `storage_below_batch`, `transition_self_lock`, and
 * `exchange_arbitrage_risk`.
 *
 * Source: CONT-11.6
 */
export function validateEconomics(
  definitions: RawDefinitions,
  options: LoadOptions | undefined,
): readonly Diagnostic[] {
  const severity: 'warning' | 'error' = promoted(options) ? 'error' : 'warning';
  const diagnostics: Diagnostic[] = [];
  const economy = buildEconomyIndex(definitions);
  const resources = resourceIndex(definitions);
  const recipes = recipeIndex(definitions);
  const entities = entityIndex(definitions);

  // -- capability_deficit -------------------------------------------------
  for (const recipe of collection(definitions, 'recipes')) {
    for (const entry of asArray(recipe['capability_requirements'])) {
      const capability = asString(asRecord(entry)?.['resource']);
      if (capability === null) continue;
      if (economy.capabilityProvided.has(capability)) continue;
      diagnostics.push(
        diag('capability_deficit', {
          definition: recipe.id,
          path: `/recipes/${recipe.id}/capability_requirements`,
          severity,
          args: { capability },
        }),
      );
    }
  }

  // -- negative_maintenance_balance ---------------------------------------
  const chargedBalances = new Map<string, string>();
  const noteCharge = (resource: string | null, chargerId: string): void => {
    if (resource === null) return;
    if (chargedBalances.has(resource)) return;
    chargedBalances.set(resource, chargerId);
  };
  for (const entity of collection(definitions, 'entity_definitions')) {
    const info = entities.get(entity.id);
    if (info === undefined) continue;
    for (const resource of info.maintenanceInputs) noteCharge(resource, entity.id);
  }
  for (const unit of collection(definitions, 'transport_units')) {
    for (const entry of asArray(asRecord(unit['maintenance'])?.['inputs'])) {
      noteCharge(asString(asRecord(entry)?.['resource']), unit.id);
    }
  }
  for (const [resource, chargerId] of chargedBalances) {
    const scope = resources.get(resource)?.scope;
    if (scope !== 'owner' && scope !== 'global') continue;
    if (economy.ownerIncome.has(resource)) continue;
    diagnostics.push(
      diag('negative_maintenance_balance', {
        definition: chargerId,
        severity,
        args: { resource },
      }),
    );
  }

  // -- inadequate_production ----------------------------------------------
  for (const need of collection(definitions, 'needs')) {
    const demand = asRecord(need['demand']);
    if (asString(demand?.['type']) !== 'resource_consumption') continue;
    const resource = asString(demand?.['resource']);
    const rate = demand?.['quantity_per_population_per_tick'];
    if (resource === null || typeof rate !== 'number' || rate <= 0) continue;
    if (!economy.provided.has(resource)) continue; // intentional dead ends are content, not imbalance
    const supply = economy.staticRate.get(resource) ?? 0;
    if (supply >= rate) continue;
    diagnostics.push(
      diag('inadequate_production', {
        definition: need.id,
        path: `/needs/${need.id}/demand`,
        severity,
        args: { resource, demand: rate, supply },
      }),
    );
  }

  // -- throughput_below_equilibrium ---------------------------------------
  // Reuses the spatial consumer analysis per world for imported resources.
  diagnostics.push(...throughputFindings(definitions, entities, recipes, severity));

  // -- storage_below_batch -------------------------------------------------
  const inventoryCapacity = new Map<string, number>();
  for (const template of collection(definitions, 'location_templates')) {
    for (const entry of asArray(template['inventories'])) {
      const record = asRecord(entry);
      const id = asString(record?.['id']);
      const capacity = asRecord(record?.['capacity']);
      if (id === null || asString(capacity?.['mode']) !== 'total') continue;
      const quantity = capacity?.['quantity'];
      if (typeof quantity !== 'number') continue;
      const key = `location.${id}`;
      const existing = inventoryCapacity.get(key);
      inventoryCapacity.set(key, existing === undefined ? quantity : Math.min(existing, quantity));
    }
  }
  for (const entity of collection(definitions, 'entity_definitions')) {
    const info = entities.get(entity.id);
    if (info === undefined) continue;
    const producer = asRecord(asRecord(entity['components'])?.['producer']);
    const inputInventory = asString(producer?.['input_inventory']);
    const outputInventory = asString(producer?.['output_inventory']);
    for (const recipeId of info.producerRecipes) {
      const recipe = recipes.get(recipeId);
      if (recipe === undefined) continue;
      const recipeDef = collection(definitions, 'recipes').find((r) => r.id === recipeId);
      const batchTotal = (field: 'inputs' | 'outputs'): number =>
        asArray(recipeDef?.[field]).reduce((sum: number, entry) => {
          const quantity = asRecord(entry)?.['quantity'];
          return sum + (typeof quantity === 'number' ? quantity : 0);
        }, 0);
      const inputTotal = batchTotal('inputs');
      const outputTotal = batchTotal('outputs');
      if (inputInventory !== null && inputTotal > 0) {
        const capacity = inventoryCapacity.get(inputInventory);
        if (capacity !== undefined && capacity < inputTotal) {
          diagnostics.push(
            diag('storage_below_batch', {
              definition: entity.id,
              path: `/entity_definitions/${entity.id}/components/producer/input_inventory`,
              severity,
              args: { recipe: recipeId, inventory: inputInventory, capacity, batch: inputTotal },
            }),
          );
        }
      }
      if (outputInventory !== null && outputTotal > 0 && outputInventory !== inputInventory) {
        const capacity = inventoryCapacity.get(outputInventory);
        if (capacity !== undefined && capacity < outputTotal) {
          diagnostics.push(
            diag('storage_below_batch', {
              definition: entity.id,
              path: `/entity_definitions/${entity.id}/components/producer/output_inventory`,
              severity,
              args: { recipe: recipeId, inventory: outputInventory, capacity, batch: outputTotal },
            }),
          );
        }
      }
    }
  }

  // -- transition_self_lock -------------------------------------------------
  const tierOutputs = new Map<string, Set<string>>();
  for (const tier of collection(definitions, 'population_tiers')) {
    tierOutputs.set(tier.id, new Set());
  }
  for (const tier of collection(definitions, 'population_tiers')) {
    const outputs = tierOutputs.get(tier.id);
    if (outputs === undefined) continue;
    for (const entry of asArray(tier['outputs'])) {
      const resource = asString(asRecord(entry)?.['resource']);
      if (resource !== null) outputs.add(resource);
    }
  }
  // Providers of a resource as "produced by tier X": direct tier output, or a
  // recipe whose capability requirements are only produced by tier X.
  const tierOfProvider = new Map<string, string>();
  for (const tier of collection(definitions, 'population_tiers')) {
    for (const resource of tierOutputs.get(tier.id) ?? []) {
      if (!tierOfProvider.has(resource)) tierOfProvider.set(resource, tier.id);
    }
  }
  const recipeProvidersByCapability = new Map<string, string[]>();
  for (const recipe of collection(definitions, 'recipes')) {
    const capabilities = asArray(recipe['capability_requirements'])
      .map((entry) => asString(asRecord(entry)?.['resource']))
      .filter((id): id is string => id !== null);
    for (const capability of capabilities) {
      const tier = tierOfProvider.get(capability);
      if (tier === undefined) continue;
      const existing = recipeProvidersByCapability.get(capability);
      const list = existing ?? [];
      for (const output of recipes.get(recipe.id)?.outputs ?? []) {
        if (!tierOfProvider.has(output)) {
          list.push(output);
          for (const outputResource of recipes.get(recipe.id)?.outputs ?? []) {
            if (!tierOfProvider.has(outputResource)) tierOfProvider.set(outputResource, tier);
          }
        }
      }
      recipeProvidersByCapability.set(capability, list);
    }
  }
  for (const transition of collection(definitions, 'transitions')) {
    const targetTier = asString(transition['target_tier']);
    if (targetTier === null) continue;
    for (const entry of asArray(transition['costs'])) {
      const resource = asString(asRecord(entry)?.['resource']);
      if (resource === null) continue;
      const providerTier = tierOfProvider.get(resource);
      if (providerTier !== targetTier) continue;
      // A source or non-target output elsewhere makes the lock non-guaranteed.
      if ((economy.staticRate.get(resource) ?? 0) > 0) continue;
      diagnostics.push(
        diag('transition_self_lock', {
          definition: transition.id,
          path: `/transitions/${transition.id}/costs`,
          severity,
          args: { resource, target_tier: targetTier },
        }),
      );
    }
  }

  // -- exchange_arbitrage_risk ---------------------------------------------
  for (const recipe of collection(definitions, 'recipes')) {
    const info = recipes.get(recipe.id);
    if (info === undefined) continue;
    if (info.inputs.length === 0 || info.outputs.length === 0) continue;
    if (!info.inputs.every((resource) => economy.buyPrice.has(resource))) continue;
    if (!info.outputs.every((resource) => economy.sellPrice.has(resource))) continue;
    const buy = info.inputs.reduce(
      (sum, resource) => sum + (economy.buyPrice.get(resource) ?? 0),
      0,
    );
    const sell = info.outputs.reduce(
      (sum, resource) => sum + (economy.sellPrice.get(resource) ?? 0),
      0,
    );
    if (sell < buy) continue;
    diagnostics.push(
      diag('exchange_arbitrage_risk', {
        definition: recipe.id,
        path: `/recipes/${recipe.id}`,
        severity,
        args: { buy, sell },
      }),
    );
  }

  return diagnostics;
}

/**
 * Import equilibrium per world: for every consumed-at-a-location resource that
 * is not produced there, the carriers' round-trip capacity must meet the
 * consumer demand rate (design D3).
 */
const throughputFindings = (
  definitions: RawDefinitions,
  entities: ReadonlyMap<
    string,
    {
      readonly maintenanceInputs: readonly string[];
      readonly producerRecipes: readonly string[];
      readonly residenceTier: string | null;
      readonly sourceOutputs: readonly string[];
    }
  >,
  recipes: ReadonlyMap<
    string,
    { readonly inputs: readonly string[]; readonly outputs: readonly string[] }
  >,
  severity: 'warning' | 'error',
): readonly Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const tierNeeds = new Map<string, string[]>();
  for (const need of collection(definitions, 'needs')) {
    const demand = asRecord(need['demand']);
    if (asString(demand?.['type']) !== 'resource_consumption') continue;
    const resource = asString(demand?.['resource']);
    const rate = demand?.['quantity_per_population_per_tick'];
    if (resource === null || typeof rate !== 'number') continue;
    for (const tier of asArray(need['applies_to'])) {
      if (typeof tier !== 'string') continue;
      const existing = tierNeeds.get(tier);
      if (existing === undefined) tierNeeds.set(tier, [resource]);
      else existing.push(resource);
    }
  }
  const tierOutputsCache = new Map<string, Set<string>>();
  for (const tier of collection(definitions, 'population_tiers')) {
    const outputs = new Set<string>();
    for (const entry of asArray(tier['outputs'])) {
      const resource = asString(asRecord(entry)?.['resource']);
      if (resource !== null) outputs.add(resource);
    }
    tierOutputsCache.set(tier.id, outputs);
  }

  interface Unit {
    readonly slots: number;
    readonly slotCapacity: number;
  }
  const units: Unit[] = [];
  for (const unit of collection(definitions, 'transport_units')) {
    const cargo = asRecord(unit['cargo']);
    const slots = cargo?.['slots'];
    const slotCapacity = cargo?.['slot_capacity'];
    if (typeof slots !== 'number' || typeof slotCapacity !== 'number') continue;
    units.push({ slots, slotCapacity });
  }
  const connectionDuration = new Map<string, number>();
  for (const connection of collection(definitions, 'connections')) {
    const traversal = asRecord(connection['traversal']);
    const ticks = traversal?.['base_duration_ticks'];
    if (typeof ticks === 'number') connectionDuration.set(connection.id, ticks);
  }

  for (const world of collection(definitions, 'worlds')) {
    const adjacency = new Map<string, Map<string, number>>();
    const noteEdge = (from: string, to: string, ticks: number): void => {
      const inner = adjacency.get(from) ?? new Map<string, number>();
      const existing = inner.get(to);
      if (existing === undefined || ticks < existing) inner.set(to, ticks);
      adjacency.set(from, inner);
    };
    for (const entry of asArray(world['connections'])) {
      const record = asRecord(entry);
      if (record?.['enabled'] === false) continue;
      const definitionId = asString(record?.['definition']);
      const origin = asString(record?.['origin']);
      const destination = asString(record?.['destination']);
      if (definitionId === null || origin === null || destination === null) continue;
      const ticks = connectionDuration.get(definitionId) ?? 0;
      noteEdge(origin, destination, ticks);
      noteEdge(destination, origin, ticks);
    }
    const distance = (start: string): Map<string, number> => {
      const best = new Map<string, number>([[start, 0]]);
      const queue: string[] = [start];
      while (queue.length > 0) {
        const current = queue.shift();
        if (current === undefined) continue;
        const here = best.get(current) ?? 0;
        for (const [next, ticks] of adjacency.get(current) ?? []) {
          const total = here + ticks;
          if ((best.get(next) ?? Number.MAX_SAFE_INTEGER) <= total) continue;
          best.set(next, total);
          queue.push(next);
        }
      }
      return best;
    };

    const producers = new Map<string, Set<string>>();
    const consumers = new Map<string, Map<string, number>>();
    const noteProducer = (location: string, resource: string): void => {
      const set = producers.get(location);
      if (set === undefined) producers.set(location, new Set([resource]));
      else set.add(resource);
    };
    const noteConsumer = (location: string, resource: string, rate: number): void => {
      const inner = consumers.get(location) ?? new Map<string, number>();
      inner.set(resource, (inner.get(resource) ?? 0) + rate);
      consumers.set(location, inner);
    };
    for (const owner of asArray(world['owners'])) {
      for (const entity of asArray(asRecord(owner)?.['initial_entities'])) {
        const record = asRecord(entity);
        const definitionId = asString(record?.['definition']);
        const location = asString(record?.['location']);
        const info = definitionId === null ? undefined : entities.get(definitionId);
        if (location === null || info === undefined) continue;
        for (const recipeId of info.producerRecipes) {
          const recipe = recipes.get(recipeId);
          if (recipe === undefined) continue;
          for (const resource of recipe.outputs) noteProducer(location, resource);
          for (const resource of recipe.inputs) noteConsumer(location, resource, 1);
        }
        for (const resource of info.sourceOutputs) noteProducer(location, resource);
        for (const resource of info.maintenanceInputs) noteConsumer(location, resource, 1);
        if (info.residenceTier !== null) {
          for (const resource of tierOutputsCache.get(info.residenceTier) ?? []) {
            noteProducer(location, resource);
          }
          for (const resource of tierNeeds.get(info.residenceTier) ?? []) {
            noteConsumer(location, resource, 1);
          }
        }
      }
    }

    for (const [location, demanded] of consumers) {
      for (const [resource, demandRate] of demanded) {
        if (producers.get(location)?.has(resource)) continue;
        if (units.length === 0) continue;
        const distances = distance(location);
        let capacity = 0;
        for (const unit of units) {
          const roundTrip = [...distances.entries()]
            .filter(([target]) => producers.get(target)?.has(resource) === true)
            .reduce((best, [, ticks]) => Math.min(best, 2 * ticks), Number.MAX_SAFE_INTEGER);
          if (roundTrip === Number.MAX_SAFE_INTEGER) continue;
          capacity += Math.floor((unit.slots * unit.slotCapacity) / Math.max(roundTrip, 1));
        }
        if (capacity >= demandRate) continue;
        diagnostics.push(
          diag('throughput_below_equilibrium', {
            definition: world.id,
            path: `/worlds/${world.id}`,
            severity,
            args: { resource, location, demand: demandRate, capacity },
          }),
        );
      }
    }
  }
  return diagnostics;
};
