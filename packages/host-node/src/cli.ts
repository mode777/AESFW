/**
 * The `aesfw` command line (TDS-21.2). `runCli` takes an injected I/O so the
 * command logic is testable without the file system; `fileSystemIo` and `main`
 * wire the Node implementation.
 *
 * Source: TDS-21.2, VER-9.2
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import {
  COLLECTION_ORDER,
  createMemorySource,
  loadContent,
  validatePresentationPackage,
} from '@aesfw/content';
import type { ContentRegistry, Diagnostic, PackageSource } from '@aesfw/content';
import { runBenchmark } from '@aesfw/testkit/bench';
import { parseScenario, runScenario } from '@aesfw/testkit/scenario';
import { parse as parseYaml } from 'yaml';

/** The I/O boundary of the CLI. */
export interface CliIo {
  readonly readPackage: (dir: string) => PackageSource;
  readonly readFile: (path: string) => string | null;
}

/** The outcome of a CLI command. */
export interface CliResult {
  readonly exitCode: number;
  readonly output: string;
}

const formatDiagnostics = (diagnostics: readonly Diagnostic[]): string => {
  if (diagnostics.length === 0) return 'no diagnostics';
  return diagnostics
    .map((diagnostic) => {
      const where = diagnostic.file === null ? '' : ` (${diagnostic.file})`;
      return `${diagnostic.severity}: ${diagnostic.code}${where}`;
    })
    .join('\n');
};

const numberOption = (args: readonly string[], name: string): number | null => {
  const index = args.indexOf(name);
  if (index < 0) return null;
  const value = Number(args[index + 1]);
  return Number.isInteger(value) && value >= 0 ? value : null;
};

const optionValue = (args: readonly string[], name: string): string | null => {
  const index = args.indexOf(name);
  return index < 0 ? null : (args[index + 1] ?? null);
};

/** The definition-type to string-ID sets the presentation validator consumes. */
const simulationIdSets = (registry: ContentRegistry): ReadonlyMap<string, ReadonlySet<string>> => {
  const sets = new Map<string, ReadonlySet<string>>();
  for (const type of COLLECTION_ORDER) {
    const definitionType = type as never;
    sets.set(
      type,
      new Set(registry.definitionsOf(definitionType).map((definition) => definition.id)),
    );
  }
  return sets;
};

const runValidate = (args: readonly string[], io: CliIo): CliResult => {
  const dirs = args.filter((arg) => !arg.startsWith('--'));
  const format = optionValue(args, '--format') ?? 'text';
  const strictness = args.includes('--strict') ? 'strict' : 'lenient';
  const against = optionValue(args, '--against');
  const packageDirs = against === null ? dirs : dirs.filter((dir) => dir !== against);
  const sources = packageDirs.map((dir) => io.readPackage(dir));
  const manifestText =
    packageDirs.length === 1 ? io.readFile(join(packageDirs[0] ?? '', 'package.yaml')) : null;
  const manifest =
    manifestText === null ? null : (parseYaml(manifestText) as { package?: { type?: string } });
  if (manifest?.package?.type === 'presentation') {
    const simulationIds = new Map<string, ReadonlySet<string>>();
    if (against !== null) {
      const loaded = loadContent([io.readPackage(against)], { strictness });
      const registry = loaded.content?.registry as ContentRegistry | undefined;
      if (registry !== undefined) {
        for (const [type, set] of simulationIdSets(registry)) {
          simulationIds.set(type, set);
        }
      }
    }
    const files = sources.flatMap((source) =>
      source.list().map((path) => ({
        package: source.packageRoot,
        path,
        document: parseYaml(source.read(path) ?? '') as never,
      })),
    );
    const diagnostics = validatePresentationPackage(files, { simulationIds });
    const hasError = diagnostics.some((diagnostic) => diagnostic.severity === 'error');
    const output =
      format === 'json' ? JSON.stringify(diagnostics, null, 2) : formatDiagnostics(diagnostics);
    return { exitCode: hasError ? 1 : 0, output };
  }
  const result = loadContent(sources, { strictness });
  const hasError = result.diagnostics.some((diagnostic) => diagnostic.severity === 'error');
  const output =
    format === 'json'
      ? JSON.stringify(result.diagnostics, null, 2)
      : formatDiagnostics(result.diagnostics);
  return { exitCode: hasError ? 1 : 0, output };
};

