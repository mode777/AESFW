/**
 * The application-layer placement surface (PIC-12.1, design D4). It resolves
 * compiled content into the core placement query, evaluates the content
 * conditions with an `EvalContext`, and returns the protocol `placement_result`.
 *
 * Source: PIC-12.1, GDD-18.2, TDS-10.1
 */
import { evaluatePlacement, ids, locationOf } from '@aesfw/core';
import type {
  DefinitionHandle,
  EntityId,
  LogicalTransform,
  Orientation,
  PlacementConditionEvaluator,
  World,
} from '@aesfw/core';
import { compileCondition, evaluate } from '@aesfw/content';
import type { CompiledContent, ContentRegistry, EvalContext, QueryRef } from '@aesfw/content';
import type { PlacementQueryDto, PlacementResultDto } from '@aesfw/protocol';

const registryOf = (content: CompiledContent): ContentRegistry =>
  content.registry as ContentRegistry;

const idArg = (value: unknown): string | null => (typeof value === 'string' ? value : null);

/** The owner attributed to an entity, directly or through its location. */
const ownerOf = (world: World, subject: EntityId): number | null => {
  const direct = world.stores.get<{ readonly owner: number }>('owner').get(subject);
  if (direct !== undefined) return direct.owner;
  const location = locationOf(world, subject);
  return location?.owner ?? null;
};

/**
 * Resolves the v1 domain queries of a condition for an entity or location
 * subject (TDS-14.2). Unknown queries and arguments read as `0`.
 *
 * Source: TDS-14.2, GDD-12.4, GDD-12.3
 */
export const conditionQueryValue = (
  registry: ContentRegistry,
  world: World,
  subject: EntityId,
  query: QueryRef,
): number => {
  if (query.name === 'location_property') {
    const property = query.args['property'];
    if (typeof property !== 'string') return 0;
    const location = locationOf(world, subject);
    return location?.properties.find((entry) => entry.property === property)?.value ?? 0;
  }
  if (query.name === 'aggregate_need_fulfillment') {
    return world.stores.get<{ readonly z: number }>('satisfaction').get(subject)?.z ?? 0;
  }
  if (query.name === 'residence_population') {
    return world.stores.get<{ readonly count: number }>('populationGroup').get(subject)?.count ?? 0;
  }
  if (query.name === 'satisfaction_band') {
    return (
      world.stores.get<{ readonly bandIndex: number }>('bandState').get(subject)?.bandIndex ?? 0
    );
  }
  if (query.name === 'need_category_fulfillment') {
    const category = idArg(query.args['category']);
    if (category === null) return 0;
    const handle = registry.handleOf?.('needCategory', ids.stringId(category)) ?? null;
    if (handle === null) return 0;
    return (
      world.stores
        .get<{
          readonly categories: readonly {
            readonly category: number;
            readonly fulfillment: number;
          }[];
        }>('satisfaction')
        .get(subject)
        ?.categories.find((entry) => entry.category === handle)?.fulfillment ?? 0
    );
  }
  if (query.name === 'population_count') {
    const owner = ownerOf(world, subject);
    if (owner === null) return 0;
    const tierId = idArg(query.args['tier']);
    const tier =
      tierId === null ? null : (registry.handleOf?.('tier', ids.stringId(tierId)) ?? null);
    let total = 0;
    const groupStore = world.stores.get<{ readonly tier: number; readonly count: number }>(
      'populationGroup',
    );
    for (const entity of groupStore.ids()) {
      const group = groupStore.get(entity);
      if (group === undefined) continue;
      if (ownerOf(world, entity) !== owner) continue;
      if (tier !== null && group.tier !== tier) continue;
      total += group.count;
    }
    return total;
  }
  if (query.name === 'owner_balance') {
    const owner = ownerOf(world, subject);
    if (owner === null) return 0;
    const resourceId = idArg(query.args['resource']);
    const resource =
      resourceId === null
        ? null
        : (registry.handleOf?.('resource', ids.stringId(resourceId)) ?? null);
    const state = world.owners.owners.find((entry) => entry.handle === owner);
    if (state === undefined || resource === null) return 0;
    return state.accounts.find((entry) => entry.resource === resource)?.amount ?? 0;
  }
  return 0;
};

/**
 * Builds the world-pure placement condition evaluator from compiled content
 * (design D4). An unknown or uncompilable condition evaluates to false.
 *
 * Source: GDD-18.2, TDS-10.1
 */
export function buildConditionEvaluator(content: CompiledContent): PlacementConditionEvaluator {
  const registry = registryOf(content);
  return (world, condition, subject) => {
    const definition = registry.definitionOf('condition', condition);
    if (definition === null) return false;
    const compiled = compileCondition(definition.data, registry);
    if (compiled.condition === null) return false;
    const context: EvalContext = {
      subject: { kind: 'location', id: subject },
      query: (query) => conditionQueryValue(registry, world, subject, query),
      aggregate: () => 0,
      timer: (slot) => timerTicks(world, condition, slot, subject),
    };
    return evaluate(compiled.condition.root, context) === true;
  };
}

/** Reads a sustained timer's consecutive true ticks (TDS-14.3). */
const timerTicks = (
  world: World,
  condition: DefinitionHandle,
  slot: number,
  subject: EntityId,
): number =>
  world.timers.timers.find(
    (entry) => entry.condition === condition && entry.slot === slot && entry.subject === subject,
  )?.consecutiveTrueTicks ?? 0;

/** The logical transform of a placement command or query payload. */
export function placementTransformOf(
  location: EntityId,
  position: readonly [number, number],
  orientation: number,
): LogicalTransform {
  return {
    location,
    position: { x: position[0], y: position[1] },
    orientation: orientation as Orientation,
  };
}

/**
 * Answers the read-only `placement_query` (PIC-12.1). The definition and
 * location are resolved against compiled content; the world is never mutated.
 *
 * Source: PIC-12.1
 */
export function placementQuery(
  content: CompiledContent,
  world: World,
  revision: number,
  dto: PlacementQueryDto,
): PlacementResultDto {
  const definition: DefinitionHandle | null = registryOf(content).handleOf(
    'entity',
    ids.stringId(dto.definition_id),
  );
  if (definition === null) {
    return {
      valid: false,
      revision,
      reasons: [
        {
          code: 'unknown_definition',
          arguments: { type: 'entity', definition: dto.definition_id },
        },
      ],
    };
  }
  const location = ids.entityId(dto.location_id);
  const transform = placementTransformOf(
    location,
    [dto.logical_transform.position[0], dto.logical_transform.position[1]],
    dto.logical_transform.orientation,
  );
  const result = evaluatePlacement(
    world,
    content.registry,
    { definition, location, transform },
    buildConditionEvaluator(content),
  );
  return {
    valid: result.ok,
    revision,
    reasons: result.ok
      ? []
      : result.reasons.map((reason) => ({ code: reason.code, arguments: { ...reason.arguments } })),
  };
}
