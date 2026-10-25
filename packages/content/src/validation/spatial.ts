/**
 * Spatial and logistics-graph validation (CONT-11.5): per world, a resource
 * consumed at a location but not produced, sourced, or population-output
 * there must be transportable and reachable through the connection graph with
 * a transport unit whose cargo accepts it and whose movement tags are
 * compatible with the path. Tag compatibility mirrors the runtime rule of the
 * route planner (`allowed_transport_tags` on the connection versus
 * `allowed_connection_tags` on the unit; an empty list on either side is
 * unrestricted). World `initial_resources` seed every location of the world.
 *
 * Source: CONT-11.5, ARCH-14.3
 */
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

interface ConnectionEdge {
  readonly from: string;
  readonly to: string;
  readonly allowedTransportTags: readonly string[];
  readonly enabled: boolean;
}

interface Carrier {
  readonly allowedConnectionTags: readonly string[];
  readonly acceptsTransportable: boolean;
  readonly acceptsAll: boolean;
}

const tagList = (value: unknown): readonly string[] =>
  asArray(value).filter((tag): tag is string => asString(tag) !== null);

/**
 * Validates the spatial and logistics graph over a composed definition set,
 * reporting `resource_unreachable`, `transport_tag_mismatch`, and
 * `establishment_cost_invalid`.
 *
 * Source: CONT-11.5
 */
