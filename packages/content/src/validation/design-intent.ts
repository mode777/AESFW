/**
 * Design-intent diagnostics (CONT-11.7): static reports of whether the core
 * design ideas of the GDD are active in a content package. Opt-in through
 * `LoadOptions.design_intent` (default `'off'`); findings are warnings unless
 * promoted to errors. All analyses iterate in canonical collection order and
 * ascending ID.
 *
 * Source: CONT-11.7, GDD-3.2
 */
import { det } from '@aesfw/core';
import type { Diagnostic } from '@aesfw/core';

import { diag } from '../diagnostics/diagnostics.js';
import type { RawDefinition, RawDefinitions } from '../schemas/validate.js';
import type { LoadOptions } from '../types.js';
import { asArray, asRecord, asString, collection, entityIndex, recipeIndex } from './common.js';

const SCARCITY_ORDER: readonly string[] = [
  'asymmetric_decline',
  'disjoint_distribution',
  'exact_capability_binding',
  'finite_source_slots',
  'finite_space',
  'maintenance_while_idle',
  'throughput_limit',
];

const find = (definitions: RawDefinitions, key: string, id: string) =>
  collection(definitions, key).find((definition) => definition.id === id);

/**
 * Runs the CONT-11.7 design-intent checks over a composed definition set,
 * reporting `inactive_scarcities`, `self_sufficient_region`,
 * `cross_region_absent`, `pyramid_bypass`, `breadth_depth_collapse`,
 * `coverage_absent`, `idle_cost_absent`, `decline_symmetric`,
 * `unbounded_trade`, and `ratio_illegible`. Emits nothing when the
 * `design_intent` option is `'off'` (the default).
 *
 * Source: CONT-11.7
 */
