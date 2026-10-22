import { cloneWorld, ids } from '@aesfw/core';
import type {
  Inventory,
  Location,
  LocationHub,
  Registry,
  ResourceSource,
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
      id: 'test.resource.a',
      quantity: { precision: 'fixed', scale: 1000 },
      storage: { policy: 'normal', scope: 'inventory' },
      transportable: true,
    })
    .build(),
).registry;

const resourceA = registry.handleOf('resource', ids.stringId('test.resource.a'));
if (resourceA === null) throw new Error('missing resource definition');

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
    .store<Location>('location', ids.entityId(1), {
      template: ids.definitionHandle(0),
      spatialPolicy: 'framework.spatial.abstract_capacity',
      capacity: 100,
      used: 0,
      properties: [{ property: ids.stringId('test.property.suitability'), value: 500 }],
      region: null,
      active: true,
      owner: ids.ownerHandle(0),
      sourceSlots: [{ type: ids.stringId('test.slot.a'), count: 1 }],
    })
    .store<LocationHub>('locationHub', ids.entityId(1), { inventories: [ids.entityId(2)] })
    .store<Inventory>('inventory', ids.entityId(2), {
      owner: ids.ownerHandle(0),
      policy: 'framework.inventory.shared_location',
      revision: 0,
      entries: [],
      capacity: { total: null, perResource: null },
      acceptance: { accepts: [] },
    })
    .store<ResourceSource>('resourceSource', ids.entityId(3), {
      policy: 'slot_dependent',
      location: ids.entityId(1),
      inventory: ids.entityId(2),
      slotType: ids.stringId('test.slot.a'),
      outputs: [{ resource: resourceA, rate: 1000, remaining: null }],
    })
    .store<ResourceSource>('resourceSource', ids.entityId(4), {
      policy: 'area_dependent',
      location: ids.entityId(1),
      inventory: ids.entityId(2),
      scaleByProperty: ids.stringId('test.property.suitability'),
      workingAreaCells: 12,
      outputs: [{ resource: resourceA, rate: 66, remaining: null }],
    })
    .store<ResourceSource>('resourceSource', ids.entityId(5), {
      policy: 'regenerating_deposit',
      location: ids.entityId(1),
      inventory: ids.entityId(2),
      outputs: [
        { resource: resourceA, rate: 100, remaining: 300, regeneration: 200, maximum: 500 },
      ],
    })
    .build();

const input: TickInput = { commands: [], options: { journal: true, hash: false } };

describe('[INV-22][GDD-9.5] source invariants', () => {
  it('[INV-22] invariants hold across a source tick', () => {
    const w = build();
    const before = cloneWorld(w);
    const output = runPhases(w, registry, [7, 12, 13], input);
    expectInvariants(before, output, registry);
  });

  it('[GDD-9.5] invariants hold across repeated source ticks', () => {
    const w = build();
    let before = cloneWorld(w);
    let output = runPhases(w, registry, [7, 12, 13], input);
    expectInvariants(before, output, registry);
    for (let tick = 0; tick < 3; tick += 1) {
      before = cloneWorld(w);
      output = runPhases(w, registry, [7, 12, 13], input);
      expectInvariants(before, output, registry);
    }
  });
});
