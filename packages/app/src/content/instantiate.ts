/**
 * Content-to-world entity instantiation (CONT-6.6, CONT-6.8). Resolves the
 * fixture's entity definitions, recipes, tiers, needs, categories, and growth
 * policies into runtime components at the default location. This is the
 * scenario layer that keeps the core content-free (TDS-4.3).
 *
 * Source: CONT-6.6, CONT-6.8, GDD-9.4, GDD-9.5, GDD-11, GDD-12
 */
import { allocateEntity, applyStorageProvider, ids, instantiateWorld } from '@aesfw/core';
import type {
  CapabilityConsumer,
  Cargo,
  CategorySpec,
  ConnectivityNode,
  DefinitionHandle,
  Diagnostic,
  Growth,
  Location,
  LocationHub,
  Maintenance,
  NeedSpec,
  PopulationGroup,
  PopulationOutput,
  Producer,
  RecipeSpec,
  Residence,
  ResourceSource,
  SourcePolicy,
  TransportHandling,
  TransportMovement,
  World,
} from '@aesfw/core';
import { worldPlan } from '@aesfw/content';
import type { CompiledDefinition, ContentRegistry } from '@aesfw/content';

type Data = Record<string, unknown>;

const asRecord = (value: unknown): Data | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Data) : null;

const asArray = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

const handle = (
  registry: ContentRegistry,
  type: Parameters<ContentRegistry['handleOf']>[0],
  id: unknown,
): ReturnType<ContentRegistry['handleOf']> =>
  typeof id === 'string' ? registry.handleOf(type, ids.stringId(id)) : null;

const dataOf = (
  registry: ContentRegistry,
  type: Parameters<ContentRegistry['handleOf']>[0],
  id: unknown,
): Data | null => {
  const resolved = handle(registry, type, id);
  if (resolved === null) return null;
  const definition: CompiledDefinition | null = registry.definitionOf(type, resolved);
  return definition === null ? null : asRecord(definition.data);
};

const firstLocation = (world: World): number | null => {
  const ids2 = world.stores.get('location').ids();
  return ids2[0] ?? null;
};

const itemAmounts = (
  registry: ContentRegistry,
  value: unknown,
): readonly { readonly resource: ReturnType<typeof handle>; readonly quantity: number }[] =>
  asArray(value).map((entry) => {
    const record = asRecord(entry) ?? {};
    return {
      resource: handle(registry, 'resource', record['resource']),
      quantity: typeof record['quantity'] === 'number' ? record['quantity'] : 0,
    };
  });

const recipeSpec = (registry: ContentRegistry, id: unknown): RecipeSpec | null => {
  const data = dataOf(registry, 'recipe', id);
  const resolved = handle(registry, 'recipe', id);
  if (data === null || resolved === null) return null;
  return {
    recipe: resolved,
    mode: data['mode'] === 'continuous' ? 'continuous' : 'batch',
    duration: typeof data['duration_ticks'] === 'number' ? data['duration_ticks'] : 1,
    inputs: itemAmounts(registry, data['inputs']) as RecipeSpec['inputs'],
    outputs: itemAmounts(registry, data['outputs']) as RecipeSpec['outputs'],
    capabilities: itemAmounts(
      registry,
      data['capability_requirements'],
    ) as RecipeSpec['capabilities'],
    condition: null,
  };
};

const SOURCE_POLICIES: readonly SourcePolicy[] = [
  'infinite_rate',
  'finite_deposit',
  'regenerating_deposit',
  'slot_dependent',
  'area_dependent',
  'condition_dependent',
];

const sourcePolicy = (value: unknown): SourcePolicy =>
  typeof value === 'string' && (SOURCE_POLICIES as readonly string[]).includes(value)
    ? (value as SourcePolicy)
    : 'infinite_rate';

