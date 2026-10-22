import { ids } from '@aesfw/core';
import { describe, expect, it } from 'vitest';

import type { RawDefinitions } from '../schemas/validate.js';
import { buildRegistry } from './build.js';
import { checksum } from './normalize.js';

const resource = (id: string, tags: readonly string[] = ['storable']) => ({
  id,
  tags,
  quantity: { precision: 'fixed', scale: 1000 },
  storage: { policy: 'normal', scope: 'inventory' },
  transportable: true,
});

const recipe = (id: string, inputs: readonly string[], capabilities: readonly string[] = []) => ({
  id,
  mode: 'batch',
  duration_ticks: 10,
  inputs: inputs.map((r) => ({ resource: r, quantity: 1000 })),
  outputs: [],
  capability_requirements: capabilities.map((r) => ({ resource: r, quantity: 1 })),
});

const producerEntity = (id: string, recipes: readonly string[]) => ({
  id,
  components: {
    producer: {
      recipes,
      process_slots: 1,
      input_inventory: 'location.shared',
      output_inventory: 'location.shared',
    },
  },
});

const codes = (diagnostics: readonly { readonly code: string }[]) =>
  diagnostics.map((diagnostic) => diagnostic.code);

describe('[TDS-7] handle assignment', () => {
  it('[TDS-7] handles are dense and ascending by ID', () => {
    const { registry } = buildRegistry({
      resources: [resource('test.resource.b'), resource('test.resource.a')],
    });
    expect(registry.handleOf('resource', ids.stringId('test.resource.a'))).toBe(0);
    expect(registry.handleOf('resource', ids.stringId('test.resource.b'))).toBe(1);
  });

  it('[TDS-7] unknown lookups return null', () => {
    const { registry } = buildRegistry({ resources: [resource('test.resource.a')] });
    expect(registry.stringIdOf('resource', ids.definitionHandle(99))).toBeNull();
    expect(registry.handleOf('resource', ids.stringId('test.resource.absent'))).toBeNull();
  });

  it('[TDS-7] handles are independent of input order', () => {
    const forward = buildRegistry({
      resources: [resource('test.resource.a'), resource('test.resource.b')],
    }).registry;
    const backward = buildRegistry({
      resources: [resource('test.resource.b'), resource('test.resource.a')],
    }).registry;
    expect(forward.handleOf('resource', ids.stringId('test.resource.b'))).toBe(
      backward.handleOf('resource', ids.stringId('test.resource.b')),
    );
  });
});

describe('[CONT-11.3] reference resolution', () => {
  it('[CONT-11.3] a resolvable reference is accepted', () => {
    const { diagnostics } = buildRegistry({
      resources: [resource('test.resource.a')],
      recipes: [recipe('test.recipe.a', ['test.resource.a'])],
    });
    expect(diagnostics).toEqual([]);
  });

  it('[CONT-11.3] an absent reference is reported', () => {
    const { diagnostics } = buildRegistry({
      recipes: [recipe('test.recipe.a', ['test.resource.absent'])],
    });
    expect(codes(diagnostics)).toEqual(['unresolved_reference']);
    expect(diagnostics[0]?.args['reference']).toBe('test.resource.absent');
  });

  it('[CONT-11.3] a wrong-type reference is reported', () => {
    const { diagnostics } = buildRegistry({
      resources: [resource('test.resource.a')],
      entity_definitions: [producerEntity('test.entity.producer', ['test.resource.a'])],
    });
    expect(codes(diagnostics)).toEqual(['reference_type_mismatch']);
  });

  it('[CONT-11.3] a capability requirement must be a capability', () => {
    const { diagnostics } = buildRegistry({
      resources: [resource('test.resource.a'), resource('test.capability.tier_1', ['capability'])],
      recipes: [recipe('test.recipe.a', ['test.resource.a'], ['test.resource.a'])],
    });
    expect(codes(diagnostics)).toEqual(['invalid_reference_scope']);
  });

  it('[CONT-6.3] allow_negative on an inventory-scoped resource is rejected', () => {
    const { diagnostics } = buildRegistry({
      resources: [{ ...resource('test.resource.credits'), allow_negative: true }],
    });
    expect(codes(diagnostics)).toEqual(['resource_allow_negative_scope']);
    expect(diagnostics[0]?.path).toBe('/resources/test.resource.credits/allow_negative');
  });

  it('[CONT-6.3] allow_negative on an owner-scoped resource is accepted', () => {
    const { diagnostics } = buildRegistry({
      resources: [
        {
          ...resource('test.resource.credits'),
          storage: { policy: 'normal', scope: 'owner' },
          allow_negative: true,
        },
      ],
    });
    expect(diagnostics).toEqual([]);
  });

  it('[CONT-6.10] an unresolvable satisfaction_curve is reported', () => {
    const { diagnostics } = buildRegistry({
      resources: [resource('test.resource.credits')],
      population_tiers: [
        {
          id: 'test.tier.a',
          consumption_factor: 1000,
          outputs: [
            {
              resource: 'test.resource.credits',
              scope: 'owner',
              rate_per_population_per_tick: 10,
              satisfaction_curve: 'test.curve.absent',
            },
          ],
        },
      ],
    });
    expect(codes(diagnostics)).toContain('unresolved_reference');
  });

  it('[CONT-6.10] a resolvable satisfaction_curve is accepted', () => {
    const { diagnostics } = buildRegistry({
      resources: [resource('test.resource.credits')],
      curves: [
        {
          id: 'test.curve.income',
          type: 'piecewise_linear',
          points: [
            [0, 0],
            [1000, 1000],
          ],
          extrapolation: 'clamp',
        },
      ],
      population_tiers: [
        {
          id: 'test.tier.a',
          consumption_factor: 1000,
          outputs: [
            {
              resource: 'test.resource.credits',
              scope: 'owner',
              rate_per_population_per_tick: 10,
              satisfaction_curve: 'test.curve.income',
            },
          ],
        },
      ],
    });
    expect(diagnostics).toEqual([]);
  });

  it('[CONT-11.3] a construction cost resource must resolve', () => {
    const { diagnostics } = buildRegistry({
      entity_definitions: [
        {
          id: 'test.entity.builder',
          components: {
            construction: {
              duration_ticks: 10,
              costs: [{ resource: 'test.resource.absent', quantity: 5000 }],
              commit_policy: 'completion',
            },
          },
        },
      ],
    });
    expect(codes(diagnostics)).toEqual(['unresolved_reference']);
    expect(diagnostics[0]?.args['reference']).toBe('test.resource.absent');
  });

  it('[CONT-11.3] a placement condition must resolve', () => {
    const { diagnostics } = buildRegistry({
      entity_definitions: [
        {
          id: 'test.entity.builder',
          components: { placement: { conditions: ['test.condition.absent'] } },
        },
      ],
    });
    expect(codes(diagnostics)).toEqual(['unresolved_reference']);
    expect(diagnostics[0]?.args['reference']).toBe('test.condition.absent');
  });

  it('[CONT-11.3] a placement condition naming a resource is reported', () => {
    const { diagnostics } = buildRegistry({
      resources: [resource('test.resource.build')],
      entity_definitions: [
        {
          id: 'test.entity.builder',
          components: { placement: { conditions: ['test.resource.build'] } },
        },
      ],
    });
    expect(codes(diagnostics)).toEqual(['reference_type_mismatch']);
  });

  it('[CONT-11.3] a resolvable placement condition is accepted', () => {
    const { diagnostics } = buildRegistry({
      conditions: [{ id: 'test.condition.place_ok', expression: true }],
      entity_definitions: [
        {
          id: 'test.entity.builder',
          components: { placement: { conditions: ['test.condition.place_ok'] } },
        },
      ],
    });
    expect(diagnostics).toEqual([]);
  });
});

