/**
 * SCN-14 — the complete reference game (VER-9.3, 06 §9.3). Runs
 * `complete_game.yaml` through the pure scenario runner for the golden check
 * and through the session API for the determinism harnesses (double-run,
 * clone-run, save-continue), so the 7,200-tick run is anchored by a committed
 * golden and by the invariants it checks every tick.
 *
 * The driver lives here rather than in `@aesfw/host-node` because framework
 * packages and their tests are theme-free; it therefore uses the pure runner
 * instead of the CLI.
 *
 * Source: VER-9.3, VER-8.1, VER-9.4, SCN-14
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  advance,
  createSession,
  instantiateWorldContent,
  load,
  save,
  submitCommand,
} from '@aesfw/app';
import type { SessionState } from '@aesfw/app';
import { parseYamlStrict } from '@aesfw/content';
import type { CompiledContent, ContentRegistry } from '@aesfw/content';
import { cloneWorld, hashWorld, ids, step } from '@aesfw/core';
import { parseScenario, runScenario } from '@aesfw/testkit/scenario';
import type { Scenario } from '@aesfw/testkit/scenario';
import { describe, expect, it } from 'vitest';

import { loadReferenceContent } from '../balance/load.js';

const scenarioPath = fileURLToPath(new URL('./complete_game.yaml', import.meta.url));
const goldenPath = fileURLToPath(new URL('./complete_game.hashes.json', import.meta.url));

/**
 * Full-length SCN-14 costs about 4.5 minutes per run (7,200 ticks with the
 * per-tick invariant harness), so CI runs a prefix by default.
 * `AESFW_SLOW=1` restores the full run.
 */
const FULL = process.env['AESFW_SLOW'] === '1';
const PREFIX = 1800;
const MUTATION_PREFIX = 1200;

interface Golden {
  readonly algorithm: string;
  readonly checkpoints: Readonly<Record<string, string>>;
}

const golden = (): Golden => JSON.parse(readFileSync(goldenPath, 'utf8')) as Golden;

const scenario = (): Scenario => {
  const text = readFileSync(scenarioPath, 'utf8');
  const parsed = parseYamlStrict(text, { package: 'reference/content', file: 'complete_game.yaml' })
    .value as { readonly scenario: unknown };
  const result = parseScenario(parsed.scenario);
  if (result.scenario === null) throw new Error(result.errors.join(','));
  return result.scenario;
};

const content = (): CompiledContent => {
  const loaded = loadReferenceContent();
  if (loaded.content === null) throw new Error('reference content failed to load');
  return loaded.content;
};

/** Builds a session for the scenario, up to and including `ticks`. */
const runTo = (compiled: CompiledContent, ticks: number, existing?: SessionState): SessionState => {
  const parsed = scenario();
  let session: SessionState;
  if (existing === undefined) {
    const created = createSession(compiled, {
      sessionId: parsed.id,
      seed: [parsed.setup.seed[0], parsed.setup.seed[1]],
      tickDurationMs: parsed.setup.tickDurationMs,
      world: parsed.setup.world === null ? null : ids.stringId(parsed.setup.world),
      enabledModules: [],
      hashInterval: parsed.run.hashInterval,
      journal: false,
      actor: ids.ownerHandle(0),
      actorId: 'owner.0',
      fog: false,
    });
    if (!created.ok) throw new Error('session creation failed');
    session = created.value;
    instantiateWorldContent(
      session.world,
      compiled.registry as ContentRegistry,
      parsed.setup.world,
    );
  } else {
    session = existing;
  }
  while (session.world.tick < ticks) {
    const tick = session.world.tick + 1;
    const due = parsed.commands.filter((entry) => entry.tick === tick);
    due.forEach((command, index) => {
      session = submitCommand(session, {
        command_id: `${parsed.id}.${tick}.${index}`,
        actor_id: command.actor,
        type: command.type,
        payload: command.payload as never,
      }).session;
    });
    session = advance(session, 1).session;
  }
  return session;
};

describe('[VER-9.3][SCN-14] complete reference game', () => {
  it('[SCN-14] the scenario runs with no finding and matches its golden', () => {
    const parsed = scenario();
    const report = runScenario(
      FULL ? parsed : { ...parsed, run: { ...parsed.run, ticks: PREFIX } },
      content(),
    );
    expect(report.findings).toEqual([]);
    expect(report.checkpoints).toHaveLength(FULL ? 12 : Math.ceil(PREFIX / 600));
    const expected = golden();
    expect(expected.algorithm).toBe('fnv1a64-canonical-json-v1');
    for (const checkpoint of report.checkpoints) {
      expect(expected.checkpoints[String(checkpoint.tick)]).toBe(checkpoint.hash);
    }
    if (FULL) {
      expect(report.expectations.filter((entry) => !entry.ok)).toEqual([]);
    }
  }, 240_000);

  it('[SCN-14] a second run reproduces the checkpoint sequence exactly', () => {
    const parsed = scenario();
    const prefix = { ...parsed, run: { ...parsed.run, ticks: MUTATION_PREFIX } };
    const first = runScenario(prefix, content());
    const second = runScenario(prefix, content());
    expect(second.checkpoints).toEqual(first.checkpoints);
    expect(second.findings).toEqual(first.findings);
  }, 480_000);

  it('[SCN-14] save-continue mid-run continues to the same final hash', () => {
    const compiled = content();
    const horizon = MUTATION_PREFIX + 300;
    const straight = runTo(compiled, horizon);
    const atMidpoint = runTo(compiled, MUTATION_PREFIX);
    const document = save(atMidpoint);
    const restored = load(compiled, document);
    if (!restored.ok) throw new Error('save did not load');
    const continued = runTo(compiled, horizon, restored.value);
    expect(hashWorld(continued.world, compiled.registry)).toBe(
      hashWorld(straight.world, compiled.registry),
    );
  }, 480_000);

  it('[SCN-14] a clone at the midpoint produces the same next tick', () => {
    const compiled = content();
    const atMidpoint = runTo(compiled, MUTATION_PREFIX);
    // Clone-run (INV-17): both copies take the same tick and must agree on
    // state and event stream.
    const clone = cloneWorld(atMidpoint.world);
    const original = step(atMidpoint.world, compiled.registry, {
      commands: [],
      options: { journal: false, hash: true },
    });
    const copy = step(clone, compiled.registry, {
      commands: [],
      options: { journal: false, hash: true },
    });
    expect(hashWorld(copy.world, compiled.registry)).toBe(
      hashWorld(original.world, compiled.registry),
    );
    expect(copy.events).toEqual(original.events);
  }, 480_000);
});
