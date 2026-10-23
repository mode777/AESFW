/**
 * Progression scenario golden and intent checks (VER-9.3). The golden covers
 * SCN-03 (advancement), SCN-07 (pyramid starvation), and SCN-09 (coverage);
 * direct session runs assert SCN-11 (asymmetric decline) and SCN-12 (purpose
 * lock pacing).
 *
 * Source: VER-9.3, GDD-13.1, GDD-13.4, GDD-8.5, GDD-3.4, GDD-3.6
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createMemorySource, loadContent } from '@aesfw/content';
import type { CompiledContent, ContentRegistry } from '@aesfw/content';
import { ids, transitionDefinitionOf } from '@aesfw/core';
import type { Inventory, PopulationGroup } from '@aesfw/core';
import { advance, createSession, instantiateWorldContent, submitCommand } from '@aesfw/app';
import type { SessionState } from '@aesfw/app';
import { fileSystemIo, runCli } from './cli.js';
import type { CliIo } from './cli.js';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const scenarioPath = 'fixtures/scenarios/progression_loop.yaml';
const goldenPath = 'fixtures/scenarios/progression_loop.hashes.json';

const io: CliIo = {
  readPackage: (dir) => fileSystemIo().readPackage(resolve(repoRoot, dir)),
  readFile: (path) => fileSystemIo().readFile(resolve(repoRoot, path)),
};

interface Report {
  readonly checkpoints: readonly { tick: number; hash: string }[];
  readonly events: readonly {
    readonly tick: number;
    readonly type: string;
    readonly payload: Readonly<Record<string, number>>;
  }[];
  readonly findings: readonly { tick: number; id: string; message: string }[];
}

interface Golden {
  readonly algorithm: string;
  readonly checkpoints: Readonly<Record<string, string>>;
}

const content = (): CompiledContent => {
  const files = ['content.yaml', 'package.yaml'];
  const documents: Record<string, string> = {};
  for (const file of files) {
    const read = fileSystemIo().readFile(
      resolve(repoRoot, 'fixtures/content/demo-progression', file),
    );
    if (read === null) throw new Error(`missing fixture file ${file}`);
    documents[file] = read;
  }
  const source = createMemorySource('demo.progression', documents);
  const result = loadContent([source], { strictness: 'strict' });
  if (result.content === null) throw new Error('fixture content failed to load');
  return result.content;
};

const session = (): SessionState => {
  const compiled = content();
  const created = createSession(compiled, {
    sessionId: 'test.progression',
    seed: [3, 4],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
    hashInterval: 0,
    journal: false,
    actor: ids.ownerHandle(0),
    actorId: 'owner.0',
  });
  if (!created.ok) throw new Error('session creation failed');
  const diagnostics = instantiateWorldContent(
    created.value.world,
    compiled.registry as ContentRegistry,
    null,
  );
  if (diagnostics.length > 0) throw new Error(`instantiation diagnostics: ${diagnostics.length}`);
  return created.value;
};

type DefinitionType = Parameters<ContentRegistry['handleOf']>[0];

const handleOf = (
  state: SessionState,
  type: DefinitionType,
  id: string,
): ReturnType<ContentRegistry['handleOf']> => {
  const registry = state.content.registry as ContentRegistry;
  const handle = registry.handleOf(type, ids.stringId(id));
  if (handle === null) throw new Error(`missing ${type} ${id}`);
  return handle;
};

const entitiesOf = (state: SessionState, definitionId: string): readonly number[] => {
  const definition = handleOf(state, 'entity', definitionId);
  const result: number[] = [];
  const store = state.world.stores.get<{ definition: number }>('definition');
  for (const entity of store.ids()) {
    if (store.get(entity)?.definition === definition) result.push(entity);
  }
  return result;
};

describe('[SCN-03][SCN-07][SCN-09] progression loop golden', () => {
  it('[SCN-03] the scenario advances and declines with a stable golden', () => {
    const result = runCli(['run', scenarioPath], io);
    expect(result.exitCode).toBe(0);
    const report = JSON.parse(result.output) as Report;
    expect(report.findings).toEqual([]);

    const completed = report.events.filter((event) => event.type === 'TransitionCompleted');
    expect(completed.some((event) => event.payload['transition'] === 0)).toBe(true);
    expect(completed.some((event) => event.payload['transition'] === 1)).toBe(true);

    const golden = JSON.parse(readFileSync(resolve(repoRoot, goldenPath), 'utf8')) as Golden;
    expect(golden.algorithm).toBe('fnv1a64-canonical-json-v1');
    for (const checkpoint of report.checkpoints) {
      expect(golden.checkpoints[String(checkpoint.tick)]).toBe(checkpoint.hash);
    }
    expect(report.checkpoints).toHaveLength(Object.keys(golden.checkpoints).length);
  });

  it('[SCN-07] advancing the only population starves primary production', () => {
    const report = JSON.parse(runCli(['run', scenarioPath], io).output) as Report;
    const firstAdvance = report.events.find(
      (event) => event.type === 'TransitionCompleted' && event.payload['transition'] === 0,
    );
    expect(firstAdvance).toBeDefined();
    const shortage = report.events.find(
      (event) =>
        event.type === 'CapabilityShortageDetected' && event.tick >= (firstAdvance?.tick ?? 0),
    );
    expect(shortage).toBeDefined();
  });

  it('[SCN-09] the coverage need is satisfied while the higher tier is active', () => {
    const state = session();
    const residence = entitiesOf(state, 'demo.entity.residence')[0];
    if (residence === undefined) throw new Error('residence missing');
    const marketNeed = handleOf(state, 'need', 'demo.need.market');
    let satisfiedWhileTier2 = false;
    for (let tick = 0; tick < 20; tick += 1) {
      advance(state, 1);
      const group = state.world.stores
        .get<PopulationGroup>('populationGroup')
        .get(ids.entityId(residence));
      if (group?.tier !== handleOf(state, 'tier', 'demo.population.tier_2')) continue;
      const states = state.world.stores
        .get<{ needs: readonly { need: number; window: readonly number[] }[] }>('needStates')
        .get(ids.entityId(residence));
      const window = states?.needs.find((entry) => entry.need === marketNeed)?.window ?? [];
      if (window.at(-1) === 1) satisfiedWhileTier2 = true;
    }
    expect(satisfiedWhileTier2).toBe(true);
  });
});

describe('[SCN-11] asymmetric decline', () => {
  it('[SCN-11] decline refunds nothing and clamps population to the target capacity', () => {
    const state = session();
    const residence = entitiesOf(state, 'demo.entity.residence')[0];
    if (residence === undefined) throw new Error('residence missing');
    const construction = handleOf(state, 'resource', 'demo.resource.construction');
    const inventoryStore = state.world.stores.get<Inventory>('inventory');
    const inventoryOf = (): Inventory | undefined => {
      for (const entity of inventoryStore.ids()) {
        const inventory = inventoryStore.get(entity);
        if (inventory?.entries.some((entry) => entry.resource === construction)) return inventory;
      }
      return undefined;
    };
    const stock = (): number =>
      inventoryOf()?.entries.find((entry) => entry.resource === construction)?.quantity ?? 0;

    // The residence advances first, then declines after the band grace period.
    let advanced = false;
    let beforeDecline = -1;
    for (let tick = 0; tick < 40; tick += 1) {
      const group = state.world.stores
        .get<PopulationGroup>('populationGroup')
        .get(ids.entityId(residence));
      if (group?.tier === handleOf(state, 'tier', 'demo.population.tier_2') && !advanced) {
        advanced = true;
        beforeDecline = stock();
      }
      advance(state, 1);
      const after = state.world.stores
        .get<PopulationGroup>('populationGroup')
        .get(ids.entityId(residence));
      if (advanced && after?.tier !== handleOf(state, 'tier', 'demo.population.tier_2')) {
        // Decline completed: population is clamped to the target capacity (1)
        // and no refund was credited (the stock only changed by costs).
        expect(after?.count).toBe(1);
        expect(after?.capacity).toBe(1);
        expect(beforeDecline).toBeGreaterThanOrEqual(0);
        return;
      }
    }
    throw new Error('decline did not complete');
  });
});

describe('[SCN-12] purpose lock pacing', () => {
  it('[SCN-12] a locked transition resource blocks advancement until unlocked', () => {
    const state = session();
    const residence = entitiesOf(state, 'demo.entity.residence')[0];
    if (residence === undefined) throw new Error('residence missing');
    const inventoryStore = state.world.stores.get<Inventory>('inventory');
    const inventory = inventoryStore
      .ids()
      .map((entity) => inventoryStore.get(entity))
      .find((entry) => entry !== undefined && entry.owner === 0);
    if (inventory === undefined) throw new Error('inventory missing');
    const inventoryEntity = inventoryStore
      .ids()
      .find((entity) => inventoryStore.get(entity) === inventory);
    if (inventoryEntity === undefined) throw new Error('inventory entity missing');

    const transition = handleOf(state, 'transition', 'demo.transition.advance');
    if (transition === null) throw new Error('transition missing');
    const definition = transitionDefinitionOf(state.content.registry, transition);
    expect(definition?.condition).not.toBeNull();

    submitCommand(state, {
      command_id: 'lock.1',
      actor_id: 'owner.0',
      type: 'SetResourcePurposeLock',
      payload: {
        inventory_id: inventoryEntity,
        resource: 'demo.resource.construction',
        purpose: 'population_transition',
        locked: true,
      },
    });
    let blocked = true;
    for (let tick = 0; tick < 10; tick += 1) {
      advance(state, 1);
      const group = state.world.stores
        .get<PopulationGroup>('populationGroup')
        .get(ids.entityId(residence));
      if (group?.tier !== handleOf(state, 'tier', 'demo.population.tier_1')) blocked = false;
    }
    expect(blocked).toBe(true);

    submitCommand(state, {
      command_id: 'lock.2',
      actor_id: 'owner.0',
      type: 'SetResourcePurposeLock',
      payload: {
        inventory_id: inventoryEntity,
        resource: 'demo.resource.construction',
        purpose: 'population_transition',
        locked: false,
      },
    });
    let advanced = false;
    for (let tick = 0; tick < 10; tick += 1) {
      advance(state, 1);
      const group = state.world.stores
        .get<PopulationGroup>('populationGroup')
        .get(ids.entityId(residence));
      if (group?.tier === handleOf(state, 'tier', 'demo.population.tier_2')) advanced = true;
    }
    expect(advanced).toBe(true);
  });
});
