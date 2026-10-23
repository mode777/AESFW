import { describe, expect, it } from 'vitest';
import { ids } from '@aesfw/core';
import type { Producer, Registry } from '@aesfw/core';
import type { CompiledContent } from '@aesfw/content';
import type { CommandEnvelopeDto } from '@aesfw/protocol';
import { advance, createSession, submitCommand } from './session.js';

const RECIPE = 'test.recipe.a';

const registry: Registry = {
  stringIdOf: (type, handle) =>
    type === 'recipe' && handle === ids.definitionHandle(5) ? ids.stringId(RECIPE) : null,
  handleOf: (type, id) =>
    type === 'recipe' && id === ids.stringId(RECIPE) ? ids.definitionHandle(5) : null,
};

const content: CompiledContent = {
  registry,
  checksum: 'test',
  packages: [],
  presentation: null,
};

const producer = (): Producer => ({
  recipes: [
    {
      recipe: ids.definitionHandle(5),
      mode: 'batch',
      duration: 10,
      inputs: [],
      outputs: [],
      capabilities: [],
      condition: null,
    },
  ],
  recipe: ids.definitionHandle(5),
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

const options = {
  sessionId: 'session.1',
  seed: [1, 2] as [number, number],
  tickDurationMs: 100,
  world: null,
  enabledModules: [],
  hashInterval: 0,
  journal: false,
  actor: ids.ownerHandle(0),
  actorId: 'test.owner.1',
};

const envelope = (overrides: Partial<CommandEnvelopeDto> = {}): CommandEnvelopeDto => ({
  command_id: 'c1',
  actor_id: 'test.owner.1',
  type: 'SetEntityEnabled',
  payload: { entity_id: 1, enabled: false },
  ...overrides,
});

const sessionWithProducer = () => {
  const created = createSession(content, options);
  if (!created.ok) throw new Error('session creation failed');
  const session = created.value;
  session.world.stores.get<Producer>('producer').set(ids.entityId(1), producer());
  return session;
};

describe('[TDS-18.1] session creation', () => {
  it('[TDS-18.1] a session starts at revision 0', () => {
    const created = createSession(content, options);
    expect(created.ok).toBe(true);
    if (created.ok) {
      expect(created.value.revision).toBe(0);
      expect(created.value.world.tick).toBe(0);
      expect(created.value.commandLog).toEqual([]);
    }
  });
});

describe('[TDS-18.2] command submission', () => {
  it('[TDS-18.2] a valid command is accepted and scheduled', () => {
    const session = sessionWithProducer();
    const { session: next, result } = submitCommand(session, envelope());
    expect(result.status).toBe('accepted');
    if (result.status === 'accepted') expect(result.scheduled_tick).toBe(1);
    expect(next.revision).toBe(1);
    expect(next.world.commandQueue).toHaveLength(1);
  });

  it('[TDS-18.2] a command from another actor is rejected', () => {
    const session = sessionWithProducer();
    const { session: next, result } = submitCommand(
      session,
      envelope({ actor_id: 'test.owner.2' }),
    );
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') expect(result.errors[0]?.code).toBe('not_owner');
    expect(next.world.commandQueue).toHaveLength(0);
  });
});

describe('[TDS-18.3] gateway reference and revision checks', () => {
  it('[TDS-18.3] a missing entity is rejected', () => {
    const session = sessionWithProducer();
    const { result } = submitCommand(
      session,
      envelope({ type: 'SelectRecipe', payload: { entity_id: 999, recipe_id: RECIPE } }),
    );
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') expect(result.errors[0]?.code).toBe('unknown_entity');
  });

  it('[TDS-18.3] a stale expected revision is rejected', () => {
    const session = sessionWithProducer();
    session.world.stores.get<{ revision: number }>('revision').set(ids.entityId(1), {
      revision: 5,
    });
    const { result } = submitCommand(session, envelope({ expected_session_revision: 3 }));
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.errors[0]?.code).toBe('state_revision_mismatch');
      expect(result.errors[0]?.arguments).toEqual({ expected: 3, actual: 5 });
    }
  });

  it('[TDS-18.3] a command without an expected revision is not revision-checked', () => {
    const session = sessionWithProducer();
    session.world.stores.get<{ revision: number }>('revision').set(ids.entityId(1), {
      revision: 5,
    });
    const { result } = submitCommand(session, envelope());
    expect(result.status).toBe('accepted');
  });
});

describe('[TDS-18.1] advance', () => {
  it('[TDS-18.1] advancing a session runs ticks', () => {
    const session = sessionWithProducer();
    const { session: next, outputs } = advance(session, 3);
    expect(next.world.tick).toBe(3);
    expect(next.revision).toBe(3);
    expect(outputs).toHaveLength(3);
  });

  it('[TDS-18.1] advancing zero ticks changes nothing', () => {
    const session = sessionWithProducer();
    const { session: next, outputs } = advance(session, 0);
    expect(outputs).toHaveLength(0);
    expect(next.world.tick).toBe(0);
    expect(next.revision).toBe(0);
  });
});

describe('[TDS-16.1] ResumeDeficitPausedEntities mapping', () => {
  it('[TDS-16.1] an entity list maps to the command', () => {
    const session = sessionWithProducer();
    session.world.stores
      .get<{ definition: number }>('definition')
      .set(ids.entityId(1), { definition: 1 });
    const { result } = submitCommand(
      session,
      envelope({ type: 'ResumeDeficitPausedEntities', payload: { entities: [1] } }),
    );
    expect(result.status).toBe('accepted');
  });

  it('[TDS-16.1] the all form maps to the command', () => {
    const session = sessionWithProducer();
    const { result } = submitCommand(
      session,
      envelope({ type: 'ResumeDeficitPausedEntities', payload: { entities: 'all' } }),
    );
    expect(result.status).toBe('accepted');
  });

  it('[TDS-16.1] a malformed payload is rejected', () => {
    const session = sessionWithProducer();
    const { result } = submitCommand(
      session,
      envelope({ type: 'ResumeDeficitPausedEntities', payload: { entities: 5 } }),
    );
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') expect(result.errors[0]?.code).toBe('unknown_command');
  });
});
