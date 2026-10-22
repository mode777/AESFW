import { describe, expect, it } from 'vitest';
import { ids } from '@aesfw/core';
import type {
  Inventory,
  Location,
  LocationHub,
  LogicalTransform,
  Producer,
  World,
} from '@aesfw/core';
import { GRID_POLICY_ID } from '@aesfw/core';
import type { CompiledContent, CompiledDefinition, ContentRegistry } from '@aesfw/content';
import type { CommandEnvelopeDto, PlacementQueryDto } from '@aesfw/protocol';
import { advance, createSession, submitCommand } from './session.js';
import { placementQuery } from './placement.js';

const ENTITY = 'test.entity.builder';
const CONDITION = 'test.condition.place_ok';

const entityData = {
  components: {
    placement: { footprint: [1, 1], conditions: [CONDITION] },
    construction: {
      duration_ticks: 5,
      costs: [{ resource: 'test.resource.build', quantity: 1000 }],
      commit_policy: 'completion',
    },
  },
};

const conditionData = {
  id: CONDITION,
  expression: {
    greater: {
      left: { location_property: { property: 'test.property.suitability' } },
      right: 500,
    },
  },
};

const definitions = new Map<string, CompiledDefinition>([
  [ENTITY, { id: ENTITY, handle: ids.definitionHandle(10), type: 'entity', data: entityData }],
  [
    CONDITION,
    { id: CONDITION, handle: ids.definitionHandle(7), type: 'condition', data: conditionData },
  ],
  [
    'test.resource.build',
    {
      id: 'test.resource.build',
      handle: ids.definitionHandle(20),
      type: 'resource',
      data: { id: 'test.resource.build', tags: ['storable'] },
    },
  ],
]);

const registry: ContentRegistry = {
  stringIdOf: (type, handle) => {
    for (const definition of definitions.values()) {
      if (definition.type === type && definition.handle === handle)
        return ids.stringId(definition.id);
    }
    return null;
  },
  handleOf: (type, id) => {
    const definition = definitions.get(id);
    return definition !== undefined && definition.type === type ? definition.handle : null;
  },
  definitionOf: (type, handle) => {
    for (const definition of definitions.values()) {
      if (definition.type === type && definition.handle === handle) return definition;
    }
    return null;
  },
  definitionDataOf: (type, handle) => {
    for (const definition of definitions.values()) {
      if (definition.type === type && definition.handle === handle) return definition.data;
    }
    return null;
  },
  definitionsOf: (type) =>
    [...definitions.values()].filter((definition) => definition.type === type),
  tagsOf: () => [],
};

const content: CompiledContent = {
  registry,
  checksum: 'test',
  packages: [],
  presentation: null,
};

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

const addGridLocation = (world: World): void => {
  world.nextEntityId = ids.entityId(100);
  world.owners = {
    owners: [
      {
        handle: ids.ownerHandle(0),
        knowledge: [],
        accounts: [],
        purposeLocks: [],
        unlocks: [],
        deficitPaused: [],
      },
    ],
  };
  world.stores.get<Location>('location').set(ids.entityId(1), {
    template: ids.definitionHandle(0),
    spatialPolicy: GRID_POLICY_ID,
    capacity: 16,
    used: 0,
    properties: [{ property: ids.stringId('test.property.suitability'), value: 800 }],
    region: null,
    active: true,
    owner: ids.ownerHandle(0),
    grid: { width: 4, height: 4, blocked: [0] },
  });
  world.stores
    .get<LocationHub>('locationHub')
    .set(ids.entityId(1), { inventories: [ids.entityId(2)] });
  world.stores.get<Inventory>('inventory').set(ids.entityId(2), {
    owner: ids.ownerHandle(0),
    policy: 'framework.inventory.shared_location',
    revision: 0,
    entries: [],
    capacity: { total: null, perResource: null },
    acceptance: { accepts: [] },
  });
};

const makeSession = () => {
  const created = createSession(content, options);
  if (!created.ok) throw new Error('session creation failed');
  addGridLocation(created.value.world);
  return created.value;
};

const queryDto = (overrides: Partial<PlacementQueryDto> = {}): PlacementQueryDto => ({
  definition_id: ENTITY,
  location_id: 1,
  logical_transform: { position: [1, 1], orientation: 0 },
  ...overrides,
});

