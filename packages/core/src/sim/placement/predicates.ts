/**
 * The built-in placement predicates of GDD-18.2 (GDD-18.2, ARCH-11). Location
 * existence and activity, footprint bounds, buildability, occupancy, and
 * capacity are evaluated in a fixed order, followed by the placement's content
 * conditions. The result is `ok` or the ordered rejection reasons.
 *
 * Source: GDD-18.2, CONT-6.8, ARCH-11, TDS-10.1
 */
import { buildableCount, cellIndex, footprintCells, locationGridOf } from '../spatial.js';
import { locationOf } from '../location.js';
import type { World } from '../../world/types.js';
import type {
  PlacementConditionEvaluator,
  PlacementQuery,
  PlacementReason,
  PlacementReasonCode,
  PlacementResult,
  PlacementSpec,
} from './types.js';

const reason = (
  code: PlacementReasonCode,
  args: Record<string, string | number | boolean>,
): PlacementReason => ({ code, arguments: args });

const fail = (...reasons: readonly PlacementReason[]): PlacementResult => ({ ok: false, reasons });

/**
 * Evaluates the built-in placement predicates and the placement conditions
 * (GDD-18.2). The location is the query's location; conditions are evaluated
 * against it. `placement_condition_failed` carries the condition handle.
 *
 * Source: GDD-18.2, CONT-6.8, ARCH-11
 */
export function evaluatePlacementPredicates(
  world: World,
  spec: PlacementSpec,
  query: PlacementQuery,
  evaluateCondition: PlacementConditionEvaluator,
): PlacementResult {
  const location = query.location;
  const component = locationOf(world, location);
  if (component === undefined) {
    return fail(reason('unknown_location', { location }));
  }
  if (!component.active) {
    return fail(reason('location_inactive', { location }));
  }
  const grid = locationGridOf(world, location);
  if (spec.footprint !== null && grid !== undefined) {
    const cells = footprintCells(spec.footprint, query.transform);
    for (const position of cells) {
      if (
        position.x < 0 ||
        position.y < 0 ||
        position.x >= grid.width ||
        position.y >= grid.height
      ) {
        return fail(reason('out_of_bounds', { location }));
      }
    }
    for (const position of cells) {
      if (grid.blocked.includes(cellIndex(grid.width, position))) {
        return fail(reason('not_buildable', { location }));
      }
    }
    const occupied = new Set<number>();
    for (const entry of world.caches.spatial?.locations ?? []) {
      if (entry.location !== location) continue;
      for (const cell of entry.occupied) occupied.add(cell.cell);
    }
    for (const position of cells) {
      if (occupied.has(cellIndex(grid.width, position))) {
        return fail(reason('occupied', { location }));
      }
    }
    const required = cells.length;
    const available = buildableCount(grid) - component.used;
    if (required > available) {
      return fail(reason('insufficient_capacity', { required, available }));
    }
  } else {
    const required =
      spec.footprint === null ? spec.capacityCost : spec.footprint.width * spec.footprint.height;
    const available = component.capacity - component.used;
    if (required > available) {
      return fail(reason('insufficient_capacity', { required, available }));
    }
  }
  for (const condition of spec.conditions) {
    if (!evaluateCondition(world, condition, location)) {
      return fail(reason('placement_condition_failed', { condition }));
    }
  }
  return { ok: true };
}
