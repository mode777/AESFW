/**
 * Phase 1 — applyCommands (TDS-11.1, TDS-16.1). Re-validates and applies every
 * due scheduled command in `(tick, actor, seq)` order, emits `CommandApplied`
 * or `CommandRejected` per command, and records the outcomes for the tick.
 * The placement and construction commands of ARCH-7.3 are applied here.
 *
 * Source: TDS-16.1, TDS-16.2, TDS-16.3, ARCH-5.2, ARCH-7.2, ARCH-7.3
 */
import type { CapabilityConsumer } from '../sim/capabilities/types.js';
import type { Producer } from '../sim/production/types.js';
import { entityExists } from '../world/exists.js';
import type { ScheduledCommand, World } from '../world/types.js';
import type { CommandError, CommandOutcome } from '../commands/types.js';
import { compareScheduledCommands } from '../commands/order.js';
import type { EntityId, Tick } from '../ids/index.js';
import { writeCommandOutcomes } from '../pipeline/scratch.js';
import type { SystemDescriptor, TickContext } from '../pipeline/types.js';
import { lifecycleOf } from '../sim/construction/lifecycle.js';
import {
  applyCancelEntityPlan,
  applyCommitConstruction,
  applyDeconstructEntity,
  applyPlaceEntityPlan,
} from '../sim/placement/apply.js';

const applied = (commandId: string, tick: Tick, entity: EntityId): CommandOutcome => ({
  commandId,
  status: 'applied',
  tick,
  entity,
});

const rejected = (
  commandId: string,
  tick: Tick,
  errors: readonly CommandError[],
): CommandOutcome => ({ commandId, status: 'rejected', tick, errors });

const stampRevision = (world: World, entity: EntityId, tick: Tick): void => {
  world.stores.get<{ revision: number }>('revision').set(entity, { revision: tick });
};

const invalidState = (entity: EntityId, state: string): CommandError => ({
  code: 'invalid_construction_state',
  arguments: { entity, state },
});

