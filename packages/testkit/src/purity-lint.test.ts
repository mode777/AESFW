/// <reference types="node" />
import { spawnSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const repoRoot = join(import.meta.dirname, '../../..');
const eslintBin = join(repoRoot, 'node_modules', '.bin', 'eslint');

interface LintMessage {
  ruleId: string | null;
  message: string;
}

interface LintResult {
  filePath: string;
  messages: LintMessage[];
}

const scratchFiles: string[] = [];
afterAll(() => {
  for (const path of scratchFiles) rmSync(path, { force: true });
});

/** Writes a snippet into a pure package's source tree and lints it with the
 * repository config. The snippet must be removed afterwards; the helper
 * registers it for afterAll cleanup as a safety net. */
const lintSnippet = (packageName: string, fileName: string, code: string): LintResult[] => {
  const relativePath = join('packages', packageName, 'src', fileName);
  const absolutePath = join(repoRoot, relativePath);
  writeFileSync(absolutePath, code);
  scratchFiles.push(absolutePath);
  const result = spawnSync(eslintBin, ['--format', 'json', relativePath], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return JSON.parse(result.stdout) as LintResult[];
};

const ruleIdsOf = (results: LintResult[]): string[] =>
  results.flatMap((entry) => entry.messages.map((message) => message.ruleId ?? ''));

describe('[TDS-5.3] ambient API restrictions in pure packages', () => {
  it('[TDS-5.3] clock and randomness APIs are rejected', () => {
    const results = lintSnippet(
      'core',
      '__purity-lint-clock.ts',
      ['export function sample(): number {', '  return Math.random() + Date.now();', '}', ''].join(
        '\n',
      ),
    );
    const ids = ruleIdsOf(results);
    expect(ids).toContain('no-restricted-properties');
    expect(ids).toContain('no-restricted-globals');
    const reported = results[0]?.messages.map((message) => message.message).join(' ') ?? '';
    expect(reported).toContain('Math.random');
    expect(reported).toContain('Date.now');
    expect(results[0]?.filePath.endsWith('__purity-lint-clock.ts')).toBe(true);
  });

  it('[TDS-5.3] diagnostics and environment globals are rejected', () => {
    const results = lintSnippet(
      'content',
      '__purity-lint-env.ts',
      [
        'export function leak(): string {',
        '  console.log(process.platform);',
        '  return String(globalThis) + String(window);',
        '}',
        '',
      ].join('\n'),
    );
    const ids = ruleIdsOf(results);
    expect(ids).toContain('no-restricted-globals');
    const reported = results[0]?.messages.map((message) => message.message).join(' ') ?? '';
    for (const banned of ['console', 'process', 'globalThis', 'window']) {
      expect(reported).toContain(`'${banned}'`);
    }
  });

  it('[TDS-5.3] locale-dependent APIs are rejected', () => {
    const results = lintSnippet(
      'protocol',
      '__purity-lint-locale.ts',
      [
        'export function format(value: number, text: string): string {',
        '  const locale = new Intl.NumberFormat();',
        '  return locale.format(value) + text.toLocaleString() + text.localeCompare(text);',
        '}',
        '',
      ].join('\n'),
    );
    const ids = ruleIdsOf(results);
    expect(ids).toContain('no-restricted-globals');
    expect(ids).toContain('no-restricted-properties');
    const reported = results[0]?.messages.map((message) => message.message).join(' ') ?? '';
    expect(reported).toContain('Intl');
    expect(reported).toContain('toLocaleString');
    expect(reported).toContain('localeCompare');
  });

  it('[TDS-5.3] kernel asynchrony is rejected', () => {
    const results = lintSnippet(
      'core',
      '__purity-lint-async.ts',
      [
        'export async function load(): Promise<number> {',
        '  const promise = new Promise<number>((resolve) => resolve(1));',
        '  return (await promise) + 1;',
        '}',
        '',
      ].join('\n'),
    );
    const ids = ruleIdsOf(results);
    expect(ids).toContain('no-restricted-syntax');
    const asyncFindings =
      results[0]?.messages.filter((message) => message.ruleId === 'no-restricted-syntax') ?? [];
    expect(asyncFindings.length).toBeGreaterThanOrEqual(3);
  });

  it('[TDS-5.3] comparator-less sort and for-in are rejected', () => {
    const results = lintSnippet(
      'app',
      '__purity-lint-iteration.ts',
      [
        'const mapLike: Record<string, number> = { a: 1, b: 2 };',
        'export function run(): number {',
        '  const sorted = [3, 1, 2].sort();',
        '  let total = 0;',
        '  for (const key in mapLike) {',
        '    total += mapLike[key];',
        '  }',
        '  return sorted[0] + total;',
        '}',
        '',
      ].join('\n'),
    );
    const ids = ruleIdsOf(results);
    expect(ids).toContain('no-restricted-syntax');
    const reported = results[0]?.messages.map((message) => message.message).join(' ') ?? '';
    expect(reported).toContain('sort');
    expect(reported).toContain('ForInStatement');
  });

  it('[TDS-5.3] compliant pure-package source passes', () => {
    const results = lintSnippet(
      'core',
      '__purity-lint-clean.ts',
      [
        'export function sortedTotal(values: readonly number[]): number {',
        '  return [...values].sort((a, b) => a - b).reduce((sum, value) => sum + value, 0);',
        '}',
        '',
      ].join('\n'),
    );
    expect(ruleIdsOf(results)).toHaveLength(0);
  });
});