const sourceFrom = (
  registry: ContentRegistry,
  component: Data,
  placement: Data,
  location: number,
  inventory: number | null,
): ResourceSource => {
  const policy = sourcePolicy(component['policy']);
  const initial =
    typeof component['initial_quantity'] === 'number' ? component['initial_quantity'] : 0;
  const outputs = asArray(component['outputs']).map((entry) => {
    const record = asRecord(entry) ?? {};
    const base = {
      resource: handle(registry, 'resource', record['resource']),
      rate: typeof record['quantity_per_tick'] === 'number' ? record['quantity_per_tick'] : 0,
    };
    if (policy === 'finite_deposit') return { ...base, remaining: initial };
    if (policy === 'regenerating_deposit') {
      return {
        ...base,
        remaining: initial,
        ...(typeof component['regeneration_per_tick'] === 'number'
          ? { regeneration: component['regeneration_per_tick'] }
          : {}),
        ...(typeof component['maximum_quantity'] === 'number'
          ? { maximum: component['maximum_quantity'] }
          : {}),
      };
    }
    return { ...base, remaining: null };
  });
  const workingArea = asRecord(placement['working_area']);
  const condition = handle(registry, 'condition', component['condition']);
  return {
    policy,
    location: ids.entityId(location),
    inventory: inventory === null ? null : ids.entityId(inventory),
    outputs: outputs as ResourceSource['outputs'],
    ...(typeof component['scale_by_property'] === 'string'
      ? { scaleByProperty: ids.stringId(component['scale_by_property']) }
      : {}),
    ...(typeof placement['requires_slot'] === 'string'
      ? { slotType: ids.stringId(placement['requires_slot']) }
      : {}),
    ...(workingArea !== null && typeof workingArea['cells'] === 'number'
      ? {
          workingAreaCells: workingArea['cells'],
          ...(typeof workingArea['exclusive'] === 'boolean'
            ? { workingAreaExclusive: workingArea['exclusive'] }
            : {}),
        }
      : {}),
    ...(condition === null ? {} : { condition }),
  };
};

const connectivityNodeFrom = (component: unknown): ConnectivityNode | null => {
  const data = asRecord(component);
  if (data === null) return null;
  if (typeof data['requires'] === 'string') {
    return { role: 'requirement', network: ids.stringId(data['requires']) };
  }
  if (typeof data['provides'] === 'string') {
    return { role: 'provider', network: ids.stringId(data['provides']) };
  }
  return null;
};

const producerFrom = (
  registry: ContentRegistry,
  component: Data,
  location: number,
  inventory: number | null,
): Producer => {
  const recipes = asArray(component['recipes'])
    .map((id) => recipeSpec(registry, id))
    .filter((recipe): recipe is RecipeSpec => recipe !== null);
  return {
    recipes,
    recipe: recipes[0]?.recipe ?? null,
    processSlots: typeof component['process_slots'] === 'number' ? component['process_slots'] : 1,
    location: ids.entityId(location),
    inputInventory: inventory === null ? null : ids.entityId(inventory),
    outputInventory: inventory === null ? null : ids.entityId(inventory),
    state: 'idle',
    blockReasons: [],
    progress: 0,
    inputReservations: [],
    capacityReservations: [],
  };
};

const categorySpec = (registry: ContentRegistry, id: unknown): CategorySpec | null => {
  const data = dataOf(registry, 'needCategory', id);
  const resolved = handle(registry, 'needCategory', id);
  if (data === null || resolved === null) return null;
  const evaluation = asRecord(data['evaluation']) ?? {};
  const members = asArray(data['members']).map((entry) => {
    const record = asRecord(entry) ?? {};
    return {
      need: handle(registry, 'need', record['need']),
      weight: typeof record['weight'] === 'number' ? record['weight'] : 0,
    };
  });
  return {
    category: resolved,
    mode: evaluation['mode'] === 'weighted_score' ? 'weighted_score' : 'all',
    requiredScore:
      typeof evaluation['required_score'] === 'number' ? evaluation['required_score'] : 0,
    members: members as CategorySpec['members'],
  };
};