describe('[TDS-20.2] indexes', () => {
  it('[TDS-20.2] the ID index finds a compiled definition', () => {
    const { registry } = buildRegistry({ resources: [resource('test.resource.a')] });
    const handle = registry.handleOf('resource', ids.stringId('test.resource.a'));
    const compiled = handle === null ? null : registry.definitionOf('resource', handle);
    expect(compiled?.id).toBe('test.resource.a');
    expect(compiled?.handle).toBe(0);
  });

  it('[TDS-20.2] the tag index groups resources by tag', () => {
    const { registry } = buildRegistry({
      resources: [
        resource('test.resource.a', ['storable']),
        resource('test.resource.b', ['storable']),
        resource('test.capability.tier_1', ['capability']),
      ],
    });
    expect(registry.tagsOf(ids.stringId('test.resource.a'))).toEqual(['storable']);
    const capability = registry.handleOf('resource', ids.stringId('test.capability.tier_1'));
    expect(capability).not.toBeNull();
  });
});

describe('[TDS-19.3] normalization and checksum', () => {
  const definitions: RawDefinitions = {
    resources: [resource('test.resource.a'), resource('test.resource.b')],
  };

  it('[TDS-19.3] the checksum is independent of file order', () => {
    const forward = buildRegistry(definitions).definitions;
    const backward = buildRegistry({
      resources: [resource('test.resource.b'), resource('test.resource.a')],
    }).definitions;
    expect(checksum(forward)).toBe(checksum(backward));
  });

  it('[TDS-19.3] the checksum changes with definition data', () => {
    const before = buildRegistry(definitions).definitions;
    const changed = buildRegistry({
      resources: [
        resource('test.resource.a'),
        { ...resource('test.resource.b'), transportable: false },
      ],
    }).definitions;
    expect(checksum(before)).not.toBe(checksum(changed));
  });
});

describe('[TDS-7] frozen registry', () => {
  it('[TDS-7] the registry is frozen', () => {
    const { registry } = buildRegistry({ resources: [resource('test.resource.a')] });
    const compiled = registry.definitionsOf('resource')[0];
    expect(compiled).toBeDefined();
    expect(Object.isFrozen(compiled?.data)).toBe(true);
    expect(() => {
      (compiled?.data as { mutated?: boolean }).mutated = true;
    }).toThrow();
  });

  it('[TDS-10.1] definitionDataOf returns the raw definition data', () => {
    const definition = resource('test.resource.a');
    const { registry } = buildRegistry({ resources: [definition] });
    const handle = registry.handleOf('resource', ids.stringId('test.resource.a'));
    expect(handle).not.toBeNull();
    if (handle !== null) {
      expect(registry.definitionDataOf?.('resource', handle)).toEqual(definition);
    }
    expect(registry.definitionDataOf?.('resource', ids.definitionHandle(99))).toBeNull();
  });
});
