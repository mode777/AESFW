/**
 * Production-graph validation (CONT-11.5): every consumed resource has a
 * provider, recipe cycles require a seeded member, and produced outputs never
 * target recomputed storage. Exchanges count as providers and seeds: they are
 * external markets (GDD-17) and 9.1 enforces sell < buy per good, so an
 * exchange can never seed its own arbitrage.
 *
 * Source: CONT-11.5, GDD-17
 */
import { det } from '@aesfw/core';
import type { Diagnostic } from '@aesfw/core';

import { diag } from '../diagnostics/diagnostics.js';
import type { RawDefinitions } from '../schemas/validate.js';
import {
  asArray,
  asRecord,
  asString,
  collection,
  entityIndex,
  recipeIndex,
  resourceIndex,
} from './common.js';

const outputTargets = (definitions: RawDefinitions): readonly Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const resources = resourceIndex(definitions);
  for (const recipe of collection(definitions, 'recipes')) {
    for (const entry of asArray(recipe['outputs'])) {
      const resource = asString(asRecord(entry)?.['resource']);
      if (resource === null) continue;
      if (resources.get(resource)?.recomputedStorage === true) {
        diagnostics.push(
          diag('invalid_output_storage', {
            definition: recipe.id,
            path: `/recipes/${recipe.id}/outputs`,
            args: { resource },
          }),
        );
      }
    }
  }
  const entities = entityIndex(definitions);
  for (const entity of collection(definitions, 'entity_definitions')) {
    const info = entities.get(entity.id);
    if (info === undefined) continue;
    for (const resource of info.sourceOutputs) {
      if (resources.get(resource)?.recomputedStorage === true) {
        diagnostics.push(
          diag('invalid_output_storage', {
            definition: entity.id,
            path: `/entity_definitions/${entity.id}/components/resource_source/outputs`,
            args: { resource },
          }),
        );
      }
    }
  }
  return diagnostics;
};

/**
 * Validates the production graph over a composed definition set, reporting
 * `unsourceable_resource`, `recipe_cycle_unseeded`, and
 * `invalid_output_storage`.
 *
 * Source: CONT-11.5
 */
