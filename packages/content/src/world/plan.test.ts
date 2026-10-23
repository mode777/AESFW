import { ids } from '@aesfw/core';
import { describe, expect, it } from 'vitest';

import { buildRegistry } from '../registry/build.js';
import type { RawDefinition } from '../schemas/validate.js';
import { defaultWorldPlan, worldPlan } from './plan.js';

const template = (id: string, overrides: Record<string, unknown> = {}): RawDefinition => ({
  id,
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
  ...overrides,
});

const registryFor = (templates: readonly RawDefinition[]) =>
  buildRegistry({ location_templates: templates }).registry;

const codes = (diagnostics: readonly { readonly code: string }[]) =>
  diagnostics.map((diagnostic) => diagnostic.code);

describe('[CONT-6.4][CONT-6.6] default world plan', () => {
  it('[CONT-6.6] an initially active template becomes a location plan', () => {
    const result = defaultWorldPlan(registryFor([template('test.location.a')]));
    expect(result.diagnostics).toEqual([]);
    expect(result.plan.owner).toBe(0);
    expect(result.plan.locations).toHaveLength(1);
    const location = result.plan.locations[0];
    expect(location?.spatialPolicy).toBe('framework.spatial.abstract_capacity');
    expect(location?.capacity).toBe(100);
    expect(location?.inventories).toHaveLength(1);
  });

  it('[CONT-6.6] an initially inactive template is omitted', () => {
    const result = defaultWorldPlan(
      registryFor([template('test.location.a', { activation: { initial: false } })]),
    );
    expect(result.plan.locations).toHaveLength(0);
  });

  it('[CONT-6.4] capacity modes map to caps', () => {
    const result = defaultWorldPlan(
      registryFor([
        template('test.location.a', {
          inventories: [
            {
              id: 'total',
              capacity: { mode: 'total', quantity: 1000 },
              access_policy: 'framework.inventory.shared_location',
            },
            {
              id: 'per_resource',
              capacity: { mode: 'per_resource', quantity: 500 },
              access_policy: 'framework.inventory.shared_location',
            },
          ],
        }),
      ]),
    );
    const inventories = result.plan.locations[0]?.inventories ?? [];
    expect(inventories[0]?.capacity).toEqual({ total: 1000, perResource: null });
    expect(inventories[1]?.capacity).toEqual({ total: null, perResource: 500 });
  });

  it('[CONT-6.4] properties are ordered by ascending name', () => {
    const result = defaultWorldPlan(
      registryFor([
        template('test.location.a', {
          properties: { 'test.property.b': 2, 'test.property.a': 1 },
        }),
      ]),
    );
    expect(result.plan.locations[0]?.properties).toEqual([
      { property: ids.stringId('test.property.a'), value: 1 },
      { property: ids.stringId('test.property.b'), value: 2 },
    ]);
  });

  it('[CONT-6.4] source slots are ordered by ascending type', () => {
    const result = defaultWorldPlan(
      registryFor([
        template('test.location.a', {
          source_slots: [
            { type: 'test.slot.b', count: 0 },
            { type: 'test.slot.a', count: 2 },
          ],
        }),
      ]),
    );
    expect(result.plan.locations[0]?.sourceSlots).toEqual([
      { type: ids.stringId('test.slot.a'), count: 2 },
      { type: ids.stringId('test.slot.b'), count: 0 },
    ]);
  });

  it('[CONT-6.4] a template without source slots maps to none', () => {
    const result = defaultWorldPlan(registryFor([template('test.location.a')]));
    expect(result.plan.locations[0]?.sourceSlots).toEqual([]);
  });

  it('[CONT-6.4] a missing total capacity is reported', () => {
    const result = defaultWorldPlan(
      registryFor([template('test.location.a', { spatial_parameters: {} })]),
    );
    expect(codes(result.diagnostics)).toContain('unsupported_spatial_parameter');
  });

  const gridTemplate = (overrides: Record<string, unknown> = {}): RawDefinition => ({
    id: 'test.location.grid',
    spatial_policy: 'framework.spatial.grid',
    spatial_parameters: { width: 4, height: 4, buildable_ratio: { min: 400, max: 700 } },
    activation: { initial: true },
    ...overrides,
  });

  it('[CONT-6.4] grid spatial parameters map to a grid plan', () => {
    const result = defaultWorldPlan(registryFor([gridTemplate()]));
    expect(result.diagnostics).toEqual([]);
    expect(result.plan.locations[0]?.grid).toEqual({
      width: 4,
      height: 4,
      blocked: null,
      buildableRatio: { min: 400, max: 700 },
    });
  });

  it('[CONT-6.4] a fixed blocked-cell list maps to a fixed mask', () => {
    const result = defaultWorldPlan(
      registryFor([
        gridTemplate({ spatial_parameters: { width: 4, height: 4, blocked_cells: [0, 1, 4] } }),
      ]),
    );
    expect(result.plan.locations[0]?.grid).toEqual({
      width: 4,
      height: 4,
      blocked: [0, 1, 4],
      buildableRatio: null,
    });
  });

  it('[CONT-6.4] a grid template without dimensions is reported', () => {
    const result = defaultWorldPlan(
      registryFor([gridTemplate({ spatial_parameters: { buildable_ratio: { min: 1, max: 2 } } })]),
    );
    expect(codes(result.diagnostics)).toContain('unsupported_spatial_parameter');
  });
});

