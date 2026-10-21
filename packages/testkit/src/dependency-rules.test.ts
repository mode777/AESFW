/// <reference types="node" />
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const repoRoot = join(import.meta.dirname, '../../..');
const depcruiseBin = join(repoRoot, 'node_modules', '.bin', 'depcruise');
const depcruiseConfig = join(repoRoot, '.dependency-cruiser.cjs');

const PACKAGE_NAMES = [
  'core',
  'content',
  'protocol',
  'app',
  'testkit',
  'host-web',
  'host-node',
] as const;

type PackageName = (typeof PACKAGE_NAMES)[number];

/** Extra exports subpaths a fake package declares besides the root. */
const SUBPATHS: Partial<Record<PackageName, string[]>> = { core: ['testing'] };

interface Tree {
  root: string;
  /** Writes a file into the tree, creating parent directories. */
  write(relativePath: string, content: string): void;
}

const trees: string[] = [];
afterAll(() => {
  for (const root of trees) rmSync(root, { recursive: true, force: true });
});

/** Builds a fake workspace mirroring the real package shape: exports maps
 * pointing into `dist/`, with `src/` sources alongside. */
const buildTree = (withFixtures = false): Tree => {
  const root = mkdtempSync(join(tmpdir(), 'aesfw-depcruise-'));
  trees.push(root);
  const write = (relativePath: string, content: string): void => {
    const absolute = join(root, relativePath);
    mkdirSync(join(absolute, '..'), { recursive: true });
    writeFileSync(absolute, content);
  };
  for (const name of PACKAGE_NAMES) {
    const subpaths = SUBPATHS[name] ?? [];
    const exports: Record<string, unknown> = {
      '.': { types: './dist/index.d.ts', default: './dist/index.js' },
    };
    for (const sub of subpaths) {
      exports[`./${sub}`] = {
        types: `./dist/${sub}.d.ts`,
        default: `./dist/${sub}.js`,
      };
    }
    write(
      `packages/${name}/package.json`,
      `${JSON.stringify({ name: `@aesfw/${name}`, exports })}\n`,
    );
    write(`packages/${name}/src/index.ts`, 'export const id = 1;\n');
    write(`packages/${name}/dist/index.js`, 'export const id = 1;\n');
    write(`packages/${name}/dist/index.d.ts`, 'export declare const id = 1;\n');
    for (const sub of subpaths) {
      write(`packages/${name}/dist/${sub}.js`, 'export const id = 1;\n');
      write(`packages/${name}/dist/${sub}.d.ts`, 'export declare const id = 1;\n');
    }
  }
  write(
    'reference/client-web/package.json',
    `${JSON.stringify({
      name: '@aesfw-ref/client-web',
      exports: { '.': { types: './dist/index.d.ts', default: './dist/index.js' } },
    })}\n`,
  );
  write('reference/client-web/src/index.ts', 'export const id = 1;\n');
  write('reference/client-web/dist/index.js', 'export const id = 1;\n');
  write('reference/client-web/dist/index.d.ts', 'export declare const id = 1;\n');
  if (withFixtures) write('fixtures/scenarios/demo.ts', 'export const demo = 1;\n');
  for (const name of PACKAGE_NAMES) {
    mkdirSync(join(root, 'node_modules', '@aesfw'), { recursive: true });
    symlinkSync(join(root, 'packages', name), join(root, 'node_modules', '@aesfw', name), 'dir');
  }
  mkdirSync(join(root, 'node_modules', '@aesfw-ref'), { recursive: true });
  symlinkSync(
    join(root, 'reference', 'client-web'),
    join(root, 'node_modules', '@aesfw-ref', 'client-web'),
    'dir',
  );
  return { root, write };
};

interface CruiseResult {
  status: number;
  output: string;
}