export function validateSpatialGraph(definitions: RawDefinitions): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const resources = resourceIndex(definitions);
  const recipes = recipeIndex(definitions);
  const entities = entityIndex(definitions);

  const providerResources = new Set<string>();
  for (const entity of collection(definitions, 'entity_definitions')) {
    for (const resource of entities.get(entity.id)?.sourceOutputs ?? []) {
      providerResources.add(resource);
    }
  }
  for (const tier of collection(definitions, 'population_tiers')) {
    for (const entry of asArray(tier['outputs'])) {
      const resource = asString(asRecord(entry)?.['resource']);
      if (resource !== null) providerResources.add(resource);
    }
  }
  for (const exchange of collection(definitions, 'exchanges')) {
    for (const entry of asArray(exchange['goods'])) {
      if (asRecord(entry)?.['buy_from_exchange'] === undefined) continue;
      const resource = asString(asRecord(entry)?.['resource']);
      if (resource !== null) providerResources.add(resource);
    }
  }
  for (const world of collection(definitions, 'worlds')) {
    for (const owner of asArray(world['owners'])) {
      for (const entry of asArray(asRecord(owner)?.['initial_resources'])) {
        const resource = asString(asRecord(entry)?.['resource']);
        if (resource !== null) providerResources.add(resource);
      }
    }
  }

  const carriers: Carrier[] = [];
  for (const unit of collection(definitions, 'transport_units')) {
    const cargo = asRecord(unit['cargo']);
    const acceptance = asString(cargo?.['acceptance']);
    carriers.push({
      allowedConnectionTags: tagList(asRecord(unit['movement'])?.['allowed_connection_tags']),
      acceptsAll: acceptance === 'all',
      acceptsTransportable: acceptance === 'transportable_resources',
    });
  }

  const connectionTags = new Map<string, readonly string[]>();
  const connectionDirection = new Map<string, string>();
  for (const connection of collection(definitions, 'connections')) {
    connectionTags.set(connection.id, tagList(connection['allowed_transport_tags']));
    connectionDirection.set(connection.id, asString(connection['direction']) ?? 'bidirectional');
  }

  const tierOutputs = new Map<string, string[]>();
  for (const tier of collection(definitions, 'population_tiers')) {
    tierOutputs.set(
      tier.id,
      asArray(tier['outputs'])
        .map((entry) => asString(asRecord(entry)?.['resource']))
        .filter((id): id is string => id !== null),
    );
  }
  const exchangeBuyables = new Map<string, string[]>();
  for (const exchange of collection(definitions, 'exchanges')) {
    const template = asString(exchange['location']);
    if (template === null) continue;
    const buyable = asArray(exchange['goods'])
      .filter((entry) => asRecord(entry)?.['buy_from_exchange'] !== undefined)
      .map((entry) => asString(asRecord(entry)?.['resource']))
      .filter((id): id is string => id !== null);
    exchangeBuyables.set(template, buyable);
  }

  const needsByTier = new Map<string, string[]>();
  for (const need of collection(definitions, 'needs')) {
    const resource = asString(asRecord(need['demand'])?.['resource']);
    if (resource === null) continue;
    for (const tier of asArray(need['applies_to'])) {
      if (typeof tier !== 'string') continue;
      const existing = needsByTier.get(tier);
      if (existing === undefined) needsByTier.set(tier, [resource]);
      else existing.push(resource);
    }
  }

  for (const world of collection(definitions, 'worlds')) {
    const instances = new Map<string, string[]>();
    for (const entry of asArray(world['locations'])) {
      const template = asString(asRecord(entry)?.['template']);
      const id = asString(asRecord(entry)?.['id']);
      if (template === null || id === null) continue;
      const existing = instances.get(template);
      if (existing === undefined) instances.set(template, [id]);
      else existing.push(id);
    }
    const edges: ConnectionEdge[] = [];
    for (const entry of asArray(world['connections'])) {
      const record = asRecord(entry);
      const definitionId = asString(record?.['definition']);
      const origin = asString(record?.['origin']);
      const destination = asString(record?.['destination']);
      if (definitionId === null || origin === null || destination === null) continue;
      const direction = connectionDirection.get(definitionId) ?? 'bidirectional';
      const tags = connectionTags.get(definitionId) ?? [];
      const enabled = record?.['enabled'] !== false;
      edges.push({ from: origin, to: destination, allowedTransportTags: tags, enabled });
      if (direction === 'bidirectional') {
        edges.push({ from: destination, to: origin, allowedTransportTags: tags, enabled });
      }
    }
    const worldProviders = new Set<string>();
    for (const owner of asArray(world['owners'])) {
      for (const entry of asArray(asRecord(owner)?.['initial_resources'])) {
        const resource = asString(asRecord(entry)?.['resource']);
        if (resource !== null) worldProviders.add(resource);
      }
    }

    const localProducers = new Map<string, Set<string>>();
    const localConsumers = new Map<string, Set<string>>();
    const noteProducer = (location: string, resource: string): void => {
      const set = localProducers.get(location);
      if (set === undefined) localProducers.set(location, new Set([resource]));
      else set.add(resource);
    };
    const noteConsumer = (location: string, resource: string): void => {
      const set = localConsumers.get(location);
      if (set === undefined) localConsumers.set(location, new Set([resource]));
      else set.add(resource);
    };
    for (const entry of asArray(world['locations'])) {
      const template = asString(asRecord(entry)?.['template']);
      const id = asString(asRecord(entry)?.['id']);
      if (template === null || id === null) continue;
      for (const resource of exchangeBuyables.get(template) ?? []) noteProducer(id, resource);
    }
    for (const entity of asArray(world['owners']).flatMap((owner) =>
      asArray(asRecord(owner)?.['initial_entities']),
    )) {
      const record = asRecord(entity);
      const definitionId = asString(record?.['definition']);
      const location = asString(record?.['location']);
      const info = definitionId === null ? undefined : entities.get(definitionId);
      if (location === null || info === undefined) continue;
      for (const recipeId of info.producerRecipes) {
        const recipe = recipes.get(recipeId);
        if (recipe === undefined) continue;
        for (const resource of recipe.outputs) noteProducer(location, resource);
        for (const resource of recipe.inputs) noteConsumer(location, resource);
      }
      for (const resource of info.sourceOutputs) noteProducer(location, resource);
      for (const resource of info.maintenanceInputs) noteConsumer(location, resource);
      const tier = info.residenceTier;
      if (tier !== null) {
        for (const resource of tierOutputs.get(tier) ?? []) noteProducer(location, resource);
        for (const resource of needsByTier.get(tier) ?? []) noteConsumer(location, resource);
      }
    }

    for (const [location, consumedSet] of localConsumers) {
      for (const resource of consumedSet) {
        if (localProducers.get(location)?.has(resource)) continue;
        if (worldProviders.has(resource)) continue;
        // Owner- and global-scoped resources live in the owner balance, not
        // location inventories, so no transport leg applies (GDD-7.5, 4.1).
        const scope = resources.get(resource)?.scope;
        if (scope === 'owner' || scope === 'global') continue;
        if (!resources.get(resource)?.transportable) {
          diagnostics.push(
            diag('resource_unreachable', {
              definition: world.id,
              path: `/worlds/${world.id}`,
              args: { resource, location, reason: 'not_transportable' },
            }),
          );
          continue;
        }
        const structural = reachableFrom(location, edges, resource, localProducers, null);
        if (!structural) {
          diagnostics.push(
            diag('resource_unreachable', {
              definition: world.id,
              path: `/worlds/${world.id}`,
              args: { resource, location, reason: 'no_path' },
            }),
          );
          continue;
        }
        const usable = carriers.some(
          (carrier) =>
            (carrier.acceptsAll || carrier.acceptsTransportable) &&
            reachableFrom(location, edges, resource, localProducers, carrier),
        );
        if (!usable) {
          diagnostics.push(
            diag('transport_tag_mismatch', {
              definition: world.id,
              path: `/worlds/${world.id}`,
              args: { resource, location },
            }),
          );
        }
      }
    }
  }

  const hasWorld = collection(definitions, 'worlds').length > 0;
  for (const establishment of collection(definitions, 'location_establishments')) {
    for (const entry of asArray(establishment['costs'])) {
      const resource = asString(asRecord(entry)?.['resource']);
      if (resource === null) continue;
      const info = resources.get(resource);
      if (info?.transportable !== true) {
        diagnostics.push(
          diag('establishment_cost_invalid', {
            definition: establishment.id,
            path: `/location_establishments/${establishment.id}/costs`,
            args: { resource, reason: 'not_transportable' },
          }),
        );
        continue;
      }
      // The sourcing half is an economy property (see the production graph):
      // definition libraries without worlds may omit the producing chain.
      if (!hasWorld) continue;
      const sourced =
        providerResources.has(resource) ||
        [...recipes.values()].some((recipe) => recipe.outputs.includes(resource));
      if (!sourced) {
        diagnostics.push(
          diag('establishment_cost_invalid', {
            definition: establishment.id,
            path: `/location_establishments/${establishment.id}/costs`,
            args: { resource, reason: 'not_sourced' },
          }),
        );
      }
    }
  }

  return diagnostics;
}

const reachableFrom = (
  start: string,
  edges: readonly ConnectionEdge[],
  resource: string,
  producers: ReadonlyMap<string, Set<string>>,
  carrier: Carrier | null,
): boolean => {
  const visited = new Set<string>([start]);
  const queue: string[] = [start];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) continue;
    for (const edge of edges) {
      if (edge.from !== current || !edge.enabled) continue;
      if (
        carrier !== null &&
        edge.allowedTransportTags.length > 0 &&
        carrier.allowedConnectionTags.length > 0 &&
        !edge.allowedTransportTags.some((tag) => carrier.allowedConnectionTags.includes(tag))
      ) {
        continue;
      }
      if (producers.get(edge.to)?.has(resource)) return true;
      if (visited.has(edge.to)) continue;
      visited.add(edge.to);
      queue.push(edge.to);
    }
  }
  return false;
};
