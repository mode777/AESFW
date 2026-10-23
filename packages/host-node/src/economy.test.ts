import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  createTransactionWriter,
  createWorld,
  ids,
  instantiateWorld,
  step,
  txEnvironmentFor,
} from '@aesfw/core';
import type { EntityId, TickInput, World } from '@aesfw/core';
import type { CompiledContent, ContentRegistry } from '@aesfw/content';
import { defaultWorldPlan, loadContent } from '@aesfw/content';
import { instantiateContentEntities } from '@aesfw/app';
import { cloneRun, doubleRun, saveContinue } from '@aesfw/testkit';
import { fileSystemIo, runCli } from './cli.js';
import type { CliIo } from './cli.js';

const io: CliIo = fileSystemIo();
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

interface Report {
  readonly checkpoints: readonly { tick: number; hash: string }[];
  readonly findings: readonly { tick: number; id: string; message: string }[];
}

describe('[GDD-7.5][GDD-20.2] economy income scenario', () => {
  it('[VER-9.2] the economy scenario runs with no findings and is deterministic', () => {
    const result = runCli(['run', 'fixtures/scenarios/economy_income.yaml'], io);
    expect(result.exitCode).toBe(0);
    const report = JSON.parse(result.output) as Report;
    expect(report.findings).toEqual([]);
    expect(report.checkpoints.length).toBeGreaterThan(0);

    const repeat = runCli(['run', 'fixtures/scenarios/economy_income.yaml'], io);
    expect(repeat.exitCode).toBe(0);
    expect(repeat.output).toBe(result.output);
  });

  it('[CONT-6.3] the economy package validates strictly', () => {
    const result = runCli(['validate', 'fixtures/content/demo-economy', '--strict'], io);
    expect(result.exitCode).toBe(0);
  });
});

const input: TickInput = { commands: [], options: { journal: false, hash: false } };

const buildEconomyWorld = (): { world: World; content: CompiledContent } => {
  const source = io.readPackage(resolve(repoRoot, 'fixtures/content/demo-economy'));
  const loaded = loadContent([source], { strictness: 'strict' });
  if (loaded.content === null) throw new Error('content failed to load');
  const content = loaded.content;
  const created = createWorld(content.registry, {
    seed: [1, 2],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
  });
  if (!created.ok) throw new Error('world creation failed');
  const world = created.value;
  const plan = defaultWorldPlan(content.registry as ContentRegistry);
  if (plan.diagnostics.length > 0) throw new Error('world plan diagnostics');
  instantiateWorld(world, plan.plan);
  instantiateContentEntities(world, content.registry as ContentRegistry);
  // A working balance so the deficit policy stays dormant unless a test forces it.
  const credits = content.registry.handleOf('resource', ids.stringId('demo.resource.credits'));
  if (credits === null) throw new Error('credits missing');
  const fund = createTransactionWriter(world, null, txEnvironmentFor(content.registry));
  const funded = fund.atomic((builder) => {
    builder.account({
      owner: ids.ownerHandle(0),
      resource: credits,
      delta: 10000,
      reason: 'test_seed',
    });
  });
  if (!funded.ok) throw new Error('funding failed');
  return { world, content };
};

const runTicks = (world: World, content: CompiledContent, ticks: number): World => {
  let current = world;
  for (let index = 0; index < ticks; index += 1) {
    current = step(current, content.registry, input).world;
  }
  return current;
};