const applyOne = (ctx: TickContext, scheduled: ScheduledCommand): CommandOutcome => {
  const world = ctx.world;
  const command = scheduled.command;
  const commandType: string = command.type;
  const emitApplied = (entity: EntityId, location: EntityId | null = null): CommandOutcome => {
    stampRevision(world, entity, ctx.tick);
    ctx.events.emit({
      type: 'CommandApplied',
      subjects: [entity],
      owner: scheduled.actor,
      location,
      payload: { command_id: scheduled.commandId, command_type: command.type },
    });
    return applied(scheduled.commandId, ctx.tick, entity);
  };
  const reject = (
    errors: readonly CommandError[],
    subjects: readonly EntityId[],
    location: EntityId | null = null,
  ): CommandOutcome => {
    ctx.events.emit({
      type: 'CommandRejected',
      subjects: [...subjects],
      owner: scheduled.actor,
      location,
      payload: {
        command_id: scheduled.commandId,
        command_type: command.type,
        errors: errors.map((error) => ({ code: error.code, arguments: { ...error.arguments } })),
      },
    });
    return rejected(scheduled.commandId, ctx.tick, errors);
  };

  switch (command.type) {
    case 'PlaceEntityPlan': {
      const outcome = applyPlaceEntityPlan(world, ctx.registry, command, ctx.conditionEvaluator);
      if (!outcome.ok) return reject(outcome.errors, [command.location], command.location);
      return emitApplied(outcome.entity, command.location);
    }
    case 'CancelEntityPlan': {
      if (!entityExists(world, command.entity)) {
        return reject(
          [{ code: 'unknown_entity', arguments: { entity: command.entity } }],
          [command.entity],
        );
      }
      if (!applyCancelEntityPlan(world, command.entity)) {
        const state = lifecycleOf(world, command.entity) ?? 'unknown';
        return reject([invalidState(command.entity, state)], [command.entity]);
      }
      return emitApplied(command.entity);
    }
    case 'CommitConstruction': {
      if (!entityExists(world, command.entity)) {
        return reject(
          [{ code: 'unknown_entity', arguments: { entity: command.entity } }],
          [command.entity],
        );
      }
      if (!applyCommitConstruction(world, ctx.tx, command.entity)) {
        const state = lifecycleOf(world, command.entity) ?? 'unknown';
        return reject([invalidState(command.entity, state)], [command.entity]);
      }
      return emitApplied(command.entity);
    }
    case 'DeconstructEntity': {
      if (!entityExists(world, command.entity)) {
        return reject(
          [{ code: 'unknown_entity', arguments: { entity: command.entity } }],
          [command.entity],
        );
      }
      if (!applyDeconstructEntity(world, command.entity, ctx.tick)) {
        const state = lifecycleOf(world, command.entity) ?? 'unknown';
        return reject([invalidState(command.entity, state)], [command.entity]);
      }
      return emitApplied(command.entity);
    }
    case 'SetEntityEnabled': {
      if (!entityExists(world, command.entity)) {
        return reject(
          [{ code: 'unknown_entity', arguments: { entity: command.entity } }],
          [command.entity],
        );
      }
      world.stores.get<{ enabled: boolean }>('enabled').set(command.entity, {
        enabled: command.enabled,
      });
      return emitApplied(command.entity);
    }
    case 'SelectRecipe': {
      const store = world.stores.get<Producer>('producer');
      const producer = store.get(command.entity);
      if (producer === undefined) {
        return reject(
          [{ code: 'unknown_entity', arguments: { entity: command.entity } }],
          [command.entity],
        );
      }
      const known =
        command.recipe === null ||
        producer.recipes.some((recipe) => recipe.recipe === command.recipe);
      if (!known) {
        return reject(
          [
            {
              code: 'invalid_recipe',
              arguments: { entity: command.entity, recipe: command.recipe },
            },
          ],
          [command.entity],
        );
      }
      store.set(command.entity, {
        ...producer,
        recipe: command.recipe,
        state: 'idle',
        blockReasons: [],
        progress: 0,
      });
      return emitApplied(command.entity);
    }
    case 'SetProcessPriority': {
      const store = world.stores.get<Producer>('producer');
      const producer = store.get(command.entity);
      if (producer === undefined) {
        return reject(
          [{ code: 'unknown_entity', arguments: { entity: command.entity } }],
          [command.entity],
        );
      }
      store.set(command.entity, { ...producer, processPriority: command.priority });
      return emitApplied(command.entity);
    }
    case 'SetCapabilityPriority': {
      const store = world.stores.get<CapabilityConsumer>('capabilityConsumer');
      const consumer = store.get(command.entity);
      if (consumer === undefined || consumer.capability !== command.capability) {
        return reject(
          [
            {
              code: 'unknown_capability',
              arguments: { entity: command.entity, capability: command.capability },
            },
          ],
          [command.entity],
        );
      }
      store.set(command.entity, { ...consumer, priority: command.priority });
      return emitApplied(command.entity);
    }
    default: {
      return reject([{ code: 'not_supported', arguments: { type: commandType } }], []);
    }
  }
};

export const phase01ApplyCommands: SystemDescriptor = {
  phase: 1,
  name: 'applyCommands',
  reads: ['commandQueue', 'location', 'locationHub'],
  writes: [
    'definition',
    'lifecycle',
    'enabled',
    'placement',
    'constructionPlan',
    'constructionProgress',
    'transform',
    'footprint',
    'location',
    'inventory',
    'ledger',
    'producer',
    'capabilityConsumer',
    'revision',
  ],
  run: (ctx) => {
    const world = ctx.world;
    const due = world.commandQueue
      .filter((scheduled) => scheduled.tick <= ctx.tick)
      .slice()
      .sort(compareScheduledCommands);
    if (due.length === 0) {
      writeCommandOutcomes(ctx.scratch, []);
      return;
    }
    const appliedIds = new Set<string>();
    const outcomes: CommandOutcome[] = [];
    for (const scheduled of due) {
      appliedIds.add(scheduled.commandId);
      outcomes.push(applyOne(ctx, scheduled));
    }
    world.commandQueue = world.commandQueue.filter(
      (scheduled) => !appliedIds.has(scheduled.commandId),
    );
    writeCommandOutcomes(ctx.scratch, outcomes);
  },
};
