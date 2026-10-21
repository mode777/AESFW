import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, reservationId, stringId, tick } from '../ids/index.js';
import { createEmptyRegistry } from '../registry/types.js';
import type { Registry } from '../registry/types.js';
import { cloneWorld, decodeWorld, encodeWorld, hashWorld } from './codec.js';
import { createWorld } from './create.js';
import type { World, WorldSetup } from './types.js';

const resourceHandle = definitionHandle(0);

const registry: Registry = {
  stringIdOf(type, handle) {
    if (type === 'resource' && handle === resourceHandle) return stringId('test.r.a');
    return null;
  },
  handleOf(type, id) {
    if (type === 'resource' && id === 'test.r.a') return resourceHandle;
    return null;
  },
};

const setup: WorldSetup = {
  seed: [1, 2],
  tickDurationMs: 1000,
  world: null,
  enabledModules: [],
};

const makeWorld = (): World => {
  const result = createWorld(createEmptyRegistry(), setup);
  if (!result.ok) throw new Error('createWorld returned an error');
  return result.value;
};

describe('[TDS-8.5][TDS-19.4] world codec', () => {
  it('[TDS-8.5][INV-18] an empty world round-trips through encode and decode', () => {
    const world = makeWorld();
    const state = encodeWorld(world, registry);
    const decoded = decodeWorld(registry, state);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.value.caches.dirty).toBe(true);
    expect(encodeWorld(decoded.value, registry)).toEqual(state);
  });

  it('[TDS-8.5][INV-18] store entries round-trip with ascending entity order', () => {
    const world = makeWorld();
    const store = world.stores.get('producer');
    store.set(entityId(2), { state: 'busy' });
    store.set(entityId(1), { state: 'idle' });

    const state = encodeWorld(world, registry);
    expect(state['stores']).toMatchObject({
      producer: [
        [1, { state: 'idle' }],
        [2, { state: 'busy' }],
      ],
    });

    const decoded = decodeWorld(registry, state);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    const decodedStore = decoded.value.stores.get('producer');
    expect(decodedStore.get(entityId(1))).toEqual({ state: 'idle' });
    expect(decodedStore.get(entityId(2))).toEqual({ state: 'busy' });
  });

  it('[TDS-8.5] definition handles are encoded as string IDs', () => {
    const world = makeWorld();
    world.ledger = {
      reservations: [
        {
          id: reservationId(1),
          inventory: entityId(1),
          resource: resourceHandle,
          quantity: 5,
          purpose: 'production_input',
          holder: entityId(2),
          expiryTick: null,
        },
      ],
    };

    const state = encodeWorld(world, registry);
    const ledger = state['ledger'] as readonly { resource: string }[];
    expect(ledger[0]?.resource).toBe('test.r.a');

    const decoded = decodeWorld(registry, state);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.value.ledger.reservations[0]?.resource).toBe(resourceHandle);
  });

  it('[TDS-8.4] derived caches are excluded from the encoding', () => {
    const state = encodeWorld(makeWorld(), registry);
    expect('caches' in state).toBe(false);
  });

  it('[TDS-8.5] malformed state decodes to an error', () => {
    const result = decodeWorld(registry, { format_version: 1 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error[0]?.code).toBe('invalid_canonical_state');
  });

  it('[TDS-8.5] clone is independent of the original', () => {
    const world = makeWorld();
    world.stores.get('producer').set(entityId(1), { state: 'idle' });
    const clone = cloneWorld(world);
    clone.stores.get('producer').set(entityId(1), { state: 'busy' });
    expect(world.stores.get('producer').get(entityId(1))).toEqual({ state: 'idle' });
    expect(clone.caches.dirty).toBe(true);
  });

  it('[TDS-19.4] clone and original hash identically', () => {
    const world = makeWorld();
    world.stores.get('producer').set(entityId(1), { state: 'idle' });
    expect(hashWorld(cloneWorld(world), registry)).toBe(hashWorld(world, registry));
  });

  it('[TDS-19.4] hash changes with authoritative state', () => {
    const world = makeWorld();
    const before = hashWorld(world, registry);
    world.tick = tick(1);
    expect(hashWorld(world, registry)).not.toBe(before);
  });
});
