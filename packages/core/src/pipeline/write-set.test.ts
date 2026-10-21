import { describe, expect, it } from 'vitest';
import { entityId } from '../ids/index.js';
import { createEmptyRegistry } from '../registry/types.js';
import { createWorld } from '../world/create.js';
import type { World } from '../world/types.js';
import { runSystem } from './step.js';
import type { SystemDescriptor, TickInput } from './types.js';

const registry = createEmptyRegistry();

const makeWorld = (): World => {
  const result = createWorld(registry, {
    seed: [1, 2],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
  });
  if (!result.ok) throw new Error('createWorld returned an error');
  return result.value;
};

const noInput: TickInput = { commands: [], options: { journal: false, hash: false } };

describe('[TDS-11.2][TDS-12.2] write-set enforcement and seams', () => {
  it('[TDS-11.2] an undeclared write throws', () => {
    const descriptor: SystemDescriptor = {
      phase: 1,
      name: 'demo.undeclared',
      reads: [],
      writes: [],
      run: (ctx) => {
        ctx.world.stores.get('producer').set(entityId(1), { state: 'idle' });
      },
    };
    expect(() => runSystem(descriptor, makeWorld(), registry, noInput)).toThrowError(
      /write_set_violation/,
    );
  });

  it('[TDS-11.2] a declared write is allowed', () => {
    const world = makeWorld();
    const descriptor: SystemDescriptor = {
      phase: 1,
      name: 'demo.declared',
      reads: [],
      writes: ['producer'],
      run: (ctx) => {
        ctx.world.stores.get('producer').set(entityId(1), { state: 'idle' });
      },
    };
    runSystem(descriptor, world, registry, noInput);
    expect(world.stores.get('producer').get(entityId(1))).toEqual({ state: 'idle' });
  });

  it('[TDS-13] the policy set is empty before the policy rows', () => {
    const world = makeWorld();
    let empty = false;
    const descriptor: SystemDescriptor = {
      phase: 1,
      name: 'demo.policies',
      reads: [],
      writes: [],
      run: (ctx) => {
        empty = Object.keys(ctx.policies).length === 0;
      },
    };
    runSystem(descriptor, world, registry, noInput);
    expect(empty).toBe(true);
  });
});
