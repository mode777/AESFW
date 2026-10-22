import { describe, expect, it } from 'vitest';
import { createWorld, instantiateWorld, readWorld, ids } from '@aesfw/core';
import type { ContentRegistry } from '@aesfw/content';
import { instantiateContentEntities } from './instantiate.js';

const registry: ContentRegistry = {
  stringIdOf: (type, handle) =>
    type === 'entity' && handle === ids.definitionHandle(9)
      ? ids.stringId('test.entity.source')
      : null,
  handleOf: () => null,
  definitionOf: () => null,
  definitionsOf: (type) =>
    type === 'entity'
      ? [
          {
            id: 'test.entity.source',
            handle: ids.definitionHandle(9),
            type: 'entity',
            data: {
              components: {
                resource_source: {
                  policy: 'infinite_rate',
                  outputs: [{ resource: 'test.resource.a', quantity_per_tick: 10 }],
                },
              },
            },
          },
        ]
      : [],
  tagsOf: () => [],
};

describe('[TDS-8.3] entity definition component', () => {
  it('[TDS-8.3] instantiated entities have a definition component', () => {
    const created = createWorld(registry, {
      seed: [0, 0],
      tickDurationMs: 100,
      world: null,
      enabledModules: [],
    });
    if (!created.ok) throw new Error('world creation failed');
    const world = created.value;
    instantiateWorld(world, {
      owner: ids.ownerHandle(0),
      locations: [
        {
          template: ids.definitionHandle(1),
          spatialPolicy: 'abstract_capacity',
          capacity: 100,
          properties: [],
          region: null,
          active: true,
          inventories: [
            {
              capacity: { total: 1000, perResource: null },
              acceptance: { accepts: [] },
              policy: 'shared_location',
            },
          ],
        },
      ],
    });
    instantiateContentEntities(world, registry);
    const entity = ids.entityId(3);
    expect(readWorld(world, registry).definition(entity)).toBe(ids.definitionHandle(9));
  });
});
