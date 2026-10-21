import { describe, expect, it } from 'vitest';
import { tick } from '../ids/index.js';
import { createEmptyRegistry } from '../registry/types.js';
import { createWorld } from '../world/create.js';
import { hashWorld } from '../world/codec.js';
import type { World } from '../world/types.js';
import { phaseTable } from './phase-table.js';
import { runPhases, runSystem, step } from './step.js';
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

describe('[TDS-10.1][TDS-10.3][TDS-11.3] tick runner', () => {
  it('[TDS-11.2] a system sees the computed tick', () => {
    const world = makeWorld();
    world.tick = tick(4);
    let seen = -1;
    const descriptor: SystemDescriptor = {
      phase: 1,
      name: 'demo.observeTick',
      reads: [],
      writes: [],
      run: (ctx) => {
        seen = ctx.tick;
      },
    };
    runSystem(descriptor, world, registry, noInput);
    expect(seen).toBe(5);
  });

  it('[TDS-10.1] an empty world advances one tick', () => {
    const world = makeWorld();
    const output = step(world, registry, noInput);
    expect(output.tick).toBe(1);
    expect(world.tick).toBe(1);
    expect(output.world).toBe(world);
  });

  it('[TDS-10.1] hashing produces a state hash without changing state', () => {
    const withHash = makeWorld();
    const withoutHash = makeWorld();
    const hashed = step(withHash, registry, {
      commands: [],
      options: { journal: false, hash: true },
    });
    step(withoutHash, registry, noInput);
    expect(hashed.hash).toMatch(/^[0-9a-f]{16}$/);
    expect(hashed.hash).toBe(hashWorld(withHash, registry));
    expect(hashWorld(withHash, registry)).toBe(hashWorld(withoutHash, registry));
  });

  it('[TDS-10.1] journaling is opt-in', () => {
    const world = makeWorld();
    const journaled = step(world, registry, {
      commands: [],
      options: { journal: true, hash: false },
    });
    expect(journaled.journal).toEqual([]);
    const plain = step(makeWorld(), registry, noInput);
    expect(plain.journal).toBeNull();
  });

  it('[TDS-17] emitted events are sequenced in order', () => {
    const world = makeWorld();
    const descriptor: SystemDescriptor = {
      phase: 1,
      name: 'demo.emit',
      reads: [],
      writes: [],
      run: (ctx) => {
        ctx.events.emit({ type: 'Demo', subjects: [], owner: null, location: null, payload: null });
        ctx.events.emit({ type: 'Demo', subjects: [], owner: null, location: null, payload: 1 });
      },
    };
    const output = runSystem(descriptor, world, registry, noInput);
    expect(output.events.map((event) => event.seq)).toEqual([0, 1]);
    expect(output.events.every((event) => event.tick === 1)).toBe(true);
  });

  it('[TDS-10.3] only the requested phases run', () => {
    const calls: number[] = [];
    const overrides: Array<{ descriptor: SystemDescriptor; run: SystemDescriptor['run'] }> = [];
    for (const phase of [7, 8, 13]) {
      const descriptor = phaseTable.find((candidate) => candidate.phase === phase);
      if (descriptor === undefined) throw new Error(`missing phase ${phase}`);
      overrides.push({ descriptor, run: descriptor.run });
      (descriptor as unknown as { run: SystemDescriptor['run'] }).run = () => {
        calls.push(phase);
      };
    }
    try {
      const output = runPhases(makeWorld(), registry, [13, 7], noInput);
      expect(calls).toEqual([7, 13]);
      expect(output.tick).toBe(1);
    } finally {
      for (const override of overrides) {
        (override.descriptor as unknown as { run: SystemDescriptor['run'] }).run = override.run;
      }
    }
  });
});