const needsForTier = (registry: ContentRegistry, tierId: string): NeedSpec[] => {
  const needs: NeedSpec[] = [];
  for (const definition of registry.definitionsOf('need')) {
    const data = asRecord(definition.data);
    if (data === null) continue;
    if (!asArray(data['applies_to']).includes(tierId)) continue;
    const demand = asRecord(data['demand']) ?? {};
    const fulfillment = asRecord(data['fulfillment']) ?? {};
    const type =
      demand['type'] === 'resource_availability' ? 'resource_availability' : 'resource_consumption';
    needs.push({
      need: definition.handle,
      category: handle(registry, 'needCategory', data['category']) as NeedSpec['category'],
      type,
      resource: handle(registry, 'resource', demand['resource']) as NeedSpec['resource'],
      quantityPerPopulationPerTick:
        type === 'resource_availability'
          ? typeof demand['minimum_quantity'] === 'number'
            ? demand['minimum_quantity']
            : 0
          : typeof demand['quantity_per_population_per_tick'] === 'number'
            ? demand['quantity_per_population_per_tick']
            : 0,
      measurementWindowTicks:
        typeof fulfillment['measurement_window_ticks'] === 'number'
          ? fulfillment['measurement_window_ticks']
          : 1,
      targetRatio:
        typeof fulfillment['target_ratio'] === 'number' ? fulfillment['target_ratio'] : 1000,
    });
  }
  return needs;
};

const residenceFrom = (
  registry: ContentRegistry,
  component: Data,
  location: number,
): { residence: Residence; group: PopulationGroup } | null => {
  const tierId = component['population_tier'];
  const tierHandle = handle(registry, 'tier', tierId);
  const tierData = dataOf(registry, 'tier', tierId);
  if (tierHandle === null || tierData === null || typeof tierId !== 'string') return null;
  const outputs: PopulationOutput[] = asArray(tierData['outputs']).map((entry) => {
    const record = asRecord(entry) ?? {};
    return {
      resource: handle(registry, 'resource', record['resource']),
      ratePerPopulationPerTick:
        typeof record['rate_per_population_per_tick'] === 'number'
          ? record['rate_per_population_per_tick']
          : 0,
      scope:
        record['scope'] === 'owner'
          ? 'owner'
          : record['scope'] === 'global'
            ? 'global'
            : 'location',
      satisfactionCurve: handle(registry, 'curve', record['satisfaction_curve']),
    } as PopulationOutput;
  });
  const categories = asArray(tierData['need_categories'])
    .map((id) => categorySpec(registry, id))
    .filter((category): category is CategorySpec => category !== null);
  const capacity = typeof component['capacity'] === 'number' ? component['capacity'] : 0;
  const count =
    typeof component['initial_population'] === 'number' ? component['initial_population'] : 0;
  return {
    residence: {
      tier: tierHandle,
      capacity,
      location: ids.entityId(location),
      growthPolicy: handle(registry, 'growthPolicy', component['growth_policy']),
      consumptionFactor:
        typeof tierData['consumption_factor'] === 'number' ? tierData['consumption_factor'] : 1000,
      outputs,
      needs: needsForTier(registry, tierId),
      categories,
      satisfactionAggregation: 'average',
    },
    group: { tier: tierHandle, count, capacity },
  };
};

const growthFrom = (registry: ContentRegistry, id: unknown): Growth | null => {
  const data = dataOf(registry, 'growthPolicy', id);
  const resolved = handle(registry, 'growthPolicy', id);
  if (data === null || resolved === null) return null;
  const increase = asRecord(data['increase']);
  const decrease = asRecord(data['decrease']);
  return {
    policy: resolved,
    intervalTicks: typeof data['interval_ticks'] === 'number' ? data['interval_ticks'] : 1,
    increase:
      increase === null
        ? null
        : {
            quantity: typeof increase['quantity'] === 'number' ? increase['quantity'] : 0,
            condition: { minSatisfaction: 800, maxSatisfaction: null, requireCapacity: true },
          },
    decrease:
      decrease === null
        ? null
        : {
            quantity: typeof decrease['quantity'] === 'number' ? decrease['quantity'] : 0,
            condition: { minSatisfaction: null, maxSatisfaction: 250, requireCapacity: false },
          },
  };
};

const maintenanceFrom = (registry: ContentRegistry, component: Data | null): Maintenance | null => {
  if (component === null) return null;
  const interval = component['interval_ticks'];
  const inputs = asArray(component['inputs'])
    .map((entry) => {
      const line = asRecord(entry) ?? {};
      return {
        resource: handle(registry, 'resource', line['resource']),
        quantity: typeof line['quantity'] === 'number' ? line['quantity'] : 0,
      };
    })
    .filter(
      (line): line is { resource: DefinitionHandle; quantity: number } => line.resource !== null,
    );
  const policy = component['charge_policy'];
  const shortage = component['shortage_policy'];
  return {
    intervalTicks: typeof interval === 'number' ? interval : 1,
    inputs,
    chargePolicy:
      policy === 'while_exists' || policy === 'while_active' || policy === 'while_processing'
        ? policy
        : 'while_enabled',
    shortagePolicy:
      shortage === 'deactivate_entity' ||
      shortage === 'scale' ||
      shortage === 'accumulate_debt' ||
      shortage === 'ignore' ||
      shortage === 'trigger_transition'
        ? shortage
        : 'owner_deficit_policy',
    arrears: [],
  };
};

