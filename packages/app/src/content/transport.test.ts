import { describe, expect, it } from 'vitest';
import { createWorld, ids } from '@aesfw/core';
import type { Cargo, Maintenance, TransportHandling, TransportMovement } from '@aesfw/core';
import { createMemorySource, loadContent } from '@aesfw/content';
import type { ContentRegistry } from '@aesfw/content';
import { instantiateWorldContent } from './instantiate.js';

const manifest = [
  'package:',
  '  id: test.transport',
  '  version: 1.0.0',
  '  schema_version: 1',
  '  type: simulation_content',
  '  files:',
  '    - content.yaml',
  '',
].join('\n');

const document = {
  resources: [
    {
      id: 'test.resource.a',
      tags: ['storable'],
      quantity: { precision: 'fixed', scale: 1000 },
      storage: { policy: 'normal', scope: 'inventory' },
      transportable: true,
    },
    {
      id: 'test.resource.credits',
      tags: ['balance'],
      quantity: { precision: 'fixed', scale: 1000 },
      storage: { policy: 'normal', scope: 'owner' },
      transportable: false,
      allow_negative: true,
    },
  ],
  location_templates: [
    {
      id: 'test.location.a',
      spatial_policy: 'framework.spatial.abstract_capacity',
      spatial_parameters: { total_capacity: 100 },
      inventories: [
        {
          id: 'shared',
          capacity: { mode: 'total', quantity: 1000 },
          access_policy: 'framework.inventory.shared_location',
        },
      ],
      activation: { initial: true },
    },
  ],
  entity_definitions: [{ id: 'test.entity.transport', components: {} }],
  transport_units: [
    {
      id: 'test.transport.basic',
      entity_definition: 'test.entity.transport',
      cargo: {
        compartment_policy: 'typed_slots',
        slots: 2,
        slot_capacity: 500,
        acceptance: 'transportable_resources',
      },
      movement: { speed_permille: 500, allowed_connection_tags: ['test.transport.standard'] },
      handling: { loading_rate_per_tick: 10, unloading_rate_per_tick: 20 },
      order_modes: ['route'],
      maintenance: {
        interval_ticks: 10,
        inputs: [{ resource: 'test.resource.credits', quantity: 100 }],
        charge_policy: 'while_enabled',
        shortage_policy: 'owner_deficit_policy',
      },
    },
  ],
  worlds: [
    {
      id: 'test.world',
      locations: [{ id: 'test.loc.a', template: 'test.location.a' }],
      owners: [
        {
          id: 'owner.a',
          established_locations: ['test.loc.a'],
          initial_entities: [{ definition: 'test.entity.transport', location: 'test.loc.a' }],
        },
      ],
    },
  ],
};

const build = (): ContentRegistry => {
  const source = createMemorySource('test.transport', {
    'package.yaml': manifest,
    'content.yaml': JSON.stringify(document),
  });
  const loaded = loadContent([source], { strictness: 'strict' });
  if (loaded.content === null) {
    throw new Error(`content failed: ${loaded.diagnostics.map((entry) => entry.code).join(',')}`);
  }
  return loaded.content.registry as ContentRegistry;
};

const instantiate = () => {
  const registry = build();
  const created = createWorld(registry, {
    seed: [1, 2],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
  });
  if (!created.ok) throw new Error('world creation failed');
  instantiateWorldContent(created.value, registry, 'test.world');
  return created.value;
};

describe('[GDD-15.4][CONT-6.16] transport unit instantiation', () => {
  it('[GDD-15.4] a world initial transport unit gets cargo, movement, and handling', () => {
    const world = instantiate();
    const cargoId = world.stores.get<Cargo>('cargo').ids()[0];
    expect(cargoId).toBeDefined();
    if (cargoId === undefined) return;
    const cargo = world.stores.get<Cargo>('cargo').get(cargoId);
    expect(cargo?.policy).toBe('typed_slots');
    expect(cargo?.slots).toHaveLength(2);
    expect(cargo?.slotCapacity).toBe(500);
    expect(cargo?.accepts).toContain(ids.definitionHandle(0));
    expect(world.stores.get<TransportMovement>('movement').get(cargoId)?.speedPermille).toBe(500);
    expect(world.stores.get<TransportHandling>('handling').get(cargoId)).toEqual({
      loadingRatePerTick: 10,
      unloadingRatePerTick: 20,
    });
  });

  it('[GDD-15.4] a transport unit carries its maintenance configuration', () => {
    const world = instantiate();
    const cargoId = world.stores.get<Cargo>('cargo').ids()[0];
    if (cargoId === undefined) return;
    const maintenance = world.stores.get<Maintenance>('maintenance').get(cargoId);
    expect(maintenance?.intervalTicks).toBe(10);
    expect(maintenance?.inputs[0]?.quantity).toBe(100);
  });
});
