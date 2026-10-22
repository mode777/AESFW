import { cloneWorld, ids, requestCancellation } from '@aesfw/core';
import type {
  Inventory,
  Location,
  LocationHub,
  Registry,
  ScheduledCommand,
  TickInput,
} from '@aesfw/core';
import { runPhases } from '@aesfw/core/testing';
import { describe, it } from 'vitest';
import { content, expectContentOk } from './content-builder.js';
import { expectInvariants } from './invariants.js';
import { world } from './world-builder.js';

const registry: Registry = expectContentOk(
  content()
    .define('resources', {
      id: 'test.resource.build',
      quantity: { precision: 'fixed', scale: 1000 },
      storage: { policy: 'normal', scope: 'inventory' },
      transportable: true,
    })
    .define('entity_definitions', {
      id: 'test.entity.builder',
      components: {
        placement: { footprint: [1, 1] },
        construction: {
          duration_ticks: 1,
          costs: [{ resource: 'test.resource.build', quantity: 1000 }],
          commit_policy: 'completion',
        },
      },
    })
    .build(),
).registry;

const build = () =>
  world(registry)
    .owner({
      handle: ids.ownerHandle(0),
      knowledge: [],
      accounts: [],
      purposeLocks: [],
      unlocks: [],
      deficitPaused: [],
    })
    .store<Inventory>('inventory', ids.entityId(2), {
      owner: ids.ownerHandle(0),
      policy: 'framework.inventory.shared_location',
      revision: 0,
      entries: [],
      capacity: { total: null, perResource: null },
      acceptance: { accepts: [] },
    })
    .store<Location>('location', ids.entityId(1), {
      template: ids.definitionHandle(0),
      spatialPolicy: 'framework.spatial.grid',
      capacity: 16,
      used: 0,
      properties: [],
      region: null,
      active: true,
      owner: ids.ownerHandle(0),
      grid: { width: 4, height: 4, blocked: [] },
    })
    .store<LocationHub>('locationHub', ids.entityId(1), { inventories: [ids.entityId(2)] })
    .build();

const input = (commands: readonly ScheduledCommand[]): TickInput => ({
  commands,
  options: { journal: true, hash: false },
});

const definition = registry.handleOf('entity', ids.stringId('test.entity.builder'));
if (definition === null) throw new Error('missing entity definition');

const place = (): ScheduledCommand => ({
  commandId: 'c1',
  actor: ids.ownerHandle(0),
  tick: ids.tick(1),
  seq: 0,
  command: {
    type: 'PlaceEntityPlan',
    definition,
    location: ids.entityId(1),
    transform: { location: ids.entityId(1), position: { x: 1, y: 1 }, orientation: 0 },
  },
});

describe('[INV-18][INV-24] placement invariants', () => {
  it('[INV-24] invariants hold across a placement tick', () => {
    const w = build();
    const before = cloneWorld(w);
    const output = runPhases(w, registry, [1], input([place()]));
    expectInvariants(before, output, registry);
  });

  it('[INV-24] invariants hold when a placed entity is cancelled and removed', () => {
    const w = build();
    runPhases(w, registry, [1], input([place()]));
    const placed = w.stores.get('lifecycle').ids()[0];
    if (placed === undefined) throw new Error('no placed entity');
    requestCancellation(w, placed);
    const before = cloneWorld(w);
    const output = runPhases(w, registry, [30], input([]));
    expectInvariants(before, output, registry);
  });
});