const transportDefinitionFor = (
  registry: ContentRegistry,
  entityDefinition: DefinitionHandle,
): Data | null => {
  const entityId = registry.stringIdOf('entity', entityDefinition);
  if (entityId === null) return null;
  for (const definition of registry.definitionsOf('transportType')) {
    const data = asRecord(definition.data);
    if (data !== null && data['entity_definition'] === entityId) return data;
  }
  return null;
};

const transportableResources = (registry: ContentRegistry): readonly DefinitionHandle[] => {
  const handles: DefinitionHandle[] = [];
  for (const definition of registry.definitionsOf('resource')) {
    const data = asRecord(definition.data);
    if (data?.['transportable'] === true) handles.push(definition.handle);
  }
  return handles.sort((a, b) => a - b);
};

const instantiateTransport = (
  world: World,
  registry: ContentRegistry,
  entityDefinition: DefinitionHandle,
  entity: number,
  location: number,
): void => {
  const data = transportDefinitionFor(registry, entityDefinition);
  if (data === null) return;
  const cargoData = asRecord(data['cargo']) ?? {};
  const policy =
    cargoData['compartment_policy'] === 'typed_slots'
      ? 'typed_slots'
      : cargoData['compartment_policy'] === 'per_resource'
        ? 'per_resource'
        : 'unrestricted';
  const slotCapacity =
    typeof cargoData['slot_capacity'] === 'number' ? cargoData['slot_capacity'] : 0;
  const slotCount = typeof cargoData['slots'] === 'number' ? cargoData['slots'] : 1;
  const accepts =
    cargoData['acceptance'] === 'transportable_resources' ? transportableResources(registry) : [];
  const cargo: Cargo = {
    policy,
    slotCapacity,
    slots:
      policy === 'typed_slots'
        ? Array.from({ length: slotCount }, () => ({ resource: null, quantity: 0 }))
        : [],
    entries: [],
    accepts,
  };
  const movementData = asRecord(data['movement']) ?? {};
  const movement: TransportMovement = {
    speedPermille:
      typeof movementData['speed_permille'] === 'number' ? movementData['speed_permille'] : 1000,
    mode: movementData['mode'] === 'abstract' ? 'abstract' : 'physical',
    allowedConnectionTags: asArray(movementData['allowed_connection_tags'])
      .filter((tag): tag is string => typeof tag === 'string')
      .map((tag) => ids.stringId(tag)),
    location: ids.entityId(location),
  };
  const handlingData = asRecord(data['handling']) ?? {};
  const handling: TransportHandling = {
    loadingRatePerTick:
      typeof handlingData['loading_rate_per_tick'] === 'number'
        ? handlingData['loading_rate_per_tick']
        : 0,
    unloadingRatePerTick:
      typeof handlingData['unloading_rate_per_tick'] === 'number'
        ? handlingData['unloading_rate_per_tick']
        : 0,
  };
  world.stores.get<Cargo>('cargo').set(ids.entityId(entity), cargo);
  world.stores.get<TransportMovement>('movement').set(ids.entityId(entity), movement);
  world.stores.get<TransportHandling>('handling').set(ids.entityId(entity), handling);
  const maintenance = maintenanceFrom(registry, asRecord(data['maintenance']));
  if (maintenance !== null) {
    world.stores.get<Maintenance>('maintenance').set(ids.entityId(entity), maintenance);
  }
};