describe('[PIC-12.1] placement query through the application layer', () => {
  it('[PIC-12.1] a valid query reports valid with the session revision', () => {
    const session = makeSession();
    const result = placementQuery(content, session.world, session.revision, queryDto());
    expect(result.valid).toBe(true);
    expect(result.revision).toBe(0);
    expect(result.reasons).toEqual([]);
  });

  it('[PIC-12.1] a failed condition reports a reason', () => {
    const session = makeSession();
    const location = session.world.stores.get<Location>('location').get(ids.entityId(1));
    if (location === undefined) throw new Error('missing location');
    session.world.stores
      .get<Location>('location')
      .set(ids.entityId(1), { ...location, properties: [] });
    const result = placementQuery(content, session.world, session.revision, queryDto());
    expect(result.valid).toBe(false);
    expect(result.reasons[0]?.code).toBe('placement_condition_failed');
    expect(result.reasons[0]?.arguments).toEqual({ condition: CONDITION });
  });

  it('[PIC-12.1] an inactive location reports a reason', () => {
    const session = makeSession();
    const location = session.world.stores.get<Location>('location').get(ids.entityId(1));
    if (location === undefined) throw new Error('missing location');
    session.world.stores
      .get<Location>('location')
      .set(ids.entityId(1), { ...location, active: false });
    const result = placementQuery(content, session.world, session.revision, queryDto());
    expect(result.valid).toBe(false);
    expect(result.reasons[0]?.code).toBe('location_inactive');
  });

  it('[PIC-12.1] an unknown definition reports a reason', () => {
    const session = makeSession();
    const result = placementQuery(
      content,
      session.world,
      session.revision,
      queryDto({ definition_id: 'test.entity.absent' }),
    );
    expect(result.valid).toBe(false);
    expect(result.reasons[0]?.code).toBe('unknown_definition');
  });
});

describe('[ARCH-7.3] placement through the command gateway', () => {
  const envelope = (overrides: Partial<CommandEnvelopeDto> = {}): CommandEnvelopeDto => ({
    command_id: 'c1',
    actor_id: 'test.owner.1',
    type: 'PlaceEntityPlan',
    payload: {
      definition_id: ENTITY,
      location_id: 1,
      logical_transform: { position: [1, 1], orientation: 0 },
    },
    ...overrides,
  });

  it('[ARCH-7.3] a submitted placement is applied in phase 01', () => {
    const session = makeSession();
    const submitted = submitCommand(session, envelope());
    expect(submitted.result.status).toBe('accepted');
    const { session: advanced, outputs } = advance(submitted.session, 1);
    expect(outputs[0]?.outcomes[0]?.status).toBe('applied');
    expect(advanced.world.stores.get('constructionPlan').has(ids.entityId(100))).toBe(true);
    expect(
      advanced.world.stores.get<LogicalTransform>('transform').get(ids.entityId(100))?.position,
    ).toEqual({
      x: 1,
      y: 1,
    });
    expect(advanced.world.stores.get<Producer>('producer').get(ids.entityId(100))).toBeUndefined();
  });

  it('[ARCH-7.3] an illegal placement is rejected at the gateway', () => {
    const session = makeSession();
    const submitted = submitCommand(
      session,
      envelope({
        payload: {
          definition_id: ENTITY,
          location_id: 1,
          logical_transform: { position: [0, 0], orientation: 0 },
        },
      }),
    );
    expect(submitted.result.status).toBe('accepted');
    const { outputs } = advance(submitted.session, 1);
    const outcome = outputs[0]?.outcomes[0];
    expect(outcome?.status).toBe('rejected');
  });

  it('[ARCH-7.3] an unknown definition is rejected at the gateway', () => {
    const session = makeSession();
    const submitted = submitCommand(
      session,
      envelope({
        payload: {
          definition_id: 'test.entity.absent',
          location_id: 1,
          logical_transform: { position: [1, 1], orientation: 0 },
        },
      }),
    );
    expect(submitted.result.status).toBe('rejected');
    if (submitted.result.status === 'rejected') {
      expect(submitted.result.errors[0]?.code).toBe('unknown_definition');
    }
  });
});