describe('[GDD-4.8][GDD-20.1] maintenance pipeline integration', () => {
  const creditsOf = (content: CompiledContent) => {
    const credits = content.registry.handleOf('resource', ids.stringId('demo.resource.credits'));
    if (credits === null) throw new Error('credits missing');
    return credits;
  };

  const accountOf = (world: World, content: CompiledContent): number =>
    world.owners.owners[0]?.accounts.find((entry) => entry.resource === creditsOf(content))
      ?.amount ?? 0;

  it('[GDD-20.2] ten ticks debit maintenance before income flows', () => {
    const built = buildEconomyWorld();
    const after = runTicks(built.world, built.content, 10);
    expect(accountOf(after, built.content)).toBe(9500);
  });

  it('[GDD-20.1] maintenance charges land on every interval boundary', () => {
    const built = buildEconomyWorld();
    let current = built.world;
    let charged = 0;
    let incomes = 0;
    for (let index = 0; index < 30; index += 1) {
      const output = step(current, built.content.registry, input);
      charged += output.events.filter((event) => event.type === 'MaintenanceCharged').length;
      incomes += output.events.filter((event) => event.type === 'PopulationOutputProduced').length;
      current = output.world;
    }
    expect(charged).toBe(3);
    expect(incomes).toBeGreaterThan(0);
  });

  it('[GDD-20.2] income overtakes maintenance once satisfaction recovers', () => {
    const built = buildEconomyWorld();
    let current = built.world;
    let at20 = 0;
    let at30 = 0;
    for (let index = 1; index <= 30; index += 1) {
      current = step(current, built.content.registry, input).world;
      if (index === 20) at20 = accountOf(current, built.content);
      if (index === 30) at30 = accountOf(current, built.content);
    }
    expect(at30).toBeGreaterThan(at20);
  });

  it('[VER-8.1] the economy world survives the determinism harnesses', () => {
    const built = buildEconomyWorld();
    const registry = built.content.registry;
    expect(cloneRun(built.world, registry, input).ok).toBe(true);
    expect(doubleRun(built.world, registry, 25).ok).toBe(true);
    expect(saveContinue(built.world, registry, 25, 12).ok).toBe(true);
  });
});

describe('[GDD-3.7][GDD-20.3] deficit loss spiral', () => {
  const creditsOf = (content: CompiledContent) => {
    const credits = content.registry.handleOf('resource', ids.stringId('demo.resource.credits'));
    if (credits === null) throw new Error('credits missing');
    return credits;
  };

  it('[GDD-20.3] a deficit pauses the producer and recovery resumes it', () => {
    const built = buildEconomyWorld();
    const { world, content } = built;
    const credits = creditsOf(content);

    // Force the owner into deficit.
    const overdraw = createTransactionWriter(world, null, txEnvironmentFor(content.registry));
    const applied = overdraw.atomic((builder) => {
      builder.account({
        owner: ids.ownerHandle(0),
        resource: credits,
        delta: -20000,
        reason: 'test_overdraw',
      });
    });
    expect(applied.ok).toBe(true);

    let current: World = world;
    let deficitPaused: readonly EntityId[] = [];
    for (let index = 0; index < 30; index += 1) {
      current = step(current, content.registry, input).world;
      deficitPaused = current.owners.owners[0]?.deficitPaused ?? [];
      if (deficitPaused.length > 0) break;
    }
    expect(deficitPaused.length).toBe(1);
    const producerEntity = deficitPaused[0];
    if (producerEntity === undefined) throw new Error('no paused entity');
    current = step(current, content.registry, input).world;
    const producer = current.stores.get('producer').get(producerEntity) as
      { readonly blockReasons: readonly string[] } | undefined;
    expect(producer?.blockReasons).toContain('paused_by_deficit');
  });

  it('[GDD-20.3] recovery resumes the paused producer automatically', () => {
    const built = buildEconomyWorld();
    const { world, content } = built;
    const credits = creditsOf(content);

    const overdraw = createTransactionWriter(world, null, txEnvironmentFor(content.registry));
    overdraw.atomic((builder) => {
      builder.account({
        owner: ids.ownerHandle(0),
        resource: credits,
        delta: -20000,
        reason: 'test_overdraw',
      });
    });

    let current: World = world;
    for (
      let index = 0;
      index < 10 && (current.owners.owners[0]?.deficitPaused.length ?? 0) === 0;
      index += 1
    ) {
      current = step(current, content.registry, input).world;
    }
    expect(current.owners.owners[0]?.deficitPaused.length).toBe(1);

    // Restore the balance; the automatic resume must clear the pause.
    const restore = createTransactionWriter(current, null, txEnvironmentFor(content.registry));
    restore.atomic((builder) => {
      builder.account({
        owner: ids.ownerHandle(0),
        resource: credits,
        delta: 50000,
        reason: 'test_restore',
      });
    });
    for (
      let index = 0;
      index < 10 && current.owners.owners[0]?.deficitPaused.length !== 0;
      index += 1
    ) {
      current = step(current, content.registry, input).world;
    }
    expect(current.owners.owners[0]?.deficitPaused).toEqual([]);
  });
});
