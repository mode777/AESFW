import { describe, expect, it } from 'vitest';
import { definitionHandle, ownerHandle } from '../ids/index.js';
import { accepts, quantityOf } from './inventory.js';
import type { Inventory } from './inventory.js';

const makeInventory = (overrides: Partial<Inventory> = {}): Inventory => ({
  owner: ownerHandle(0),
  policy: 'framework.inventory.shared_location',
  revision: 0,
  entries: [
    { resource: definitionHandle(0), quantity: 2000 },
    { resource: definitionHandle(1), quantity: 500 },
  ],
  capacity: { total: null, perResource: null },
  acceptance: { accepts: [] },
  ...overrides,
});

describe('[GDD-8.1] inventory state', () => {
  it('[GDD-8.1] entries are read by resource handle', () => {
    const inventory = makeInventory();
    expect(quantityOf(inventory, definitionHandle(0))).toBe(2000);
    expect(quantityOf(inventory, definitionHandle(1))).toBe(500);
    expect(quantityOf(inventory, definitionHandle(2))).toBe(0);
  });

  it('[GDD-8.2] an empty acceptance list accepts every resource', () => {
    const inventory = makeInventory();
    expect(accepts(inventory, definitionHandle(9))).toBe(true);
  });

  it('[GDD-8.2] a non-empty acceptance list rejects unlisted resources', () => {
    const inventory = makeInventory({ acceptance: { accepts: [definitionHandle(0)] } });
    expect(accepts(inventory, definitionHandle(0))).toBe(true);
    expect(accepts(inventory, definitionHandle(1))).toBe(false);
  });
});
