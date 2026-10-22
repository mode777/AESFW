/**
 * The read-only `evaluatePlacement` query (TDS-10.1, PIC-12.1). Resolves the
 * definition to its placement spec, evaluates the built-in predicates and the
 * placement conditions, and returns `ok` or the ordered reasons. It never
 * mutates authoritative state.
 *
 * Source: TDS-10.1, PIC-12.1, GDD-18.2
 */
import type { Registry } from '../../registry/types.js';
import { definitionHandle } from '../../ids/index.js';
import type { World } from '../../world/types.js';
import { isKnownEntityDefinition, placementSpecOf } from './definition.js';
import { evaluatePlacementPredicates } from './predicates.js';
import type {
  PlacementConditionEvaluator,
  PlacementQuery,
  PlacementReason,
  PlacementResult,
} from './types.js';

const alwaysTrue: PlacementConditionEvaluator = () => true;

const translate = (registry: Registry, reason: PlacementReason): PlacementReason => {
  if (reason.code !== 'placement_condition_failed') return reason;
  const value = reason.arguments['condition'];
  if (typeof value !== 'number') return reason;
  const id = registry.stringIdOf('condition', definitionHandle(value));
  return { code: reason.code, arguments: { condition: id ?? value } };
};

/**
 * Evaluates a placement request (TDS-10.1). An unknown definition is rejected
 * with `unknown_definition`; otherwise the built-in predicates and the
 * placement conditions decide.
 *
 * Source: TDS-10.1, PIC-12.1, GDD-18.2
 */
export function evaluatePlacement(
  world: World,
  registry: Registry,
  query: PlacementQuery,
  evaluateCondition: PlacementConditionEvaluator = alwaysTrue,
): PlacementResult {
  if (!isKnownEntityDefinition(registry, query.definition)) {
    return {
      ok: false,
      reasons: [
        { code: 'unknown_definition', arguments: { type: 'entity', definition: query.definition } },
      ],
    };
  }
  const spec = placementSpecOf(registry, query.definition);
  if (spec === null) {
    return {
      ok: false,
      reasons: [
        { code: 'unknown_definition', arguments: { type: 'entity', definition: query.definition } },
      ],
    };
  }
  const result = evaluatePlacementPredicates(world, spec, query, evaluateCondition);
  if (result.ok) return result;
  return { ok: false, reasons: result.reasons.map((reason) => translate(registry, reason)) };
}
