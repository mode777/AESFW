import { describe, expect, it } from 'vitest';

import { definitionHandle, stringId } from '../ids/index.js';
import type { Registry } from '../registry/types.js';
import { resourceAllowsNegative, txEnvironmentFor } from './environment.js';

const BALANCE_ID = stringId('test.resource.credits');
const PLAIN_ID = stringId('test.resource.goods');
const balanceHandle = definitionHandle(1);
const plainHandle = definitionHandle(2);

const registry: Registry = {
  stringIdOf: (type, handle) => {
    if (type !== 'resource') return null;
    if (handle === balanceHandle) return BALANCE_ID;
    if (handle === plainHandle) return PLAIN_ID;
    return null;
  },
  handleOf: (type, id) => {
    if (type !== 'resource') return null;
    if (id === BALANCE_ID) return balanceHandle;
    if (id === PLAIN_ID) return plainHandle;
    return null;
  },
  definitionDataOf: (type, handle) => {
    if (type !== 'resource') return null;
    if (handle === balanceHandle) return { id: 'test.resource.credits', allow_negative: true };
    if (handle === plainHandle) return { id: 'test.resource.goods' };
    return null;
  },
};

describe('[GDD-7.5][TDS-12.2] content-derived transaction environment', () => {
  it('[GDD-7.5] a resource with allow_negative permits a negative balance', () => {
    expect(resourceAllowsNegative(registry, balanceHandle)).toBe(true);
  });

  it('[GDD-7.5] a resource without allow_negative never permits a negative balance', () => {
    expect(resourceAllowsNegative(registry, plainHandle)).toBe(false);
  });

  it('[GDD-7.5] an unknown resource never permits a negative balance', () => {
    expect(resourceAllowsNegative(registry, definitionHandle(99))).toBe(false);
  });

  it('[GDD-7.5] a registry without definition data never permits a negative balance', () => {
    const bare: Registry = {
      stringIdOf: () => null,
      handleOf: () => null,
    };
    expect(resourceAllowsNegative(bare, balanceHandle)).toBe(false);
  });

  it('[TDS-12.2] the environment exposes the predicate for the writer', () => {
    const environment = txEnvironmentFor(registry);
    expect(environment.allowNegative?.(balanceHandle)).toBe(true);
    expect(environment.allowNegative?.(plainHandle)).toBe(false);
  });
});
