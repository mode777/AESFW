import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, ownerHandle, stringId } from '../../ids/index.js';
import type { EntityId } from '../../ids/index.js';
import { GRID_POLICY_ID } from '../../policies/spatial/index.js';
import { gridPolicy } from '../../policies/spatial/grid.js';
import { runPhases } from '../../pipeline/step.js';
import type { TickInput } from '../../pipeline/types.js';
import type { Registry } from '../../registry/types.js';
import type { ScheduledCommand } from '../../world/types.js';
import type { World } from '../../world/types.js';
import { createWorld } from '../../world/create.js';
import { stores } from '../../testing.js';
import type { Inventory } from '../../tx/inventory.js';
import { createTransactionWriter } from '../../tx/index.js';
import { locationOf } from '../location.js';
import type { Location, LocationHub } from '../location.js';
import type { LogicalTransform } from '../spatial.js';
import {
  createConstructionPlan,
  constructionPlanOf,
  constructionProgressOf,
} from '../construction/plan.js';
import { lifecycleOf, setLifecycle } from '../construction/lifecycle.js';
import type { ConstructionPlan } from '../construction/types.js';
import type { PlacementConditionEvaluator } from './types.js';
import { evaluatePlacement } from './query.js';
import { placementSpecOf } from './definition.js';

const CONDITION = 'test.condition.place_ok';
const ENTITY = 10;
const ENTITY_NO_CONSTRUCTION = 11;
const ENTITY_BIG = 12;
const ENTITY_COUNT = 13;
const ENTITY_SPEC = 14;
const RESOURCE = 20;
const CONDITION_HANDLE = 7;

const entityDefinition = (components: Record<string, unknown>): Record<string, unknown> => ({
  components,
});

const registry: Registry = {
  stringIdOf: (type, handle) =>
    type === 'condition' && handle === CONDITION_HANDLE ? stringId(CONDITION) : null,
  handleOf: (type, id) =>
    type === 'condition' && id === stringId(CONDITION) ? definitionHandle(CONDITION_HANDLE) : null,
  definitionDataOf: (type, handle) => {
    if (type !== 'entity') return null;
    if (handle === definitionHandle(ENTITY)) {
      return entityDefinition({
        placement: { capacity_cost: 1, footprint: [1, 1], conditions: [CONDITION] },
        construction: {
          duration_ticks: 5,
          costs: [{ resource: 'test.resource.build', quantity: 1000 }],
          commit_policy: 'completion',
        },
      }) as never;
    }
    if (handle === definitionHandle(ENTITY_NO_CONSTRUCTION)) {
      return entityDefinition({ placement: { capacity_cost: 1, footprint: [1, 1] } }) as never;
    }
    if (handle === definitionHandle(ENTITY_BIG)) {
      return entityDefinition({ placement: { footprint: [3, 3] } }) as never;
    }
    if (handle === definitionHandle(ENTITY_COUNT)) {
      return entityDefinition({ placement: { capacity_cost: 10 } }) as never;
    }
    if (handle === definitionHandle(ENTITY_SPEC)) {
      return entityDefinition({ placement: { capacity_cost: 10, footprint: [2, 2] } }) as never;
    }
    return null;
  },
};

const alwaysTrue: PlacementConditionEvaluator = () => true;
const alwaysFalse: PlacementConditionEvaluator = () => false;

const input = (commands: readonly ScheduledCommand[] = []): TickInput => ({
  commands,
  options: { journal: false, hash: false },
  conditionEvaluator: alwaysTrue,
});

const makeWorld = (): World => {
  const result = createWorld(
    { stringIdOf: () => null, handleOf: () => null },
    { seed: [1, 2], tickDurationMs: 1000, world: null, enabledModules: [] },
  );
  if (!result.ok) throw new Error('createWorld failed');
  const world = result.value;
  world.nextEntityId = entityId(100);
  world.owners = {
    owners: [
      {
        handle: ownerHandle(0),
        knowledge: [],
        accounts: [],
        purposeLocks: [],
        unlocks: [],
        deficitPaused: [],
      },
    ],
  };
  return world;
};