export function validateDesignIntent(
  definitions: RawDefinitions,
  options: LoadOptions | undefined,
): readonly Diagnostic[] {
  const mode = options?.design_intent ?? 'off';
  if (mode === 'off') return [];
  const severity: 'warning' | 'error' = mode === 'error' ? 'error' : 'warning';
  const diagnostics: Diagnostic[] = [];
  const recipes = recipeIndex(definitions);
  const entities = entityIndex(definitions);
  const declineIds = new Set<string>();
  for (const tier of collection(definitions, 'population_tiers')) {
    for (const entry of asArray(tier['decline_transitions'])) {
      if (typeof entry === 'string') declineIds.add(entry);
    }
  }

  // ---- scarcity audit (GDD-3.2) -----------------------------------------
  const inactive = new Set<string>(SCARCITY_ORDER);
  for (const template of collection(definitions, 'location_templates')) {
    const capacity = asRecord(template['spatial_parameters'])?.['total_capacity'];
    if (typeof capacity === 'number' && capacity > 0) inactive.delete('finite_space');
    const width = asRecord(template['spatial_parameters'])?.['width'];
    const height = asRecord(template['spatial_parameters'])?.['height'];
    if (typeof width === 'number' && typeof height === 'number') inactive.delete('finite_space');
    if (asRecord(template['internal_logistics']) !== null) inactive.delete('throughput_limit');
    for (const slot of asArray(template['source_slots'])) {
      if (asRecord(slot)?.['type'] !== null) inactive.delete('finite_source_slots');
    }
  }
  for (const entity of collection(definitions, 'entity_definitions')) {
    const source = asRecord(asRecord(entity['components'])?.['resource_source']);
    const policy = asString(source?.['policy']);
    if (policy === 'slot_dependent' || policy === 'area_dependent') {
      inactive.delete('finite_source_slots');
    }
    const depletion = asString(source?.['depletion']);
    if (depletion === 'finite' || depletion === 'regenerating') {
      inactive.delete('finite_source_slots');
    }
    const maintenance = asRecord(asRecord(entity['components'])?.['maintenance']);
    if (maintenance !== null && asString(maintenance['charge_policy']) !== 'while_processing') {
      inactive.delete('maintenance_while_idle');
    }
  }
  if (collection(definitions, 'distribution_rules').length > 0) {
    inactive.delete('disjoint_distribution');
  }
  const capabilityReqs: string[] = [];
  for (const recipe of collection(definitions, 'recipes')) {
    for (const entry of asArray(recipe['capability_requirements'])) {
      const capability = asString(asRecord(entry)?.['resource']);
      if (capability !== null) capabilityReqs.push(capability);
    }
  }
  if (capabilityReqs.length > 0) {
    const substituted = capabilityReqs.some((capability) => {
      const tags = asArray(find(definitions, 'resources', capability)?.['tags']);
      if (!tags.includes('capability')) return false;
      return asArray(find(definitions, 'resources', capability)?.['substitutes']).length > 0;
    });
    if (!substituted) inactive.delete('exact_capability_binding');
  }
  for (const transition of collection(definitions, 'transitions')) {
    if (!declineIds.has(transition.id)) continue;
    const refund = asRecord(transition['refund_policy']);
    if (refund === null || asString(refund['policy']) === 'none') {
      inactive.delete('asymmetric_decline');
    }
  }
  if (inactive.size > 0 && inactive.size < SCARCITY_ORDER.length) {
    diagnostics.push(
      diag('inactive_scarcities', {
        path: '/',
        severity,
        args: { scarcities: [...inactive].sort(det.compareStrings).join(',') },
      }),
    );
  } else if (inactive.size === SCARCITY_ORDER.length) {
    diagnostics.push(
      diag('inactive_scarcities', {
        path: '/',
        severity,
        args: { scarcities: SCARCITY_ORDER.join(',') },
      }),
    );
  }

  // ---- self-sufficiency and cross-region dependency ----------------------
  const demanded = new Set<string>();
  for (const need of collection(definitions, 'needs')) {
    const resource = asString(asRecord(need['demand'])?.['resource']);
    if (resource !== null) demanded.add(resource);
  }
  const advancementTargets = new Set<string>();
  for (const transition of collection(definitions, 'transitions')) {
    if (declineIds.has(transition.id)) continue;
    const target = asString(transition['target_tier']);
    if (target !== null) advancementTargets.add(target);
  }
  const advancementSources = new Set<string>();
  for (const transition of collection(definitions, 'transitions')) {
    if (declineIds.has(transition.id)) continue;
    const source = asString(transition['source_tier']);
    if (source !== null) advancementSources.add(source);
  }
  let topTier: string | null = null;
  for (const tier of collection(definitions, 'population_tiers')) {
    if (advancementSources.has(tier.id)) continue;
    if (topTier === null || tier.id < topTier) topTier = tier.id;
  }
  const topTierDemands = new Set<string>();
  if (topTier !== null) {
    for (const need of collection(definitions, 'needs')) {
      if (!asArray(need['applies_to']).includes(topTier)) continue;
      const resource = asString(asRecord(need['demand'])?.['resource']);
      if (resource !== null) topTierDemands.add(resource);
    }
  }
  const worldRegions = new Map<string, string>(); // location instance -> region
  for (const world of collection(definitions, 'worlds')) {
    const templates = new Map<string, string>();
    for (const entry of asArray(world['locations'])) {
      const templateId = asString(asRecord(entry)?.['template']);
      const instanceId = asString(asRecord(entry)?.['id']);
      if (templateId === null || instanceId === null) continue;
      templates.set(instanceId, templateId);
      const template = find(definitions, 'location_templates', templateId);
      const override = asString(asRecord(entry)?.['region']);
      const region = override ?? asString(template?.['region']);
      if (region !== null) worldRegions.set(instanceId, region);
    }
    // Origin resources: source outputs and population outputs. Recipe outputs
    // are derivable, not origins — provenance traces inputs back to origins.
    const producedByRegion = new Map<string, Set<string>>();
    const producedByLocation = new Map<string, Set<string>>();
    const note = (region: string | undefined, location: string, resource: string): void => {
      if (region !== undefined) {
        const set = producedByRegion.get(region) ?? new Set<string>();
        set.add(resource);
        producedByRegion.set(region, set);
      }
      const local = producedByLocation.get(location) ?? new Set<string>();
      local.add(resource);
      producedByLocation.set(location, local);
    };
    for (const owner of asArray(world['owners'])) {
      for (const entity of asArray(asRecord(owner)?.['initial_entities'])) {
        const record = asRecord(entity);
        const definitionId = asString(record?.['definition']);
        const location = asString(record?.['location']);
        const info = definitionId === null ? undefined : entities.get(definitionId);
        if (location === null || info === undefined) continue;
        const region = worldRegions.get(location);
        for (const resource of info.sourceOutputs) note(region, location, resource);
        void recipes;
        const tierId = info.residenceTier;
        if (tierId !== null) {
          const tierDef = find(definitions, 'population_tiers', tierId);
          for (const entry of asArray(tierDef?.['outputs'])) {
            const resource = asString(asRecord(entry)?.['resource']);
            if (resource !== null) note(region, location, resource);
          }
        }
      }
    }
    for (const [region, produced] of producedByRegion) {
      if (demanded.size === 0) continue;
      let sufficient = true;
      for (const resource of demanded) {
        if (regionCanProduce(definitions, recipes, resource, produced, new Set())) continue;
        sufficient = false;
        break;
      }
      if (sufficient) {
        diagnostics.push(
          diag('self_sufficient_region', {
            definition: world.id,
            path: `/worlds/${world.id}`,
            severity,
            args: { region },
          }),
        );
      }
    }
    // single-location self-sufficiency
    if (asArray(world['locations']).length === 1) {
      const instanceId = asString(asRecord(asArray(world['locations'])[0])?.['id']);
      const produced = instanceId === null ? undefined : producedByLocation.get(instanceId);
      if (produced !== undefined && demanded.size > 0) {
        let sufficient = true;
        for (const resource of demanded) {
          if (regionCanProduce(definitions, recipes, resource, produced, new Set())) continue;
          sufficient = false;
          break;
        }
        if (sufficient) {
          diagnostics.push(
            diag('self_sufficient_region', {
              definition: world.id,
              path: `/worlds/${world.id}`,
              severity,
              args: { region: instanceId ?? '' },
            }),
          );
        }
      }
    }
    // cross-region dependency of the top tier (multi-region worlds only)
    if (topTier !== null && topTierDemands.size > 0 && producedByRegion.size > 1) {
      for (const [region, produced] of producedByRegion) {
        let covers = true;
        for (const resource of topTierDemands) {
          if (regionCanProduce(definitions, recipes, resource, produced, new Set())) continue;
          covers = false;
          break;
        }
        if (covers) {
          diagnostics.push(
            diag('cross_region_absent', {
              definition: world.id,
              path: `/worlds/${world.id}`,
              severity,
              args: { tier: topTier, region },
            }),
          );
        }
      }
    }
  }

  // ---- pyramid, breadth, coverage ---------------------------------------
  for (const resource of collection(definitions, 'resources')) {
    const tags = asArray(resource['tags']);
    if (!tags.includes('capability')) continue;
    if (asArray(resource['substitutes']).length > 0) {
      diagnostics.push(
        diag('pyramid_bypass', {
          definition: resource.id,
          path: `/resources/${resource.id}/substitutes`,
          severity,
          args: { reason: 'substituted_capability' },
        }),
      );
    }
  }
  if (capabilityReqs.length === 0) {
    diagnostics.push(
      diag('pyramid_bypass', {
        path: '/',
        severity,
        args: { reason: 'no_capability_requirement' },
      }),
    );
  }
  for (const category of collection(definitions, 'need_categories')) {
    const evaluation = asRecord(category['evaluation']);
    if (asString(evaluation?.['mode']) !== 'weighted_score') continue;
    const members = asArray(category['members'])
      .map((entry) => asRecord(entry))
      .filter((entry) => entry !== null);
    if (members.length === 1) {
      diagnostics.push(
        diag('breadth_depth_collapse', {
          definition: category.id,
          path: `/need_categories/${category.id}/members`,
          severity,
          args: { reason: 'single_member' },
        }),
      );
      continue;
    }
    const weights = members
      .map((entry) => entry['weight'])
      .filter((weight): weight is number => typeof weight === 'number');
    if (weights.length > 1 && Math.min(...weights) === Math.max(...weights)) {
      diagnostics.push(
        diag('breadth_depth_collapse', {
          definition: category.id,
          path: `/need_categories/${category.id}/members`,
          severity,
          args: { reason: 'equal_weights' },
        }),
      );
    }
  }
  if (collection(definitions, 'needs').length > 0) {
    const hasCoverage = collection(definitions, 'needs').some(
      (need) => asString(asRecord(need['demand'])?.['type']) === 'spatial_coverage',
    );
    if (!hasCoverage) {
      diagnostics.push(diag('coverage_absent', { path: '/', severity, args: {} }));
    }
  }

  // ---- idle cost, decline symmetry, trade bounds, ratio legibility -------
  let maintenanceCount = 0;
  let idleCharging = 0;
  for (const entity of collection(definitions, 'entity_definitions')) {
    const maintenance = asRecord(asRecord(entity['components'])?.['maintenance']);
    if (maintenance === null) continue;
    maintenanceCount += 1;
    if (asString(maintenance['charge_policy']) !== 'while_processing') idleCharging += 1;
  }
  for (const unit of collection(definitions, 'transport_units')) {
    if (asRecord(unit['maintenance']) === null) continue;
    maintenanceCount += 1;
    if (asString(asRecord(unit['maintenance'])?.['charge_policy']) !== 'while_processing') {
      idleCharging += 1;
    }
  }
  if (idleCharging === 0) {
    diagnostics.push(
      diag('idle_cost_absent', { path: '/', severity, args: { maintenance: maintenanceCount } }),
    );
  }
  for (const transition of collection(definitions, 'transitions')) {
    if (!declineIds.has(transition.id)) continue;
    const symmetric =
      asString(asRecord(transition['conversion'])?.['population']) === 'retain_count' ||
      symmetricRefund(definitions, transition['refund_policy']);
    if (!symmetric) continue;
    diagnostics.push(
      diag('decline_symmetric', {
        definition: transition.id,
        path: `/transitions/${transition.id}`,
        severity,
        args: {},
      }),
    );
  }
  for (const exchange of collection(definitions, 'exchanges')) {
    const elasticity = asRecord(exchange['elasticity']);
    for (const entry of asArray(exchange['goods'])) {
      const good = asRecord(entry);
      if (good === null) continue;
      const enabled =
        asRecord(good['buy_from_exchange'])?.['enabled'] === true ||
        asRecord(good['sell_to_exchange'])?.['enabled'] === true;
      const step = elasticity?.['step_change_permille'];
      if (!enabled || step !== 0) continue;
      diagnostics.push(
        diag('unbounded_trade', {
          definition: exchange.id,
          path: `/exchanges/${exchange.id}/goods`,
          severity,
          args: { resource: asString(good['resource']) ?? '' },
        }),
      );
    }
  }
  const threshold = options?.ratio_legibility_threshold ?? 10;
  // Ratio legibility (CONT-11.7, A16): for every producer/consumer recipe pair
  // over one resource, the integer entity ratio n : m solves
  // n x supply = m x demand with per-entity rates quantity / duration
  // (continuous recipes use duration 1); the stage needs max(n, m) entities.
  const lines = (recipe: RawDefinition, key: 'inputs' | 'outputs') => {
    const duration = recipe['mode'] === 'continuous' ? 1 : recipe['duration_ticks'];
    if (typeof duration !== 'number' || !Number.isInteger(duration) || duration <= 0) return [];
    return asArray(recipe[key])
      .map((entry) => {
        const record = asRecord(entry);
        const resource = asString(record?.['resource']);
        const quantity = record?.['quantity'];
        if (resource === null || typeof quantity !== 'number' || !Number.isInteger(quantity)) {
          return null;
        }
        return quantity > 0 ? { resource, quantity, duration } : null;
      })
      .filter(
        (line): line is { resource: string; quantity: number; duration: number } => line !== null,
      );
  };
  const allRecipes = collection(definitions, 'recipes');
  for (const recipe of allRecipes) {
    let required = 0;
    for (const output of lines(recipe, 'outputs')) {
      for (const consumer of allRecipes) {
        for (const input of lines(consumer, 'inputs')) {
          if (input.resource !== output.resource) continue;
          const producers = input.quantity * output.duration;
          const consumers = output.quantity * input.duration;
          const divisor = greatestCommonDivisor(producers, consumers);
          required = Math.max(required, producers / divisor, consumers / divisor);
        }
      }
    }
    if (required <= threshold) continue;
    diagnostics.push(
      diag('ratio_illegible', {
        definition: recipe.id,
        path: `/recipes/${recipe.id}`,
        severity,
        args: { required, threshold },
      }),
    );
  }

  return diagnostics;
}

