import { describe, expect, it } from 'vitest';
import { createWorld } from '../world/create.js';
import { createEmptyRegistry } from '../registry/types.js';
import { entityId, definitionHandle, ownerHandle, tick } from '../ids/index.js';
import type { ScheduledCommand } from '../world/types.js';
import type { Producer } from '../sim/production/types.js';
import type { CapabilityConsumer } from '../sim/capabilities/types.js';
import type { TickInput } from '../pipeline/types.js';
import { runPhases, stores } from '../testing.js';

const registry = createEmptyRegistry();

const world = () => {
  const created = createWorld(registry, {
    seed: [0, 0],
    tickDurationMs: 100,
    world: null,
    enabledModules: [],
  });
  if (!created.ok) throw new Error('world creation failed');
  return created.value;
};

const producer = (recipeHandle: number): Producer => ({
  recipes: [
    {
      recipe: definitionHandle(recipeHandle),
      mode: 'batch',
      duration: 10,
      inputs: [],
      outputs: [],
      capabilities: [],
      condition: null,
    },
  ],
  recipe: definitionHandle(recipeHandle),
  processSlots: 1,
  location: null,
  inputInventory: null,
  outputInventory: null,
  state: 'idle',
  blockReasons: [],
  progress: 0,
  inputReservations: [],
  capacityReservations: [],
});

const input = (commands: readonly ScheduledCommand[]): TickInput => ({
  commands,
  options: { journal: false, hash: false },
});

const scheduled = (
  commandId: string,
  actor: number,
  seq: number,
  command: ScheduledCommand['command'],
): ScheduledCommand => ({ commandId, actor: ownerHandle(actor), tick: tick(1), seq, command });

describe('[TDS-16.1] phase 01 applyCommands', () => {
  it('[TDS-16.1] SetEntityEnabled disables an entity and emits CommandApplied', () => {
    const w = world();
    stores(w).get<Producer>('producer').set(entityId(1), producer(5));
    const output = runPhases(
      w,
      registry,
      [1],
      input([
        scheduled('c1', 0, 0, { type: 'SetEntityEnabled', entity: entityId(1), enabled: false }),
      ]),
    );
    expect(stores(w).get('enabled').get(entityId(1))).toEqual({ enabled: false });
    expect(output.outcomes[0]?.status).toBe('applied');
    expect(output.events.some((event) => event.type === 'CommandApplied')).toBe(true);
  });

  it('[TDS-16.2] SelectRecipe with an unknown recipe is rejected', () => {
    const w = world();
    stores(w).get<Producer>('producer').set(entityId(1), producer(5));
    const output = runPhases(
      w,
      registry,
      [1],
      input([
        scheduled('c1', 0, 0, {
          type: 'SelectRecipe',
          entity: entityId(1),
          recipe: definitionHandle(99),
        }),
      ]),
    );
    expect(output.outcomes[0]?.status).toBe('rejected');
    const rejectedEvent = output.events.find((event) => event.type === 'CommandRejected');
    expect(rejectedEvent).toBeDefined();
    expect(stores(w).get<Producer>('producer').get(entityId(1))?.recipe).toBe(definitionHandle(5));
  });

  it('[TDS-16.2] SelectRecipe selects a known recipe', () => {
    const w = world();
    stores(w).get<Producer>('producer').set(entityId(1), producer(5));
    const output = runPhases(
      w,
      registry,
      [1],
      input([
        scheduled('c1', 0, 0, {
          type: 'SelectRecipe',
          entity: entityId(1),
          recipe: definitionHandle(5),
        }),
      ]),
    );
    expect(output.outcomes[0]?.status).toBe('applied');
  });

  it('[TDS-16.3] a command for a missing producer is rejected with unknown_entity', () => {
    const w = world();
    const output = runPhases(
      w,
      registry,
      [1],
      input([
        scheduled('c1', 0, 0, { type: 'SetProcessPriority', entity: entityId(2), priority: 3 }),
      ]),
    );
    expect(output.outcomes[0]?.status).toBe('rejected');
    const rejectedEvent = output.events.find((event) => event.type === 'CommandRejected');
    expect(rejectedEvent?.payload).toMatchObject({
      errors: [{ code: 'unknown_entity' }],
    });
  });

  it('[TDS-16.2] SetProcessPriority and SetCapabilityPriority apply', () => {
    const w = world();
    stores(w).get<Producer>('producer').set(entityId(1), producer(5));
    stores(w)
      .get<CapabilityConsumer>('capabilityConsumer')
      .set(entityId(1), {
        capability: definitionHandle(7),
        substitutes: [],
        scope: 'location',
        location: null,
        model: 'proportional',
        priority: 0,
        weight: 1000,
        request: 10,
      });
    const output = runPhases(
      w,
      registry,
      [1],
      input([
        scheduled('c1', 0, 0, { type: 'SetProcessPriority', entity: entityId(1), priority: 4 }),
        scheduled('c2', 0, 1, {
          type: 'SetCapabilityPriority',
          entity: entityId(1),
          capability: definitionHandle(7),
          priority: 2,
        }),
      ]),
    );
    expect(output.outcomes.every((outcome) => outcome.status === 'applied')).toBe(true);
    expect(stores(w).get<Producer>('producer').get(entityId(1))?.processPriority).toBe(4);
    expect(stores(w).get<CapabilityConsumer>('capabilityConsumer').get(entityId(1))?.priority).toBe(
      2,
    );
  });

  it('[TDS-16.1] due commands apply in submission-sequence order', () => {
    const w = world();
    stores(w).get<Producer>('producer').set(entityId(1), producer(5));
    stores(w).get<Producer>('producer').set(entityId(2), producer(5));
    const output = runPhases(
      w,
      registry,
      [1],
      input([
        scheduled('late', 0, 1, { type: 'SetEntityEnabled', entity: entityId(1), enabled: false }),
        scheduled('early', 0, 0, { type: 'SetEntityEnabled', entity: entityId(2), enabled: false }),
      ]),
    );
    expect(output.outcomes.map((outcome) => outcome.commandId)).toEqual(['early', 'late']);
  });

  it('[TDS-16.1] the queue is drained after application', () => {
    const w = world();
    stores(w).get<Producer>('producer').set(entityId(1), producer(5));
    runPhases(
      w,
      registry,
      [1],
      input([
        scheduled('c1', 0, 0, { type: 'SetEntityEnabled', entity: entityId(1), enabled: true }),
      ]),
    );
    expect(w.commandQueue).toHaveLength(0);
  });
});