const addGridLocation = (world: World, blocked: readonly number[] = [0]): void => {
  stores(world)
    .get<Location>('location')
    .set(entityId(1), {
      template: definitionHandle(0),
      spatialPolicy: GRID_POLICY_ID,
      capacity: 16,
      used: 0,
      properties: [],
      region: null,
      active: true,
      owner: ownerHandle(0),
      grid: { width: 4, height: 4, blocked: [...blocked] },
    });
  stores(world)
    .get<LocationHub>('locationHub')
    .set(entityId(1), { inventories: [entityId(2)] });
  stores(world)
    .get<Inventory>('inventory')
    .set(entityId(2), {
      owner: ownerHandle(0),
      policy: 'framework.inventory.shared_location',
      revision: 0,
      entries: [],
      capacity: { total: null, perResource: null },
      acceptance: { accepts: [] },
    });
};

const addCountLocation = (world: World, capacity: number, used: number): void => {
  stores(world)
    .get<Location>('location')
    .set(entityId(3), {
      template: definitionHandle(0),
      spatialPolicy: 'framework.spatial.abstract_capacity',
      capacity,
      used,
      properties: [],
      region: null,
      active: true,
      owner: ownerHandle(0),
    });
};

const transform = (location: EntityId, x: number, y: number): LogicalTransform => ({
  location,
  position: { x, y },
  orientation: 0,
});

const query = (definition: number, location: EntityId, t: LogicalTransform) => ({
  definition: definitionHandle(definition),
  location,
  transform: t,
});

describe('[GDD-18.2][CONT-6.8] generic placement predicates', () => {
  it('[GDD-18.2] a placement component declares its cost and footprint', () => {
    const spec = placementSpecOf(registry, definitionHandle(ENTITY_SPEC));
    expect(spec?.capacityCost).toBe(10);
    expect(spec?.footprint).toEqual({ width: 2, height: 2 });
  });

  it('[GDD-18.2] a valid placement is accepted', () => {
    const world = makeWorld();
    addGridLocation(world);
    const result = evaluatePlacement(
      world,
      registry,
      query(ENTITY, entityId(1), transform(entityId(1), 1, 1)),
      alwaysTrue,
    );
    expect(result.ok).toBe(true);
  });

  it('[GDD-18.2] an unknown location is rejected', () => {
    const world = makeWorld();
    const result = evaluatePlacement(
      world,
      registry,
      query(ENTITY, entityId(9), transform(entityId(9), 1, 1)),
      alwaysTrue,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasons[0]?.code).toBe('unknown_location');
  });

  it('[GDD-18.2] an inactive location is rejected', () => {
    const world = makeWorld();
    addGridLocation(world);
    const location = locationOf(world, entityId(1));
    if (location === undefined) throw new Error('missing location');
    stores(world)
      .get<Location>('location')
      .set(entityId(1), { ...location, active: false });
    const result = evaluatePlacement(
      world,
      registry,
      query(ENTITY, entityId(1), transform(entityId(1), 1, 1)),
      alwaysTrue,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasons[0]?.code).toBe('location_inactive');
  });

  it('[GDD-18.2] a footprint outside the grid is rejected', () => {
    const world = makeWorld();
    addGridLocation(world);
    const result = evaluatePlacement(
      world,
      registry,
      query(ENTITY_BIG, entityId(1), transform(entityId(1), 3, 3)),
      alwaysTrue,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasons[0]?.code).toBe('out_of_bounds');
  });

  it('[GDD-18.2] a blocked cell is rejected', () => {
    const world = makeWorld();
    addGridLocation(world, [0]);
    const result = evaluatePlacement(
      world,
      registry,
      query(ENTITY, entityId(1), transform(entityId(1), 0, 0)),
      alwaysTrue,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasons[0]?.code).toBe('not_buildable');
  });

  it('[GDD-18.2] an occupied cell is rejected', () => {
    const world = makeWorld();
    addGridLocation(world);
    const placed = gridPolicy.place(
      world,
      entityId(50),
      { width: 1, height: 1 },
      transform(entityId(1), 1, 1),
    );
    expect(placed.ok).toBe(true);
    const result = evaluatePlacement(
      world,
      registry,
      query(ENTITY, entityId(1), transform(entityId(1), 1, 1)),
      alwaysTrue,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasons[0]?.code).toBe('occupied');
  });

  it('[GDD-18.2] a footprint beyond grid capacity is rejected', () => {
    const world = makeWorld();
    addGridLocation(world, [0, 1, 2, 3]);
    const location = locationOf(world, entityId(1));
    if (location === undefined) throw new Error('missing location');
    stores(world)
      .get<Location>('location')
      .set(entityId(1), { ...location, used: 4 });
    const result = evaluatePlacement(
      world,
      registry,
      query(ENTITY_BIG, entityId(1), transform(entityId(1), 0, 1)),
      alwaysTrue,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasons[0]?.code).toBe('insufficient_capacity');
      expect(result.reasons[0]?.arguments).toEqual({ required: 9, available: 8 });
    }
  });

  it('[GDD-18.2] a count beyond abstract capacity is rejected', () => {
    const world = makeWorld();
    addCountLocation(world, 12, 3);
    const result = evaluatePlacement(
      world,
      registry,
      query(ENTITY_COUNT, entityId(3), transform(entityId(3), 0, 0)),
      alwaysTrue,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasons[0]?.code).toBe('insufficient_capacity');
      expect(result.reasons[0]?.arguments).toEqual({ required: 10, available: 9 });
    }
  });

  it('[GDD-18.2] a satisfied condition is accepted', () => {
    const world = makeWorld();
    addGridLocation(world);
    const result = evaluatePlacement(
      world,
      registry,
      query(ENTITY, entityId(1), transform(entityId(1), 1, 1)),
      alwaysTrue,
    );
    expect(result.ok).toBe(true);
  });

  it('[GDD-18.2] a failed condition is rejected', () => {
    const world = makeWorld();
    addGridLocation(world);
    const result = evaluatePlacement(
      world,
      registry,
      query(ENTITY, entityId(1), transform(entityId(1), 1, 1)),
      alwaysFalse,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasons[0]?.code).toBe('placement_condition_failed');
      expect(result.reasons[0]?.arguments).toEqual({ condition: CONDITION });
    }
  });
});

