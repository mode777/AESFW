/// <reference types="node" />
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const repoRoot = join(import.meta.dirname, '../../..');
const scanner = join(repoRoot, 'tools', 'lint-theme-free.mjs');

// The banned literals are assembled at runtime so this test file itself
// stays free of patterns the theme-free scanner must reject (TDS-4.3 rule 7).
const REFERENCE_ID = ['ref', 'wheat'].join('.');
const REFERENCE_PACKAGE = ['ref', 'tier'].join('.');
const REFERENCE_CODES = [['P', '1'].join(''), ['AK', '1'].join(''), ['S', '1'].join('')];

const trees: string[] = [];
afterAll(() => {
  for (const root of trees) rmSync(root, { recursive: true, force: true });
});

const buildTree = (): string => {
  const root = mkdtempSync(join(tmpdir(), 'aesfw-theme-free-'));
  trees.push(root);
  return root;
};

const writeTreeFile = (root: string, relativePath: string, content: string): void => {
  const absolute = join(root, relativePath);
  mkdirSync(join(absolute, '..'), { recursive: true });
  writeFileSync(absolute, content);
};

const scan = (root: string): { status: number; output: string } => {
  const result = spawnSync(process.execPath, [scanner, root], { encoding: 'utf8' });
  return { status: result.status ?? -1, output: `${result.stdout}${result.stderr}` };
};

describe('[TDS-4.3] theme-free framework source and fixtures', () => {
  it('[TDS-4.3] reference identifier literal in fixtures is rejected', () => {
    const root = buildTree();
    writeTreeFile(
      root,
      'fixtures/content/demo-basic-loop/package.yaml',
      `package: demo-basic-loop\nresources:\n  - id: ${REFERENCE_ID}\n`,
    );
    const result = scan(root);
    expect(result.status).toBe(1);
    expect(result.output).toContain('fixtures/content/demo-basic-loop/package.yaml');
    expect(result.output).toContain("'ref.'");
  });

  it('[TDS-4.3] reference code literal in framework source is rejected', () => {
    const root = buildTree();
    const [first, second] = REFERENCE_CODES;
    writeTreeFile(
      root,
      'packages/core/src/demo.ts',
      `export const codes = ['${first}', '${second}'] as const;\n`,
    );
    const result = scan(root);
    expect(result.status).toBe(1);
    expect(result.output).toContain('packages/core/src/demo.ts');
    expect(result.output).toContain(`'${first}'`);
    expect(result.output).toContain(`'${second}'`);
  });

  it('[TDS-4.3] theme-free fixture namespaces pass', () => {
    const root = buildTree();
    writeTreeFile(
      root,
      'fixtures/content/demo-basic-loop/package.yaml',
      'package: demo-basic-loop\nresources:\n  - id: test.wheat\n',
    );
    writeTreeFile(
      root,
      'packages/core/src/demo.ts',
      '// demo.* namespace identifiers are the theme-free fixture convention.\nexport const scenario = "demo.basic-loop";\n',
    );
    const result = scan(root);
    expect(result.status).toBe(0);
  });

  it('[TDS-4.3] reference packages are exempt', () => {
    const root = buildTree();
    writeTreeFile(
      root,
      `reference/content/src/${REFERENCE_PACKAGE}/package.yaml`,
      `package: ${REFERENCE_PACKAGE}\nresources:\n  - id: ${REFERENCE_ID}\ncodes: [${REFERENCE_CODES.join(', ')}]\n`,
    );
    const result = scan(root);
    expect(result.status).toBe(0);
  });
});
