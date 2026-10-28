/**
 * Runs the scripted strategies against the reference world (REF-8). Shared by
 * the balancing-target tests so every strategy starts from the same seeded
 * world, with the authored start layout occupied and the build plan packed
 * around it.
 *
 * Source: REF-8
 */
import { createSession, instantiateWorldContent } from '@aesfw/app';
import type { CompiledContent, ContentRegistry } from '@aesfw/content';
import { locationGridOf, transformOf } from '@aesfw/core';
import type { ScenarioCommand, ScenarioReport } from '@aesfw/testkit/scenario';
import { runScenario } from '@aesfw/testkit/scenario';

import { loadReferenceContent } from './load.js';
import { OPENING_BUILD, packPlacements, scenarioOf } from './strategies.js';
import type { BuildStep, Placement } from './strategies.js';

/** The seed the corpus runs with. */
export const BALANCE_SEED: readonly [number, number] = [1, 2];

const SEED: readonly [number, number] = [BALANCE_SEED[0], BALANCE_SEED[1]];

export interface Prepared {
  readonly content: CompiledContent;
  readonly registry: ContentRegistry;
  readonly location: number;
  readonly placements: readonly Placement[];
}

/** Loads the content and packs the build plan on the authored start layout. */
export function prepare(steps: readonly BuildStep[] = OPENING_BUILD): Prepared {
  const loaded = loadReferenceContent();
  const content = loaded.content;
  if (content === null) throw new Error('reference content failed to load');
  const registry: ContentRegistry = content.registry;
  const created = createSession(content, {
    sessionId: 'balance.prepare',
    seed: [SEED[0], SEED[1]],
    tickDurationMs: 1000,
    world: 'ref.tier.world.prototype' as never,
    enabledModules: [],
    hashInterval: 0,
    journal: false,
    actor: 0 as never,
    actorId: 'owner.0',
    fog: false,
  });
  if (!created.ok) throw new Error('session creation failed');
  const session = created.value;
  instantiateWorldContent(session.world, registry, 'ref.tier.world.prototype');
  const location = session.world.stores.get('location').ids()[0];
  if (location === undefined) throw new Error('missing start location');
  const grid = locationGridOf(session.world, location);
  if (grid === undefined) throw new Error('start location has no grid');
  const occupied: number[] = [];
  for (const entity of session.world.stores.get('transform').ids()) {
    const transform = transformOf(session.world, entity);
    if (transform === undefined || transform.location !== location) continue;
    const footprint = session.world.stores
      .get<{ width: number; height: number }>('footprint')
      .get(entity);
    if (footprint === undefined) continue;
    for (let dy = 0; dy < footprint.height; dy += 1) {
      for (let dx = 0; dx < footprint.width; dx += 1) {
        occupied.push((transform.position.y + dy) * grid.width + transform.position.x + dx);
      }
    }
  }
  const placements = packPlacements(
    registry,
    { width: grid.width, height: grid.height, blocked: grid.blocked, occupied },
    steps,
  );
  if (placements === null) throw new Error('the build plan does not fit the start grid');
  return { content, registry, location, placements };
}

/** Runs one strategy over the prepared world. */
export function run(
  prepared: Prepared,
  id: string,
  commands: (location: number, placements: readonly Placement[]) => readonly ScenarioCommand[],
  ticks: number,
): ScenarioReport {
  const scenario = scenarioOf(id, commands(prepared.location, prepared.placements), ticks, SEED);
  return runScenario(scenario, prepared.content);
}

/** The first tick at which the given tier has at least `count` population. */
export const firstTickWithPopulation = (
  report: ScenarioReport,
  tier: string,
  count: number,
): number | null => {
  for (const row of report.metrics) {
    if ((row.population[tier] ?? 0) >= count) return row.tick;
  }
  return null;
};

/** The lowest satisfaction across all sampled rows, or `null`. */
export const lowestSatisfaction = (report: ScenarioReport): number | null => {
  let lowest: number | null = null;
  for (const row of report.metrics) {
    for (const value of Object.values(row.satisfaction)) {
      if (lowest === null || value < lowest) lowest = value;
    }
  }
  return lowest;
};