/** The greatest common divisor of two positive integers. */
const greatestCommonDivisor = (left: number, right: number): number => {
  let a = left;
  let b = right;
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a === 0 ? 1 : a;
};

/** True when `resource` originates in the region or a recipe can make it from region-origin resources (cycle-safe). */
const regionCanProduce = (
  definitions: RawDefinitions,
  recipes: ReadonlyMap<
    string,
    { readonly inputs: readonly string[]; readonly outputs: readonly string[] }
  >,
  resource: string,
  produced: ReadonlySet<string>,
  visiting: Set<string>,
): boolean => {
  if (produced.has(resource)) return true;
  if (visiting.has(resource)) return false;
  visiting.add(resource);
  for (const recipe of collection(definitions, 'recipes')) {
    const info = recipes.get(recipe.id);
    if (info === undefined || !info.outputs.includes(resource)) continue;
    if (
      info.inputs.every((input) =>
        regionCanProduce(definitions, recipes, input, produced, visiting),
      )
    ) {
      return true;
    }
  }
  return false;
};

/** True when the refund policy returns at least the full advancement value. */
const symmetricRefund = (definitions: RawDefinitions, policy: unknown): boolean => {
  const record = asRecord(policy);
  if (record === null) return false;
  if (asString(record['policy']) === 'fraction' && record['fraction'] === 1000) return true;
  return false;
};
