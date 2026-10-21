import { cloneWorld, createEmptyRegistry, ids, step, world as core } from '@aesfw/core';
import type { Registry, TickInput, TickOutput } from '@aesfw/core';
import { describe, expect, it } from 'vitest';
import { checkInvariants, expectInvariants } from './invariants.js';
import { world } from './world-builder.js';

const registry: Registry = createEmptyRegistry();
const input: TickInput = { commands: [], options: { journal: false, hash: false } };

const stepSnapshot = (): { before: core.World; output: TickOutput } => {
  const working = world().store('producer', ids.entityId(1), { state: 'idle' }).build();
  const before = cloneWorld(working);
  const output = step(working, registry, input);
  return { before, output };
};

describe('[VER-6] invariant checker', () => {
  it('[VER-6] a valid empty world has no findings', () => {
    const { before, output } = stepSnapshot();
    expect(checkInvariants(before, output, registry)).toEqual([]);
    expect(() => expectInvariants(before, output, registry)).not.toThrow();
  });

  it('[INV-10] an entity ID at or beyond nextEntityId is reported', () => {
    const working = world().build();
    working.stores.get('producer').set(ids.entityId(9), { state: 'idle' });
    const before = cloneWorld(working);
    const output = step(working, registry, input);
    const idsReported = checkInvariants(before, output, registry).map((finding) => finding.id);
    expect(idsReported).toContain('INV-10');
  });

  it('[INV-21] a tick that did not advance is reported', () => {
    const { before, output } = stepSnapshot();
    const tampered: TickOutput = { ...output, tick: ids.tick(99) };
    expect(checkInvariants(before, tampered, registry).map((finding) => finding.id)).toContain(
      'INV-21',
    );
  });

  it('[INV-24] non-ascending store iteration is reported', () => {
    const { before, output } = stepSnapshot();
    const fakeStore = {
      kind: 'producer' as const,
      has: () => true,
      get: () => null,
      getOrThrow: () => null,
      set: () => undefined,
      markRemoved: () => undefined,
      ids: () => [ids.entityId(2), ids.entityId(1)],
      size: () => 2,
      compact: () => undefined,
    };
    const fakeStores = {
      kinds: ['producer'],
      get: () => fakeStore,
    } as unknown as core.ComponentStores;
    const tampered: TickOutput = { ...output, world: { ...output.world, stores: fakeStores } };
    expect(checkInvariants(before, tampered, registry).map((finding) => finding.id)).toContain(
      'INV-24',
    );
  });

  it('[INV-18] a populated world round-trips without a persistence finding', () => {
    const { before, output } = stepSnapshot();
    const findings = checkInvariants(before, output, registry);
    expect(findings.some((finding) => finding.id === 'INV-18')).toBe(false);
  });
});