const instantiateDefinition = (
  world: World,
  registry: ContentRegistry,
  definition: CompiledDefinition,
  location: number,
  owner: number | null,
): number => {
  const data = asRecord(definition.data);
  const components = data === null ? null : asRecord(data['components']);
  const entity = allocateEntity(world);
  const hub = world.stores.get<LocationHub>('locationHub').get(ids.entityId(location));
  const inventory = hub?.inventories[0] ?? null;
  if (owner !== null) {
    world.stores.get<{ owner: number }>('owner').set(entity, { owner });
  }
  if (components === null) {
    instantiateTransport(world, registry, definition.handle, entity, location);
    return entity;
  }
  const setDefinition = (): void => {
    world.stores.get<{ definition: DefinitionHandle }>('definition').set(entity, {
      definition: definition.handle,
    });
  };
  if (components['resource_source'] !== undefined) {
    const component = asRecord(components['resource_source']) ?? {};
    const placement = asRecord(components['placement']) ?? {};
    world.stores
      .get<ResourceSource>('resourceSource')
      .set(entity, sourceFrom(registry, component, placement, location, inventory));
    setDefinition();
  } else if (components['producer'] !== undefined) {
    const component = asRecord(components['producer']) ?? {};
    const producer = producerFrom(registry, component, location, inventory);
    world.stores.get<Producer>('producer').set(entity, producer);
    setDefinition();
    const requirement = producer.recipes[0]?.capabilities[0];
    if (requirement !== undefined) {
      world.stores.get<CapabilityConsumer>('capabilityConsumer').set(entity, {
        capability: requirement.resource,
        substitutes: [],
        scope: 'location',
        location: ids.entityId(location),
        model: 'proportional',
        priority: 0,
        weight: 1000,
        request: requirement.quantity,
      });
    }
  } else if (components['residence'] !== undefined) {
    const component = asRecord(components['residence']) ?? {};
    const built = residenceFrom(registry, component, location);
    if (built !== null) {
      world.stores.get<Residence>('residence').set(entity, built.residence);
      world.stores.get<PopulationGroup>('populationGroup').set(entity, built.group);
      setDefinition();
      const growth = growthFrom(registry, component['growth_policy']);
      if (growth !== null) world.stores.get<Growth>('growth').set(entity, growth);
    }
  }
  applyStorageProvider(world, registry, definition.handle, entity, ids.entityId(location));
  if (components['connectivity'] !== undefined) {
    const node = connectivityNodeFrom(components['connectivity']);
    if (node !== null) {
      world.stores.get<ConnectivityNode>('connectivityNode').set(entity, node);
      setDefinition();
    }
  }
  const maintenance = maintenanceFrom(registry, asRecord(components['maintenance']));
  if (maintenance !== null) {
    world.stores.get<Maintenance>('maintenance').set(entity, maintenance);
  }
  instantiateTransport(world, registry, definition.handle, entity, location);
  return entity;
};

/**
 * Instantiates the content's entity definitions at the default location
 * (CONT-6.6, CONT-6.8). Used when content has no world definition.
 *
 * Source: CONT-6.6, CONT-6.8
 */
export function instantiateContentEntities(world: World, registry: ContentRegistry): void {
  const location = firstLocation(world);
  if (location === null) return;
  const owner = world.stores.get<Location>('location').get(ids.entityId(location))?.owner ?? null;
  for (const definition of registry.definitionsOf('entity')) {
    instantiateDefinition(world, registry, definition, location, owner);
  }
}

/**
 * Instantiates a world plan and its declared initial entities (CONT-6.6). A
 * world without initial entities falls back to instantiating every entity
 * definition at the first location, preserving the pre-world behaviour.
 *
 * Source: CONT-6.6
 */
export function instantiateWorldContent(
  world: World,
  registry: ContentRegistry,
  worldId: string | null = null,
): readonly Diagnostic[] {
  const plan = worldPlan(registry, worldId);
  const defaultPlan = plan.plan;
  instantiateWorld(world, defaultPlan);
  const locationEntities = world.stores.get('location').ids();
  const initial = defaultPlan.initialEntities;
  if (initial === undefined || initial.length === 0) {
    instantiateContentEntities(world, registry);
    return plan.diagnostics;
  }
  for (const entry of initial) {
    const definition = registry.definitionOf('entity', entry.definition);
    const location = locationEntities[entry.locationIndex];
    if (definition === null || location === undefined) continue;
    instantiateDefinition(world, registry, definition, location, entry.owner);
  }
  return plan.diagnostics;
}