const runRun = (args: readonly string[], io: CliIo): CliResult => {
  const scenarioPath = args.find((arg) => !arg.startsWith('--'));
  if (scenarioPath === undefined)
    return { exitCode: 1, output: 'usage: aesfw run <scenario.yaml>' };
  const text = io.readFile(scenarioPath);
  if (text === null) return { exitCode: 1, output: `scenario not found: ${scenarioPath}` };
  let parsed: unknown;
  try {
    parsed = parseYaml(text);
  } catch (error) {
    return { exitCode: 1, output: `invalid yaml: ${String(error)}` };
  }
  const parsedScenario = parseScenario(
    (parsed as { readonly scenario?: unknown }).scenario ?? parsed,
  );
  if (parsedScenario.scenario === null) {
    return { exitCode: 1, output: parsedScenario.errors.join('\n') };
  }
  const sources = parsedScenario.scenario.content.packages.map((dir) => io.readPackage(dir));
  const content = loadContent(sources, { strictness: 'strict' });
  if (content.content === null) {
    return { exitCode: 1, output: formatDiagnostics(content.diagnostics) };
  }
  const ticks = numberOption(args, '--ticks');
  const hashInterval = numberOption(args, '--hash-interval');
  const scenario = {
    ...parsedScenario.scenario,
    run: {
      ...parsedScenario.scenario.run,
      ticks: ticks ?? parsedScenario.scenario.run.ticks,
      hashInterval: hashInterval ?? parsedScenario.scenario.run.hashInterval,
    },
  };
  const report = runScenario(scenario, content.content);
  return {
    exitCode: report.findings.length > 0 ? 1 : 0,
    output: JSON.stringify(report, null, 2),
  };
};

const runBench = (args: readonly string[], io: CliIo): CliResult => {
  const name = optionValue(args, '--scenario') ?? 'bench_small';
  const iterations = numberOption(args, '--iterations') ?? 200;
  const warmup = numberOption(args, '--warmup') ?? 20;
  const scenarioPath = `fixtures/scenarios/${name}.yaml`;
  const text = io.readFile(scenarioPath);
  if (text === null) return { exitCode: 1, output: `scenario not found: ${scenarioPath}` };
  let parsed: unknown;
  try {
    parsed = parseYaml(text);
  } catch (error) {
    return { exitCode: 1, output: `invalid yaml: ${String(error)}` };
  }
  const parsedScenario = parseScenario(
    (parsed as { readonly scenario?: unknown }).scenario ?? parsed,
  );
  if (parsedScenario.scenario === null) {
    return { exitCode: 1, output: parsedScenario.errors.join('\n') };
  }
  const sources = parsedScenario.scenario.content.packages.map((dir) => io.readPackage(dir));
  const content = loadContent(sources, { strictness: 'strict' });
  if (content.content === null) {
    return { exitCode: 1, output: formatDiagnostics(content.diagnostics) };
  }
  const result = runBenchmark(parsedScenario.scenario, content.content, {
    iterations,
    warmup,
    now: () => performance.now(),
  });
  return { exitCode: 0, output: JSON.stringify(result, null, 2) };
};

/**
 * Runs an `aesfw` command (TDS-21.2).
 *
 * Source: TDS-21.2
 */
export function runCli(args: readonly string[], io: CliIo): CliResult {
  const [command, ...rest] = args;
  if (command === 'validate') return runValidate(rest, io);
  if (command === 'run') return runRun(rest, io);
  if (command === 'bench') return runBench(rest, io);
  return { exitCode: 1, output: 'usage: aesfw <validate|run|bench> ...' };
}

/** The Node file-system I/O implementation. */
export function fileSystemIo(): CliIo {
  const readPackage = (dir: string): PackageSource => {
    const files: Record<string, string> = {};
    const walk = (current: string): void => {
      for (const entry of readdirSync(current)) {
        const full = join(current, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (entry.endsWith('.yaml')) files[relative(dir, full)] = readFileSync(full, 'utf8');
      }
    };
    walk(dir);
    return createMemorySource(dir, files);
  };
  return {
    readPackage,
    readFile: (path) => {
      try {
        return readFileSync(path, 'utf8');
      } catch {
        return null;
      }
    },
  };
}

/** The binary entry point. */
export function main(argv: readonly string[] = process.argv.slice(2)): void {
  const result = runCli(argv, fileSystemIo());
  process.stdout.write(`${result.output}\n`);
  process.exitCode = result.exitCode;
}
