import { ids } from '@aesfw/core';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { buildRegistry } from './build.js';
import { checksum } from './normalize.js';

const resource = (id: string, transportable: boolean) => ({
  id,
  tags: ['storable'],
  quantity: { precision: 'fixed', scale: 1000 },
  storage: { policy: 'normal', scope: 'inventory' },
  transportable,
});

describe('[P-12] registry determinism', () => {
  it('[P-12] handles and checksum are independent of input order', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1, maxLength: 8 }), { maxLength: 8 }),
        (names) => {
          const resources = names.map((name, index) =>
            resource(`test.resource.${name}`, index % 2 === 0),
          );
          const forward = buildRegistry({ resources });
          const backward = buildRegistry({ resources: [...resources].reverse() });
          expect(checksum(forward.definitions)).toBe(checksum(backward.definitions));
          for (const name of names) {
            const id = ids.stringId(`test.resource.${name}`);
            expect(forward.registry.handleOf('resource', id)).toBe(
              backward.registry.handleOf('resource', id),
            );
          }
        },
      ),
    );
  });
});
