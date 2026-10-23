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

const queryValue = (world: World, subject: EntityId, query: QueryRef): number => {
  if (query.name !== 'location_property') return 0;
  const property = query.args['property'];
  if (typeof property !== 'string') return 0;
  const location = locationOf(world, subject);
  return location?.properties.find((entry) => entry.property === property)?.value ?? 0;
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
      query: (query) => queryValue(world, subject, query),
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
