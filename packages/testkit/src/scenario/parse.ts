/**
 * Scenario parsing (VER-9.1). Validates the parsed YAML shape and returns
 * errors rather than throwing for malformed input (TDS-23).
 *
 * Source: VER-9.1, TDS-23
 */
import type { JsonValue } from '@aesfw/content';
import type {
  Scenario,
  ScenarioCommand,
  ScenarioExpectation,
  ScenarioRun,
  ScenarioSetup,
} from './types.js';

/** The outcome of parsing a scenario. */
export interface ParseScenarioResult {
  readonly scenario: Scenario | null;
  readonly errors: readonly string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asStringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;
  return value.every((entry) => typeof entry === 'string') ? value : null;
};

const parseSetup = (value: unknown, errors: string[]): ScenarioSetup | null => {
  if (!isRecord(value)) {
    errors.push('scenario.setup is required');
    return null;
  }
  const seed = value['seed'];
  if (!Array.isArray(seed) || seed.length !== 2 || !seed.every((n) => typeof n === 'number')) {
    errors.push('scenario.setup.seed must be two numbers');
    return null;
  }
  const tickDurationMs = value['tick_duration_ms'];
  if (typeof tickDurationMs !== 'number') {
    errors.push('scenario.setup.tick_duration_ms must be a number');
    return null;
  }
  const world = value['world'];
  return {
    seed: [seed[0] ?? 0, seed[1] ?? 0],
    tickDurationMs,
    world: typeof world === 'string' ? world : null,
  };
};

const parseRun = (value: unknown, errors: string[]): ScenarioRun | null => {
  if (!isRecord(value)) {
    errors.push('scenario.run is required');
    return null;
  }
  const ticks = value['ticks'];
  if (typeof ticks !== 'number' || !Number.isInteger(ticks) || ticks < 0) {
    errors.push('scenario.run.ticks must be a non-negative integer');
    return null;
  }
  const hashInterval = value['hash_interval'];
  const invariants = value['invariants'];
  return {
    ticks,
    hashInterval: typeof hashInterval === 'number' ? hashInterval : 0,
    invariants: invariants !== false,
  };
};

const parseCommands = (value: unknown, errors: string[]): ScenarioCommand[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    errors.push('scenario.commands must be an array');
    return [];
  }
  const commands: ScenarioCommand[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) {
      errors.push('scenario.commands entries must be objects');
      continue;
    }
    commands.push({
      tick: typeof entry['tick'] === 'number' ? entry['tick'] : 0,
      actor: typeof entry['actor'] === 'string' ? entry['actor'] : '',
      type: typeof entry['type'] === 'string' ? entry['type'] : '',
      payload: (entry['payload'] ?? null) as JsonValue,
    });
  }
  return commands;
};

const parseExpect = (value: unknown, errors: string[]): ScenarioExpectation[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    errors.push('scenario.expect must be an array');
    return [];
  }
  return value.map((entry) => ({
    at: isRecord(entry) && typeof entry['at'] === 'number' ? entry['at'] : 0,
    raw: entry as JsonValue,
  }));
};

/**
 * Parses a scenario from a plain parsed value (VER-9.1).
 *
 * Source: VER-9.1
 */
export function parseScenario(value: unknown): ParseScenarioResult {
  const errors: string[] = [];
  if (!isRecord(value)) return { scenario: null, errors: ['scenario must be an object'] };
  const id = value['id'];
  if (typeof id !== 'string' || id.length === 0) errors.push('scenario.id is required');
  const setup = parseSetup(value['setup'], errors);
  const run = parseRun(value['run'], errors);
  const contentValue = isRecord(value['content']) ? value['content'] : null;
  const packages = contentValue === null ? null : asStringArray(contentValue['packages']);
  if (packages === null) errors.push('scenario.content.packages must be a string array');
  const requirements = asStringArray(value['requirements']) ?? [];
  const commands = parseCommands(value['commands'], errors);
  const expect = parseExpect(value['expect'], errors);
  const goldenValue = isRecord(value['golden']) ? value['golden'] : null;
  const goldenHashes = goldenValue === null ? null : goldenValue['hashes'];
  if (errors.length > 0 || setup === null || run === null || packages === null) {
    return { scenario: null, errors };
  }
  return {
    scenario: {
      id: id as string,
      requirements,
      content: { packages },
      setup,
      commands,
      run,
      golden: typeof goldenHashes === 'string' ? { hashes: goldenHashes } : null,
      expect,
    },
    errors,
  };
}
