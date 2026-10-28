/**
 * The pure scenario runner (VER-9.2). Creates a session from compiled content,
 * instantiates the selected world, applies scheduled scenario commands through
 * the real command gateway, runs the configured ticks, records hash
 * checkpoints, evaluates expectations, samples metrics, and checks invariants.
 *
 * Source: VER-9.2, VER-9.1, VER-6, TDS-16.1, TDS-18.1
 */
import { cloneWorld, ids } from '@aesfw/core';
import type { DomainEvent, TickOutput } from '@aesfw/core';
import { advance, createSession, instantiateWorldContent, submitCommand } from '@aesfw/app';
import type { SessionState } from '@aesfw/app';
import { checkInvariants } from '../harness/invariants.js';
import type { CompiledContent, ContentRegistry } from '@aesfw/content';
import { evaluateExpectation, resolveEntityRef } from './expectations.js';
import type { JsonValue } from '@aesfw/content';
import { metricsRow } from './metrics.js';
import type {
  Scenario,
  ScenarioCheckpoint,
  ScenarioExpectationResult,
  ScenarioFinding,
  ScenarioMetrics,
  ScenarioReport,
} from './types.js';

/**
 * Runs a scenario against compiled content (VER-9.2). Expectation failures do
 * not abort the run: later ticks still execute and every entry is reported
 * (VER-9.1, design D1).
 *
 * Source: VER-9.2, VER-9.1, TDS-16.1
 */
export function runScenario(scenario: Scenario, content: CompiledContent): ScenarioReport {
  const registry = content.registry;
  const checkpoints: ScenarioCheckpoint[] = [];
  const events: DomainEvent[] = [];
  const findings: ScenarioFinding[] = [];
  const expectations: ScenarioExpectationResult[] = [];
  const metrics: ScenarioMetrics[] = [];
  const actorId = scenario.commands[0]?.actor ?? 'owner.0';
  const created = createSession(content, {
    sessionId: scenario.id,
    seed: [scenario.setup.seed[0], scenario.setup.seed[1]],
    tickDurationMs: scenario.setup.tickDurationMs,
    world: scenario.setup.world === null ? null : ids.stringId(scenario.setup.world),
    enabledModules: [],
    hashInterval: scenario.run.hashInterval,
    journal: false,
    actor: ids.ownerHandle(0),
    actorId,
    // Scenarios are whole-world observation and control runs: metrics and
    // expectations must resolve for every location, so fog filtering is off
    // (design D2). Fog is a projection concern, not a simulation one, so this
    // does not affect hashes.
    fog: false,
  });
  if (!created.ok) {
    for (const diagnostic of created.error) {
      findings.push({ tick: 0, id: 'load_error', message: diagnostic.code });
    }
    return { id: scenario.id, checkpoints, events, findings, expectations, metrics };
  }
  let session: SessionState = created.value;
  for (const diagnostic of instantiateWorldContent(
    session.world,
    registry as ContentRegistry,
    scenario.setup.world,
  )) {
    findings.push({ tick: 0, id: 'content_diagnostic', message: diagnostic.code });
  }

  const evaluateAt = (tick: number): void => {
    for (const expectation of scenario.expect.filter((entry) => entry.at === tick)) {
      expectations.push(evaluateExpectation(session, events, expectation));
    }
  };

  const interval = scenario.run.metricsInterval;
  let lastMetricsTick = 0;
  const sampleMetrics = (): void => {
    if (interval <= 0) return;
    if (session.world.tick % interval !== 0) return;
    metrics.push(metricsRow(session, events, lastMetricsTick));
    lastMetricsTick = session.world.tick;
  };

  // Tick 0 is the instantiated start state, before any phase runs.
  evaluateAt(0);
  sampleMetrics();

  /**
   * Resolves the `@<definition>#<n>` references VER-9.1 allows in a scenario's
   * entity fields, so a strategy can address entities it creates later by
   * definition and ordinal instead of by predicted entity ID.
   */
  const resolvePayload = (payload: JsonValue): JsonValue => {
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) return payload;
    const record = payload as Record<string, JsonValue>;
    const resolved: Record<string, JsonValue> = { ...record };
    for (const field of ['entity_id', 'unit_id', 'order_id', 'location_id']) {
      const value = record[field];
      if (typeof value !== 'string' || !value.startsWith('@')) continue;
      const entity = resolveEntityRef(session, value);
      if (entity !== null) resolved[field] = entity;
    }
    return resolved;
  };

  const hashing = scenario.run.hashInterval > 0;
  for (let tick = 1; tick <= scenario.run.ticks; tick += 1) {
    for (const command of scenario.commands.filter((entry) => entry.tick === tick)) {
      const submitted = submitCommand(session, {
        command_id: `${scenario.id}.${tick}.${command.type}`,
        actor_id: command.actor,
        type: command.type,
        payload: resolvePayload(command.payload) as never,
      });
      session = submitted.session;
      if (submitted.result.status === 'rejected') {
        findings.push({
          tick,
          id: 'command_rejected',
          message: submitted.result.errors.map((error) => error.code).join(','),
        });
      }
    }
    const before = cloneWorld(session.world);
    const advanced = advance(session, 1);
    session = advanced.session;
    const output: TickOutput | undefined = advanced.outputs[0];
    if (output === undefined) continue;
    if (scenario.run.invariants) {
      for (const finding of checkInvariants(before, output, registry)) {
        findings.push({ tick, id: finding.id, message: finding.message });
      }
    }
    for (const event of output.events) events.push(event);
    if (hashing && tick % scenario.run.hashInterval === 0 && output.hash !== null) {
      checkpoints.push({ tick, hash: output.hash });
    }
    evaluateAt(tick);
    sampleMetrics();
  }
  return { id: scenario.id, checkpoints, events, findings, expectations, metrics };
}
