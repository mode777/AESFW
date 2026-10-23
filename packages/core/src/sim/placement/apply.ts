/**
 * Applies the placement and construction commands of ARCH-7.3 in phase 01
 * (GDD-18.1, GDD-18.2). Placement re-validates the request, allocates the
 * entity, writes the placement, transform, and footprint, and creates the
 * construction plan; cancellation, commit, and deconstruction reuse the 3.2
 * lifecycle seams. No quantity effect happens here beyond committing reserved
 * construction costs.
 *
 * Source: GDD-18.1, GDD-18.2, GDD-18.3, ARCH-7.3, TDS-16.1
 */
import type { Command, CommandError } from '../../commands/types.js';
import type { EntityId, Tick } from '../../ids/index.js';
import { allocateEntity } from '../../world/create.js';
import type { World } from '../../world/types.js';
import type { Registry } from '../../registry/types.js';
import type { TransactionWriter } from '../../tx/index.js';
import { locationOf, locationHubOf } from '../location.js';
import type { Footprint, LogicalTransform } from '../spatial.js';
import { gridPolicy } from '../../policies/spatial/grid.js';
import { resolveSpatialPolicy } from '../../policies/spatial/registry.js';
import { lifecycleOf, setLifecycle } from '../construction/lifecycle.js';
import {
  createConstructionPlan,
  constructionPlanOf,
  constructionProgressOf,
} from '../construction/plan.js';
import { commitReservations } from '../construction/reserve.js';
import { requestCancellation, requestDeconstruction } from '../construction/seams.js';
import { applyStorageProvider } from '../internal-logistics/storage.js';
import type { ConstructionPlan, ConstructionProgress } from '../construction/types.js';
import {
  constructionPlanOf as planOf,
  initiallyEnabledOf,
  isKnownEntityDefinition,
  placementSpecOf,
} from './definition.js';
import { evaluatePlacement } from './query.js';
import type { PlacementConditionEvaluator } from './types.js';

/** The outcome of applying a `PlaceEntityPlan` command. */
export type PlaceEntityOutcome =
  | { readonly ok: true; readonly entity: EntityId }
  | { readonly ok: false; readonly errors: readonly CommandError[] };

const firstInventoryOf = (world: World, location: EntityId): EntityId | null =>
  locationHubOf(world, location)?.inventories[0] ?? null;

const unknownDefinition = (definition: number): PlaceEntityOutcome => ({
  ok: false,
  errors: [{ code: 'unknown_definition', arguments: { type: 'entity', definition } }],
});

/**
 * Applies one `PlaceEntityPlan` command (GDD-18.1, GDD-18.2). Returns the new
 * entity, or the placement rejection reasons.
 *
 * Source: GDD-18.1, GDD-18.2, ARCH-7.3
 */
export function applyPlaceEntityPlan(
  world: World,
  registry: Registry,
  command: Extract<Command, { type: 'PlaceEntityPlan' }>,
  evaluateCondition: PlacementConditionEvaluator,
): PlaceEntityOutcome {
  if (!isKnownEntityDefinition(registry, command.definition)) {
    return unknownDefinition(command.definition);
  }
  const transform: LogicalTransform = { ...command.transform, location: command.location };
  const result = evaluatePlacement(
    world,
    registry,
    { definition: command.definition, location: command.location, transform },
    evaluateCondition,
  );
  if (!result.ok) {
    return {
      ok: false,
      errors: result.reasons.map((reason) => ({
        code: reason.code,
        arguments: { ...reason.arguments },
      })),
    };
  }
  const spec = placementSpecOf(registry, command.definition);
  const component = locationOf(world, command.location);
  if (spec === null || component === undefined) return unknownDefinition(command.definition);
  const entity = allocateEntity(world);
  world.stores
    .get<{ definition: number }>('definition')
    .set(entity, { definition: command.definition });
  const owner = component.owner;
  if (owner !== null) {
    world.stores.get<{ owner: number }>('owner').set(entity, { owner });
  }
  applyStorageProvider(world, registry, command.definition, entity, command.location);
  world.stores.get('placement').set(entity, {
    capacityCost: spec.capacityCost,
    footprint: spec.footprint,
    conditions: [...spec.conditions],
  });
  if (component.grid !== undefined && spec.footprint !== null) {
    gridPolicy.place(world, entity, spec.footprint, transform);
  } else {
    const required =
      spec.footprint === null ? spec.capacityCost : spec.footprint.width * spec.footprint.height;
    resolveSpatialPolicy(component.spatialPolicy)?.add(world, command.location, required);
    world.stores.get<LogicalTransform>('transform').set(entity, transform);
    if (spec.footprint !== null) {
      world.stores.get<Footprint>('footprint').set(entity, spec.footprint);
    }
  }
  world.stores
    .get<{ enabled: boolean }>('enabled')
    .set(entity, { enabled: initiallyEnabledOf(registry, command.definition) });
  const plan: ConstructionPlan | null = planOf(
    registry,
    command.definition,
    firstInventoryOf(world, command.location),
  );
  if (plan === null) {
    setLifecycle(world, entity, 'active');
  } else {
    createConstructionPlan(world, entity, plan);
  }
  return { ok: true, entity };
}

/** Applies one `CancelEntityPlan` command (GDD-9.1). */
export function applyCancelEntityPlan(world: World, entity: EntityId): boolean {
  return requestCancellation(world, entity);
}

/** Applies one `CommitConstruction` command (GDD-18.1, TDS-12.2). */
export function applyCommitConstruction(
  world: World,
  tx: TransactionWriter,
  entity: EntityId,
): boolean {
  const state = lifecycleOf(world, entity);
  if (state !== 'planned' && state !== 'awaiting_resources' && state !== 'constructing') {
    return false;
  }
  const progress = constructionProgressOf(world, entity);
  const plan = constructionPlanOf(world, entity);
  if (progress === undefined || plan === undefined) return false;
  commitReservations(world, tx, progress.reservations);
  const committed: ConstructionProgress = {
    ...progress,
    reservations: [],
    committed: plan.costs.map((cost) => cost.quantity),
  };
  world.stores.get<ConstructionProgress>('constructionProgress').set(entity, committed);
  return true;
}

/** Applies one `DeconstructEntity` command (GDD-18.3). */
export function applyDeconstructEntity(world: World, entity: EntityId, atTick: Tick): boolean {
  return requestDeconstruction(world, entity, atTick);
}