describe('[CONT-6.6] world definition plan', () => {
  const templateA = template('test.location.a');
  const templateB = template('test.location.b', {
    properties: { 'test.property.p': 500 },
  });
  const connection = {
    id: 'test.connection.standard',
    direction: 'bidirectional',
    traversal: { base_duration_ticks: 100 },
    allowed_transport_tags: ['test.transport.standard'],
  };
  const world = {
    id: 'test.world.prototype',
    locations: [
      { id: 'test.loc.b', template: 'test.location.b', properties: { 'test.property.p': 750 } },
      { id: 'test.loc.a', template: 'test.location.a' },
    ],
    connections: [
      {
        id: 'test.conn.a_b',
        definition: 'test.connection.standard',
        origin: 'test.loc.a',
        destination: 'test.loc.b',
        base_duration_ticks: 300,
      },
    ],
    owners: [
      {
        id: 'owner.a',
        initial_resources: [{ resource: 'test.resource.credits', quantity: 1000 }],
        established_locations: ['test.loc.a'],
        known_locations: ['test.loc.b'],
        initial_entities: [{ definition: 'test.entity.transport', location: 'test.loc.a' }],
      },
      { id: 'owner.b', established_locations: ['test.loc.b'] },
    ],
  };
  const registry = () =>
    buildRegistry({
      location_templates: [templateA, templateB],
      resources: [
        {
          id: 'test.resource.credits',
          quantity: { precision: 'fixed', scale: 1000 },
          storage: { policy: 'normal', scope: 'owner' },
          transportable: false,
        },
      ],
      entity_definitions: [{ id: 'test.entity.transport', components: {} }],
      connections: [connection],
      worlds: [world],
    }).registry;

  it('[CONT-6.6] a world plan lists locations in ascending id order', () => {
    const result = worldPlan(registry(), null);
    expect(result.diagnostics).toEqual([]);
    expect(result.plan.locations).toHaveLength(2);
    expect(result.plan.locations[0]?.owner).toBe(ids.ownerHandle(0));
    expect(result.plan.locations[1]?.owner).toBe(ids.ownerHandle(1));
    expect(result.plan.locations[0]?.properties).toEqual([]);
    expect(result.plan.locations[1]?.properties).toEqual([
      { property: ids.stringId('test.property.p'), value: 750 },
    ]);
  });

  it('[CONT-6.6] owners, resources, knowledge, and connection instances are planned', () => {
    const result = worldPlan(registry(), 'test.world.prototype');
    expect(result.plan.owners).toHaveLength(2);
    expect(result.plan.owners?.[0]?.accounts).toEqual([
      { resource: ids.definitionHandle(0), amount: 1000 },
    ]);
    expect(result.plan.owners?.[0]?.knowledge).toEqual([
      { locationIndex: 0, level: 'established' },
      { locationIndex: 1, level: 'discovered' },
    ]);
    expect(result.plan.initialEntities).toEqual([
      { definition: ids.definitionHandle(0), locationIndex: 0, owner: ids.ownerHandle(0) },
    ]);
    expect(result.plan.connections).toEqual([
      {
        id: ids.stringId('test.conn.a_b'),
        definition: ids.definitionHandle(0),
        originIndex: 0,
        destinationIndex: 1,
        direction: 'bidirectional',
        baseDurationTicks: 300,
        enabled: true,
        allowedTransportTags: [ids.stringId('test.transport.standard')],
      },
    ]);
  });

  it('[CONT-6.6] an unknown world id is reported', () => {
    const result = worldPlan(registry(), 'test.world.missing');
    expect(codes(result.diagnostics)).toContain('unknown_world');
    expect(result.plan.locations).toEqual([]);
  });
});
