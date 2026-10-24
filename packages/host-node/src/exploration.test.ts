/**
 * Integration test for exploration and establishment through the real command
 * gateway (roadmap 8.2/8.3): an establish order founds an unoccupied frontier
 * location with cargo payment, a hub, exclusive ownership, and activation.
 *
 * Source: GDD-16.1, GDD-16.3, ARCH-14.4
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createMemorySource, loadContent } from '@aesfw/content';
import type { CompiledContent, ContentRegistry } from '@aesfw/content';
import { ids } from '@aesfw/core';
import type { Cargo, Location, TransportMovement } from '@aesfw/core';
import { advance, createSession, instantiateWorldContent, submitCommand } from '@aesfw/app';
import type { SessionState } from '@aesfw/app';
import { fileSystemIo } from './cli.js';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

const content = (): CompiledContent => {
  const files = ['content.yaml', 'package.yaml'];
  const documents: Record<string, string> = {};
  for (const file of files) {
    const read = fileSystemIo().readFile(
      resolve(repoRoot, 'fixtures/content/demo-exploration', file),
    );
    if (read === null) throw new Error(`missing fixture file ${file}`);
    documents[file] = read;
  }
  const source = createMemorySource('demo.exploration', documents);
  const result = loadContent([source], { strictness: 'strict' });
  expect(result.diagnostics).toEqual([]);
  if (result.content === null) throw new Error('fixture content failed to load');
  return result.content;
};

const session = (): SessionState => {
  const compiled = content();
  const created = createSession(compiled, {
    sessionId: 'test.exploration',
    seed: [11, 3],
    tickDurationMs: 100,
    world: ids.stringId('demo.world.exploration'),
    enabledModules: [],
    hashInterval: 0,
    journal: false,
    actor: ids.ownerHandle(0),
    actorId: 'owner.a',
  });
  if (!created.ok) throw new Error('session creation failed');
  const state = created.value;
  instantiateWorldContent(
    state.world,
    compiled.registry as ContentRegistry,
    'demo.world.exploration',
  );
  return state;
};

// World locations instantiate in ascending definition-ID order, so the ids
// are discovered from the stores instead of assumed.
const world = (state: SessionState): { frontierId: number; homeId: number; unitId: number } => {
  const locationStore = state.world.stores.get<Location>('location');
  const ids0 = locationStore.ids();
  const frontierId = ids0.find((id) => locationStore.get(id)?.establishment !== undefined);
  const homeId = ids0.find((id) => id !== frontierId);
  const unitId = state.world.stores.get<Cargo>('cargo').ids()[0];
  if (frontierId === undefined || homeId === undefined || unitId === undefined) {
    throw new Error('fixture world incomplete');
  }
  return { frontierId, homeId, unitId };
};

const packageResource = ids.definitionHandle(0);

const carryPackage = (state: SessionState, unitId: number, quantity: number): void => {
  const cargo = state.world.stores.get<Cargo>('cargo').get(ids.entityId(unitId));
  if (cargo === undefined) throw new Error('unit cargo missing');
  state.world.stores.get<Cargo>('cargo').set(ids.entityId(unitId), {
    ...cargo,
    entries: [{ resource: packageResource, quantity }],
  });
};

const orderAndAssign = (
  state: SessionState,
  commandId: string,
  frontierId: number,
  unitId: number,
  orderId: number,
): void => {
  const order = submitCommand(state, {
    command_id: commandId,
    actor_id: 'owner.a',
    type: 'CreateTransportOrder',
    payload: {
      mode: 'establish',
      stations: [{ endpoint: frontierId, actions: [] }],
      repeat: false,
    },
  });
  expect(order.result.status).toBe('accepted');
  // The order entity is allocated when the create applies on the next tick.
  advance(state, 1);
  const assign = submitCommand(state, {
    command_id: `${commandId}.assign`,
    actor_id: 'owner.a',
    type: 'AssignTransport',
    payload: { unit_id: unitId, order_id: orderId },
  });
  if (assign.result.status === 'rejected') {
    expect({ cmd: commandId, errors: assign.result.errors }).toEqual({});
  }
  expect(assign.result.status).toBe('accepted');
};

describe('[GDD-16.3][ARCH-14.4] establish order through the gateway', () => {
  it('[GDD-16.3] an establish order founds the frontier location', () => {
    const state = session();
    const { frontierId, homeId, unitId } = world(state);
    // The frontier starts unowned, inactive, and unknown.
    const before = state.world.stores.get<Location>('location').get(ids.entityId(frontierId));
    expect(before?.owner ?? null).toBeNull();
    expect(before?.active).toBe(false);
    expect(state.world.owners.owners[0]?.knowledge).toEqual([
      { location: ids.entityId(homeId), level: 'established' },
    ]);

    carryPackage(state, unitId, 500);
    orderAndAssign(state, 'cmd.order.1', frontierId, unitId, 6);
    advance(state, 12);

    const after = state.world.stores.get<Location>('location').get(ids.entityId(frontierId));
    expect(after?.owner).toBe(0);
    expect(after?.active).toBe(true);
    const cargoAfter = state.world.stores.get<Cargo>('cargo').get(ids.entityId(unitId));
    expect(cargoAfter?.entries).toEqual([]);
    expect(state.world.owners.owners[0]?.knowledge).toContainEqual({
      location: ids.entityId(frontierId),
      level: 'established',
    });
    // The hub entity exists for the owner.
    const owners = state.world.stores
      .get<{ owner: number }>('owner')
      .ids()
      .map((entity) => state.world.stores.get<{ owner: number }>('owner').get(entity)?.owner);
    expect(owners).toContain(0);
    const movement = state.world.stores
      .get<TransportMovement>('movement')
      .get(ids.entityId(unitId));
    expect(movement?.location).toBe(ids.entityId(frontierId));
  });

  it('[GDD-16.3] an occupied frontier rejects a second establishment', () => {
    const state = session();
    const { frontierId, unitId } = world(state);
    const locationStore = state.world.stores.get<Location>('location');
    const frontier = locationStore.get(ids.entityId(frontierId));
    if (frontier === undefined) throw new Error('frontier missing');
    locationStore.set(ids.entityId(frontierId), { ...frontier, owner: ids.ownerHandle(0) });
    carryPackage(state, unitId, 500);
    orderAndAssign(state, 'cmd.order.1', frontierId, unitId, 6);
    advance(state, 12);
    const cargoAfter = state.world.stores.get<Cargo>('cargo').get(ids.entityId(unitId));
    expect(cargoAfter?.entries).toEqual([{ resource: packageResource, quantity: 500 }]);
  });
});
