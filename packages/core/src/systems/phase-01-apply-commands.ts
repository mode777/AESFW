/**
 * Phase 1 — applyCommands (TDS-11.1, TDS-16.1). Re-validates and applies every
 * due scheduled command in `(tick, actor, seq)` order, emits `CommandApplied`
 * or `CommandRejected` per command, and records the outcomes for the tick.
 *
 * Source: TDS-16.1, TDS-16.2, TDS-16.3, ARCH-5.2, ARCH-7.2
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

const applyOne = (ctx: TickContext, scheduled: ScheduledCommand): CommandOutcome => {
  const world = ctx.world;
  const command = scheduled.command;
  const commandType: string = command.type;
  const emitApplied = (entity: EntityId): CommandOutcome => {
    stampRevision(world, entity, ctx.tick);
    ctx.events.emit({
      type: 'CommandApplied',
      subjects: [entity],
      owner: scheduled.actor,
      location: null,
      payload: { command_id: scheduled.commandId, command_type: command.type },
    });
    return applied(scheduled.commandId, ctx.tick, entity);
  };
  const reject = (errors: readonly CommandError[]): CommandOutcome => {
    ctx.events.emit({
      type: 'CommandRejected',
      subjects: [command.entity],
      owner: scheduled.actor,
      location: null,
      payload: {
        command_id: scheduled.commandId,
        command_type: command.type,
        errors: errors.map((error) => ({ code: error.code, arguments: { ...error.arguments } })),
      },
    });
    return rejected(scheduled.commandId, ctx.tick, errors);
  };

  switch (command.type) {
    case 'SetEntityEnabled': {
      if (!entityExists(world, command.entity)) {
        return reject([{ code: 'unknown_entity', arguments: { entity: command.entity } }]);
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
        return reject([{ code: 'unknown_entity', arguments: { entity: command.entity } }]);
      }
      const known =
        command.recipe === null ||
        producer.recipes.some((recipe) => recipe.recipe === command.recipe);
      if (!known) {
        return reject([
          {
            code: 'invalid_recipe',
            arguments: { entity: command.entity, recipe: command.recipe },
          },
        ]);
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
        return reject([{ code: 'unknown_entity', arguments: { entity: command.entity } }]);
      }
      store.set(command.entity, { ...producer, processPriority: command.priority });
      return emitApplied(command.entity);
    }
    case 'SetCapabilityPriority': {
      const store = world.stores.get<CapabilityConsumer>('capabilityConsumer');
      const consumer = store.get(command.entity);
      if (consumer === undefined || consumer.capability !== command.capability) {
        return reject([
          {
            code: 'unknown_capability',
            arguments: { entity: command.entity, capability: command.capability },
          },
        ]);
      }
      store.set(command.entity, { ...consumer, priority: command.priority });
      return emitApplied(command.entity);
    }
    default: {
      return reject([{ code: 'not_supported', arguments: { type: commandType } }]);
    }
  }
};

export const phase01ApplyCommands: SystemDescriptor = {
  phase: 1,
  name: 'applyCommands',
  reads: ['commandQueue'],
  writes: ['enabled', 'producer', 'capabilityConsumer', 'revision'],
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