describe('[PIC-12.1] placement query', () => {
  it('[PIC-12.1] a valid query returns no reasons', () => {
    const world = makeWorld();
    addGridLocation(world);
    const result = evaluatePlacement(
      world,
      registry,
      query(ENTITY, entityId(1), transform(entityId(1), 1, 1)),
      alwaysTrue,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result).toEqual({ ok: true });
  });

  it('[PIC-12.1] an invalid query returns its reasons', () => {
    const world = makeWorld();
    addGridLocation(world);
    const result = evaluatePlacement(
      world,
      registry,
      query(ENTITY, entityId(1), transform(entityId(1), 0, 0)),
      alwaysTrue,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasons.map((reason) => reason.code)).toContain('not_buildable');
  });

  it('[PIC-12.1] a query does not mutate the world', () => {
    const world = makeWorld();
    addGridLocation(world);
    const before = world.tick;
    const ledger = world.ledger.reservations.length;
    evaluatePlacement(
      world,
      registry,
      query(ENTITY, entityId(1), transform(entityId(1), 1, 1)),
      alwaysTrue,
    );
    expect(world.tick).toBe(before);
    expect(world.ledger.reservations).toHaveLength(ledger);
    expect(stores(world).get('lifecycle').size()).toBe(0);
  });

  it('[PIC-12.1] an unknown definition is rejected', () => {
    const world = makeWorld();
    addGridLocation(world);
    const result = evaluatePlacement(
      world,
      registry,
      query(999, entityId(1), transform(entityId(1), 1, 1)),
      alwaysTrue,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasons[0]?.code).toBe('unknown_definition');
  });
});

