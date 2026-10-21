/// <reference types="node" />
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const repoRoot = join(import.meta.dirname, '../../..');
const toolPath = join(repoRoot, 'tools/trace/index.mjs');

const scratchDirs: string[] = [];
afterEach(() => {
  for (const dir of scratchDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const makeScratch = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'aesfw-trace-'));
  scratchDirs.push(dir);
  return dir;
};

const writeFile = (root: string, relativePath: string, content: string): void => {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
};

const runTool = (root: string, extraArgs: readonly string[] = []) =>
  spawnSync(
    process.execPath,
    [toolPath, '--root', root, '--out', join(root, 'report.md'), ...extraArgs],
    {
      encoding: 'utf8',
    },
  );

const docHeading = '### 6.3 Proportional allocation\n';

describe('[VER-3] traceability tool', () => {
  it('[VER-3.3] a numbered heading yields a prefixed ID', () => {
    const root = makeScratch();
    writeFile(root, 'docs/05_Technical_Design_Specification.md', docHeading);
    const result = runTool(root);
    expect(result.status).toBe(0);
    expect(readFileSync(join(root, 'report.md'), 'utf8')).toContain('TDS-6.3');
  });

  it('[VER-3.2] a tagged test is mapped to its requirement', () => {
    const root = makeScratch();
    writeFile(root, 'docs/05_Technical_Design_Specification.md', docHeading);
    writeFile(root, 'packages/core/src/demo.test.ts', "it('[TDS-6.3] demo', () => {});\n");
    const result = runTool(root);
    expect(result.status).toBe(0);
    const report = readFileSync(join(root, 'report.md'), 'utf8');
    expect(report).toContain('packages/core/src/demo.test.ts');
  });

  it('[VER-3.3] an exempt ID is not reported untraced', () => {
    const root = makeScratch();
    writeFile(root, 'docs/05_Technical_Design_Specification.md', '## 1. Purpose\n### 6.3 X\n');
    writeFile(root, 'tools/trace/exempt.yaml', '- id: TDS-1\n  reason: "Purpose statement."\n');
    const result = runTool(root);
    expect(result.status).toBe(0);
    const report = readFileSync(join(root, 'report.md'), 'utf8');
    expect(report).toContain('| TDS-1 | exempt: Purpose statement.');
    expect(report).not.toContain('- TDS-1');
  });

  it('[VER-3.3] an exemption without a reason is an error', () => {
    const root = makeScratch();
    writeFile(root, 'docs/05_Technical_Design_Specification.md', docHeading);
    writeFile(root, 'tools/trace/exempt.yaml', '- id: TDS-9\n');
    expect(runTool(root).status).not.toBe(0);
  });

  it('[VER-3.3] the report is regenerated on each run', () => {
    const root = makeScratch();
    writeFile(root, 'docs/05_Technical_Design_Specification.md', docHeading);
    runTool(root);
    const first = readFileSync(join(root, 'report.md'), 'utf8');
    runTool(root);
    const second = readFileSync(join(root, 'report.md'), 'utf8');
    expect(second).toBe(first);
  });

  it('[VER-3.3] untraced IDs are a warning by default', () => {
    const root = makeScratch();
    writeFile(root, 'docs/05_Technical_Design_Specification.md', docHeading);
    const result = runTool(root);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('TDS-6.3');
  });

  it('[VER-3.3] the strict gate fails on untraced IDs', () => {
    const root = makeScratch();
    writeFile(root, 'docs/05_Technical_Design_Specification.md', docHeading);
    expect(runTool(root, ['--strict']).status).not.toBe(0);
  });

  it('[VER-15.3] CI runs the trace stage', () => {
    const ci = readFileSync(join(repoRoot, '.github/workflows/ci.yml'), 'utf8');
    expect(ci).toContain('pnpm trace');
  });
});