describe('[ARCH-7.2] ResumeDeficitPausedEntities', () => {
  const withPausedOwner = (w: ReturnType<typeof world>, paused: readonly number[]) => {
    for (const entity of paused) {
      stores(w).get<{ definition: number }>('definition').set(entityId(entity), { definition: 1 });
    }
    w.owners = {
      owners: [
        {
          handle: ownerHandle(0),
          knowledge: [],
          accounts: [],
          purposeLocks: [],
          unlocks: [],
          deficitPaused: paused.map((entity) => entityId(entity)),
        },
      ],
    };
    return w;
  };

  it('[ARCH-7.2] the command resumes a named entity', () => {
    const w = withPausedOwner(world(), [2]);
    const output = runPhases(
      w,
      registry,
      [1],
      input([
        scheduled('c1', 0, 0, { type: 'ResumeDeficitPausedEntities', entities: [entityId(2)] }),
      ]),
    );
    expect(w.owners.owners[0]?.deficitPaused).toEqual([]);
    expect(output.outcomes[0]?.status).toBe('applied');
    expect(output.events[0]?.type).toBe('CommandApplied');
  });

  it('[ARCH-7.2] the command resumes all paused entities', () => {
    const w = withPausedOwner(world(), [2, 3]);
    runPhases(
      w,
      registry,
      [1],
      input([scheduled('c1', 0, 0, { type: 'ResumeDeficitPausedEntities', entities: 'all' })]),
    );
    expect(w.owners.owners[0]?.deficitPaused).toEqual([]);
  });

  it('[ARCH-7.2] a command naming a missing entity is rejected', () => {
    const w = withPausedOwner(world(), []);
    const output = runPhases(
      w,
      registry,
      [1],
      input([
        scheduled('c1', 0, 0, { type: 'ResumeDeficitPausedEntities', entities: [entityId(9)] }),
      ]),
    );
    expect(output.outcomes[0]?.status).toBe('rejected');
    if (output.outcomes[0]?.status === 'rejected') {
      expect(output.outcomes[0].errors[0]?.code).toBe('unknown_entity');
    }
  });
});