describe('[GDD-18.1][ARCH-7.3] placement and construction commands', () => {
  const scheduled = (command: ScheduledCommand['command'], seq: number): ScheduledCommand => ({
    commandId: `c${seq}`,
    actor: ownerHandle(0),
    tick: 1 as never,
    seq,
    command,
  });

  it('[GDD-18.1] a legal placement creates a planned entity', () => {
    const world = makeWorld();
    addGridLocation(world);
    const command = scheduled(
      {
        type: 'PlaceEntityPlan',
        definition: definitionHandle(ENTITY),
        location: entityId(1),
        transform: transform(entityId(1), 1, 1),
      },
      0,
    );
    runPhases(world, registry, [1], input([command]));
    expect(lifecycleOf(world, entityId(100))).toBe('planned');
    expect(stores(world).get('definition').get(entityId(100))).toEqual({ definition: ENTITY });
    expect(stores(world).get<LogicalTransform>('transform').get(entityId(100))?.position).toEqual({
      x: 1,
      y: 1,
    });
    expect(constructionPlanOf(world, entityId(100))?.duration).toBe(5);
  });

  it('[GDD-18.1] a definition without construction activates immediately', () => {
    const world = makeWorld();
    addGridLocation(world);
    const command = scheduled(
      {
        type: 'PlaceEntityPlan',
        definition: definitionHandle(ENTITY_NO_CONSTRUCTION),
        location: entityId(1),
        transform: transform(entityId(1), 1, 1),
      },
      0,
    );
    runPhases(world, registry, [1], input([command]));
    expect(lifecycleOf(world, entityId(100))).toBe('active');
    expect(constructionPlanOf(world, entityId(100))).toBeUndefined();
  });

  it('[GDD-18.1] an illegal placement allocates no entity', () => {
    const world = makeWorld();
    addGridLocation(world);
    const before = world.nextEntityId;
    const command = scheduled(
      {
        type: 'PlaceEntityPlan',
        definition: definitionHandle(ENTITY),
        location: entityId(1),
        transform: transform(entityId(1), 0, 0),
      },
      0,
    );
    const output = runPhases(world, registry, [1], input([command]));
    expect(world.nextEntityId).toBe(before);
    const rejected = output.outcomes[0];
    expect(rejected?.status).toBe('rejected');
    if (rejected?.status === 'rejected') expect(rejected.errors[0]?.code).toBe('not_buildable');
  });

  it('[GDD-18.1] an unknown definition is rejected', () => {
    const world = makeWorld();
    addGridLocation(world);
    const command = scheduled(
      {
        type: 'PlaceEntityPlan',
        definition: definitionHandle(999),
        location: entityId(1),
        transform: transform(entityId(1), 1, 1),
      },
      0,
    );
    const output = runPhases(world, registry, [1], input([command]));
    const rejected = output.outcomes[0];
    expect(rejected?.status).toBe('rejected');
    if (rejected?.status === 'rejected')
      expect(rejected.errors[0]?.code).toBe('unknown_definition');
  });

  it('[GDD-18.1] two placements apply in submission order', () => {
    const world = makeWorld();
    addGridLocation(world);
    const place = (seq: number): ScheduledCommand =>
      scheduled(
        {
          type: 'PlaceEntityPlan',
          definition: definitionHandle(ENTITY_NO_CONSTRUCTION),
          location: entityId(1),
          transform: transform(entityId(1), 1, 1),
        },
        seq,
      );
    const output = runPhases(world, registry, [1], input([place(0), place(1)]));
    expect(output.outcomes[0]?.status).toBe('applied');
    expect(output.outcomes[1]?.status).toBe('rejected');
    if (output.outcomes[1]?.status === 'rejected') {
      expect(output.outcomes[1].errors[0]?.code).toBe('occupied');
    }
  });

  it('[GDD-20.2] a placed entity carries its location owner', () => {
    const world = makeWorld();
    addGridLocation(world);
    const command = scheduled(
      {
        type: 'PlaceEntityPlan',
        definition: definitionHandle(ENTITY),
        location: entityId(1),
        transform: transform(entityId(1), 1, 1),
      },
      0,
    );
    runPhases(world, registry, [1], input([command]));
    expect(stores(world).get<{ owner: number }>('owner').get(entityId(100))).toEqual({
      owner: ownerHandle(0),
    });
  });

  it('[GDD-9.1] cancel applies from planned and is rejected from active', () => {
    const world = makeWorld();
    addGridLocation(world);
    const plan: ConstructionPlan = {
      duration: 5,
      costs: [],
      commitPolicy: 'completion',
      inventory: entityId(2),
      deconstruct: null,
    };
    createConstructionPlan(world, entityId(40), plan);
    createConstructionPlan(world, entityId(41), plan);
    setLifecycle(world, entityId(41), 'active');
    const output = runPhases(
      world,
      registry,
      [1],
      input([
        scheduled({ type: 'CancelEntityPlan', entity: entityId(40) }, 0),
        scheduled({ type: 'CancelEntityPlan', entity: entityId(41) }, 1),
      ]),
    );
    expect(lifecycleOf(world, entityId(40))).toBe('cancelled');
    expect(lifecycleOf(world, entityId(41))).toBe('active');
    expect(output.outcomes[0]?.status).toBe('applied');
    expect(output.outcomes[1]?.status).toBe('rejected');
    if (output.outcomes[1]?.status === 'rejected') {
      expect(output.outcomes[1].errors[0]?.code).toBe('invalid_construction_state');
    }
  });

  it('[GDD-18.1] commit consumes the reservation and is rejected from active', () => {
    const world = makeWorld();
    addGridLocation(world);
    stores(world)
      .get<Inventory>('inventory')
      .set(entityId(2), {
        owner: ownerHandle(0),
        policy: 'framework.inventory.shared_location',
        revision: 0,
        entries: [{ resource: definitionHandle(RESOURCE), quantity: 1000 }],
        capacity: { total: null, perResource: null },
        acceptance: { accepts: [] },
      });
    const plan: ConstructionPlan = {
      duration: 5,
      costs: [{ resource: definitionHandle(RESOURCE), quantity: 1000 }],
      commitPolicy: 'completion',
      inventory: entityId(2),
      deconstruct: null,
    };
    createConstructionPlan(world, entityId(42), plan);
    createConstructionPlan(world, entityId(43), plan);
    setLifecycle(world, entityId(43), 'active');
    const writer = createTransactionWriter(world, null);
    const reserved = writer.reserve({
      inventory: entityId(2),
      resource: definitionHandle(RESOURCE),
      quantity: 1000,
      purpose: 'construction',
      holder: entityId(42),
    });
    if (!reserved.ok) throw new Error('reserve failed');
    setLifecycle(world, entityId(42), 'constructing');
    const progress = constructionProgressOf(world, entityId(42));
    if (progress === undefined) throw new Error('missing progress');
    stores(world)
      .get('constructionProgress')
      .set(entityId(42), { ...progress, reservations: [reserved.value.id] });
    const output = runPhases(
      world,
      registry,
      [1],
      input([
        scheduled({ type: 'CommitConstruction', entity: entityId(42) }, 0),
        scheduled({ type: 'CommitConstruction', entity: entityId(43) }, 1),
      ]),
    );
    expect(output.outcomes[0]?.status).toBe('applied');
    expect(output.outcomes[1]?.status).toBe('rejected');
    expect(constructionProgressOf(world, entityId(42))?.reservations).toEqual([]);
    expect(world.ledger.reservations).toHaveLength(0);
  });

  it('[GDD-18.3] deconstruct applies from active and is rejected from terminal', () => {
    const world = makeWorld();
    addGridLocation(world);
    const plan: ConstructionPlan = {
      duration: 0,
      costs: [],
      commitPolicy: 'completion',
      inventory: entityId(2),
      deconstruct: { duration: 2, returns: [], cancelReservations: false },
    };
    createConstructionPlan(world, entityId(44), plan);
    createConstructionPlan(world, entityId(45), plan);
    setLifecycle(world, entityId(44), 'active');
    setLifecycle(world, entityId(45), 'cancelled');
    const output = runPhases(
      world,
      registry,
      [1],
      input([
        scheduled({ type: 'DeconstructEntity', entity: entityId(44) }, 0),
        scheduled({ type: 'DeconstructEntity', entity: entityId(45) }, 1),
      ]),
    );
    expect(output.outcomes[0]?.status).toBe('applied');
    expect(output.outcomes[1]?.status).toBe('rejected');
    expect(constructionProgressOf(world, entityId(44))?.deconstructAt).toBe(3);
    if (output.outcomes[1]?.status === 'rejected') {
      expect(output.outcomes[1].errors[0]?.code).toBe('invalid_construction_state');
    }
  });
});