const cruise = (tree: Tree, ...roots: string[]): CruiseResult => {
  const result = spawnSync(depcruiseBin, ['--config', depcruiseConfig, ...roots], {
    cwd: tree.root,
    encoding: 'utf8',
  });
  return { status: result.status ?? -1, output: `${result.stdout}${result.stderr}` };
};

const violatingModule = (specifier: string): string =>
  `import { id } from '${specifier}';\nexport const x = id;\n`;

describe('[TDS-4.3] dependency boundary rules', () => {
  it('[TDS-4.3] packages importing reference are rejected', () => {
    const tree = buildTree();
    tree.write('packages/core/src/violation.ts', violatingModule('@aesfw-ref/client-web'));
    const result = cruise(tree, 'packages', 'reference');
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('packages-no-reference-imports');
    expect(result.output).toContain('packages/core/src/violation.ts');
  });

  it('[TDS-4.3] packages importing fixtures are rejected', () => {
    const tree = buildTree(true);
    tree.write(
      'packages/app/src/loader.ts',
      "import { demo } from '../../../fixtures/scenarios/demo';\nexport const x = demo;\n",
    );
    const result = cruise(tree, 'packages', 'reference', 'fixtures');
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('packages-no-fixtures-imports');
    expect(result.output).toContain('packages/app/src/loader.ts');
  });

  it('[TDS-4.3] core importing another package is rejected', () => {
    const tree = buildTree();
    tree.write('packages/core/src/violation.ts', violatingModule('@aesfw/content'));
    const result = cruise(tree, 'packages', 'reference');
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('core-isolation');
    expect(result.output).toContain('packages/core/src/violation.ts');
  });

  it('[TDS-4.3] protocol importing another package is rejected', () => {
    const tree = buildTree();
    tree.write('packages/protocol/src/violation.ts', violatingModule('@aesfw/core'));
    const result = cruise(tree, 'packages', 'reference');
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('protocol-isolation');
    expect(result.output).toContain('packages/protocol/src/violation.ts');
  });

  it('[TDS-4.3] reference client importing framework internals is rejected', () => {
    const tree = buildTree();
    tree.write('reference/client-web/src/main.ts', violatingModule('@aesfw/core'));
    const result = cruise(tree, 'packages', 'reference');
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('client-web-visibility');
    expect(result.output).toContain('reference/client-web/src/main.ts');
  });

  it('[TDS-4.3] pure package importing a shell package is rejected', () => {
    const tree = buildTree();
    tree.write('packages/testkit/src/violation.ts', violatingModule('@aesfw/host-node'));
    const result = cruise(tree, 'packages', 'reference');
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('pure-no-shell-imports');
    expect(result.output).toContain('packages/testkit/src/violation.ts');
  });

  it('[TDS-4.3] deep source import is rejected', () => {
    const tree = buildTree();
    tree.write('packages/app/src/session.ts', violatingModule('@aesfw/core/src/det/hash'));
    const result = cruise(tree, 'packages', 'reference');
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('entry-point-only-core');
    expect(result.output).toContain('packages/app/src/session.ts');
  });

  it('[TDS-4.3] core testing entry is allowed for testkit', () => {
    const tree = buildTree();
    tree.write('packages/testkit/src/harness.ts', violatingModule('@aesfw/core/testing'));
    const result = cruise(tree, 'packages', 'reference');
    expect(result.status).toBe(0);
  });

  it('[TDS-4.3] core testing entry is rejected elsewhere', () => {
    const tree = buildTree();
    tree.write('packages/app/src/session.ts', violatingModule('@aesfw/core/testing'));
    const result = cruise(tree, 'packages', 'reference');
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('core-testing-testkit-only');
    expect(result.output).toContain('packages/app/src/session.ts');
  });

  it('[TDS-4.3] compliant dependency graph passes', () => {
    const tree = buildTree();
    const result = cruise(tree, 'packages', 'reference');
    expect(result.status).toBe(0);
    expect(result.output).not.toContain('error');
  });
});
