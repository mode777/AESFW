/**
 * The pure scenario runner (VER-9.2). Creates a world from compiled content,
 * runs the configured ticks, records hash checkpoints, and checks invariants.
 *
 * Source: VER-9.2, VER-6
 */
import { cloneWorld, createWorld, instantiateWorld, step } from '@aesfw/core';
import type { DomainEvent, TickInput } from '@aesfw/core';
import { worldPlan } from '@aesfw/content';
import type { CompiledContent, ContentRegistry } from '@aesfw/content';
import { checkInvariants } from '../harness/invariants.js';
import { instantiateContentEntities } from '@aesfw/app';
import type { Scenario, ScenarioCheckpoint, ScenarioFinding, ScenarioReport } from './types.js';

const input = (hash: boolean): TickInput => ({
  commands: [],
  options: { journal: false, hash },
});

/**
 * Runs a scenario against compiled content (VER-9.2).
 *
 * Source: VER-9.2
 */
export function runScenario(scenario: Scenario, content: CompiledContent): ScenarioReport {
  const registry = content.registry;
  const checkpoints: ScenarioCheckpoint[] = [];
  const events: DomainEvent[] = [];
  const findings: ScenarioFinding[] = [];
  const created = createWorld(registry, {
    seed: [scenario.setup.seed[0], scenario.setup.seed[1]],
    tickDurationMs: scenario.setup.tickDurationMs,
    world: null,
    enabledModules: [],
  });
  if (!created.ok) {
    for (const diagnostic of created.error) {
      findings.push({ tick: 0, id: 'load_error', message: diagnostic.code });
    }
    return { id: scenario.id, checkpoints, events, findings };
  }
  const world = created.value;
  const plan = worldPlan(registry as ContentRegistry, scenario.setup.world);
  for (const diagnostic of plan.diagnostics) {
    findings.push({ tick: 0, id: 'content_diagnostic', message: diagnostic.code });
  }
  instantiateWorld(world, plan.plan);
  instantiateContentEntities(world, registry as ContentRegistry);

  const hashing = scenario.run.hashInterval > 0;
  for (let tick = 1; tick <= scenario.run.ticks; tick += 1) {
    const before = cloneWorld(world);
    const output = step(world, registry, input(hashing));
    if (scenario.run.invariants) {
      for (const finding of checkInvariants(before, output, registry)) {
        findings.push({ tick, id: finding.id, message: finding.message });
      }
    }
    for (const event of output.events) events.push(event);
    if (hashing && tick % scenario.run.hashInterval === 0 && output.hash !== null) {
      checkpoints.push({ tick, hash: output.hash });
    }
  }
  return { id: scenario.id, checkpoints, events, findings };
}