export function validateProductionGraph(definitions: RawDefinitions): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // The sourcing requirement applies to runnable economies: a package that
  // declares no world is a definition library (framework tests build partial
  // slices whose inventories are stocked at runtime by the world builder).
  if (collection(definitions, 'worlds').length === 0) return outputTargets(definitions);

  const resourceFacts = resourceIndex(definitions);
  const recipes = recipeIndex(definitions);
  const entities = entityIndex(definitions);

  // Non-recipe providers: the first provider definition per resource, in
  // collection scan order (deterministic insertion order).
  const providers = new Map<string, string>();
  const noteProvider = (resource: string | null, providerId: string): void => {
    if (resource === null) return;
    if (!providers.has(resource)) providers.set(resource, providerId);
  };
  for (const entity of collection(definitions, 'entity_definitions')) {
    const info = entities.get(entity.id);
    if (info === undefined) continue;
    for (const resource of info.sourceOutputs) noteProvider(resource, entity.id);
  }
  for (const tier of collection(definitions, 'population_tiers')) {
    for (const entry of asArray(tier['outputs'])) {
      noteProvider(asString(asRecord(entry)?.['resource']), tier.id);
    }
  }
  for (const exchange of collection(definitions, 'exchanges')) {
    for (const entry of asArray(exchange['goods'])) {
      const good = asRecord(entry);
      if (asRecord(good?.['buy_from_exchange']) === null) continue;
      noteProvider(asString(good?.['resource']), exchange.id);
    }
  }
  for (const world of collection(definitions, 'worlds')) {
    for (const owner of asArray(world['owners'])) {
      for (const entry of asArray(asRecord(owner)?.['initial_resources'])) {
        noteProvider(asString(asRecord(entry)?.['resource']), world.id);
      }
    }
  }

  // Recipe outputs by resource.
  const recipeOutputs = new Map<string, string[]>();
  for (const [recipeId, info] of recipes) {
    for (const resource of info.outputs) {
      const existing = recipeOutputs.get(resource);
      if (existing === undefined) recipeOutputs.set(resource, [recipeId]);
      else existing.push(recipeId);
    }
  }

  // Consumers in canonical collection order; first consumer per resource wins.
  const consumed = new Map<string, string>();
  const noteConsumer = (resource: string | null, consumerId: string): void => {
    if (resource === null) return;
    if (!consumed.has(resource)) consumed.set(resource, consumerId);
  };
  for (const recipe of collection(definitions, 'recipes')) {
    const info = recipes.get(recipe.id);
    if (info === undefined) continue;
    for (const resource of info.inputs) noteConsumer(resource, recipe.id);
  }
  // Need demands are deliberately excluded: an unmet need is gameplay
  // (deficit and decline are first-class mechanics), and CONT-11.6 owns
  // "need consumption with inadequate maximum production" as an economic
  // diagnostic (roadmap 10.2). The production graph rejects resources the
  // production machinery itself cannot run without.
  for (const entity of collection(definitions, 'entity_definitions')) {
    const info = entities.get(entity.id);
    if (info === undefined) continue;
    for (const resource of info.maintenanceInputs) noteConsumer(resource, entity.id);
    const construction = asRecord(asRecord(entity['components'])?.['construction']);
    for (const entry of asArray(construction?.['costs'])) {
      noteConsumer(asString(asRecord(entry)?.['resource']), entity.id);
    }
  }
  for (const unit of collection(definitions, 'transport_units')) {
    for (const entry of asArray(asRecord(unit['maintenance'])?.['inputs'])) {
      noteConsumer(asString(asRecord(entry)?.['resource']), unit.id);
    }
  }
  for (const transition of collection(definitions, 'transitions')) {
    for (const entry of asArray(transition['costs'])) {
      noteConsumer(asString(asRecord(entry)?.['resource']), transition.id);
    }
  }
  for (const establishment of collection(definitions, 'location_establishments')) {
    for (const entry of asArray(establishment['costs'])) {
      noteConsumer(asString(asRecord(entry)?.['resource']), establishment.id);
    }
  }

  for (const [resource, consumerId] of consumed) {
    if (providers.has(resource) || recipeOutputs.has(resource)) continue;
    // Owner- and global-scoped resources are balances, not produced
    // commodities: income and deficit policy govern them (GDD-7.5).
    const scope = resourceFacts.get(resource)?.scope;
    if (scope === 'owner' || scope === 'global') continue;
    diagnostics.push(
      diag('unsourceable_resource', {
        definition: consumerId,
        args: { resource },
      }),
    );
  }

  // Tarjan SCC over recipes: A -> B when A consumes a resource B produces.
  const successors = new Map<string, string[]>();
  for (const [recipeId, info] of recipes) {
    const next = new Set<string>();
    for (const resource of info.inputs) {
      for (const producer of recipeOutputs.get(resource) ?? []) next.add(producer);
    }
    successors.set(recipeId, [...next].sort(det.compareStrings));
  }
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  let counter = 0;
  const components: string[][] = [];
  const selfLoop = new Set<string>();
  for (const [recipeId, info] of recipes) {
    if (info.inputs.some((resource) => recipeOutputs.get(resource)?.includes(recipeId))) {
      selfLoop.add(recipeId);
    }
  }
  const strongConnect = (start: string): void => {
    const call: { id: string; cursor: number } = { id: start, cursor: 0 };
    const frames: { id: string; cursor: number }[] = [call];
    while (frames.length > 0) {
      const frame = frames[frames.length - 1];
      if (frame === undefined) break;
      const next = successors.get(frame.id) ?? [];
      if (frame.cursor === 0) {
        index.set(frame.id, counter);
        low.set(frame.id, counter);
        counter += 1;
        stack.push(frame.id);
        onStack.add(frame.id);
      }
      if (frame.cursor < next.length) {
        const target = next[frame.cursor];
        frame.cursor += 1;
        if (target === undefined) continue;
        if (!index.has(target)) {
          frames.push({ id: target, cursor: 0 });
        } else if (onStack.has(target)) {
          const targetIndex = index.get(target) ?? 0;
          if (targetIndex < (low.get(frame.id) ?? 0)) low.set(frame.id, targetIndex);
        }
        continue;
      }
      frames.pop();
      const parent = frames[frames.length - 1];
      if (parent !== undefined) {
        if ((low.get(frame.id) ?? 0) < (low.get(parent.id) ?? 0)) {
          low.set(parent.id, low.get(frame.id) ?? 0);
        }
      }
      if (low.get(frame.id) === index.get(frame.id)) {
        const component: string[] = [];
        for (;;) {
          const member = stack.pop();
          if (member === undefined) break;
          onStack.delete(member);
          component.push(member);
          if (member === frame.id) break;
        }
        component.sort(det.compareStrings);
        components.push(component);
      }
    }
  };
  for (const recipeId of recipes.keys()) {
    if (!index.has(recipeId)) strongConnect(recipeId);
  }

  const reportCycle = (component: readonly string[]): void => {
    const seeded = component.some((recipeId) =>
      recipes.get(recipeId)?.outputs.some((resource) => providers.has(resource)),
    );
    if (seeded) return;
    diagnostics.push(
      diag('recipe_cycle_unseeded', {
        definition: component[0] ?? '',
        args: { cycle: component.join(',') },
      }),
    );
  };
  for (const component of components) {
    if (component.length > 1) reportCycle(component);
    else if (component[0] !== undefined && selfLoop.has(component[0])) reportCycle(component);
  }

  diagnostics.push(...outputTargets(definitions));
  return diagnostics;
}
