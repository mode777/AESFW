/// <reference types="node" />
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const srcDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(srcDir, '../../..');
const readJson = (path: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(repoRoot, path), 'utf8')) as Record<string, unknown>;

const frameworkPackages = [
  'packages/core',
  'packages/content',
  'packages/protocol',
  'packages/app',
  'packages/testkit',
  'packages/host-web',
  'packages/host-node',
];
const referencePackages = ['reference/content', 'reference/client-web'];
const allPackages = [...frameworkPackages, ...referencePackages];
const expectedNames = new Set([
  '@aesfw/core',
  '@aesfw/content',
  '@aesfw/protocol',
  '@aesfw/app',
  '@aesfw/testkit',
  '@aesfw/host-web',
  '@aesfw/host-node',
  '@aesfw-ref/content',
  '@aesfw-ref/client-web',
]);
const purePackages = [
  'packages/core',
  'packages/content',
  'packages/protocol',
  'packages/app',
  'packages/testkit',
];
const forbiddenForPure = [
  '@aesfw/host-web',
  '@aesfw/host-node',
  '@aesfw-ref/content',
  '@aesfw-ref/client-web',
];

const dependenciesOf = (manifest: Record<string, unknown>): string[] => [
  ...Object.keys((manifest['dependencies'] as Record<string, unknown> | undefined) ?? {}),
  ...Object.keys((manifest['devDependencies'] as Record<string, unknown> | undefined) ?? {}),
];

describe('[TDS-4.1][TDS-4.2] workspace package inventory', () => {
  it('[TDS-4.1][TDS-4.2] all nine packages resolve and no others exist', async () => {
    const names = allPackages.map((dir) => readJson(`${dir}/package.json`)['name']);
    expect(new Set(names)).toEqual(expectedNames);

    expect(readdirSync(join(repoRoot, 'packages')).sort()).toEqual([
      'app',
      'content',
      'core',
      'host-node',
      'host-web',
      'protocol',
      'testkit',
    ]);
    expect(readdirSync(join(repoRoot, 'reference')).sort()).toEqual(['client-web', 'content']);

    for (const dir of allPackages) {
      expect(existsSync(join(repoRoot, dir, 'package.json')), dir).toBe(true);
    }

    const listing = spawnSync('pnpm', ['list', '-r', '--depth', '-1', '--json'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    expect(listing.status).toBe(0);
    const listed = JSON.parse(listing.stdout ?? '[]') as Array<{ name?: string }>;
    const listedScoped = listed.filter(
      (entry) => typeof entry.name === 'string' && entry.name.startsWith('@aesfw'),
    );
    expect(new Set(listedScoped.map((entry) => entry.name))).toEqual(expectedNames);

    const consumerLinks: Array<[consumer: string, dependency: string]> = [
      ['packages/app', '@aesfw/core'],
      ['packages/app', '@aesfw/protocol'],
      ['packages/testkit', '@aesfw/content'],
      ['packages/host-node', '@aesfw/testkit'],
      ['reference/client-web', '@aesfw/host-web'],
    ];
    for (const [consumer, dependency] of consumerLinks) {
      expect(
        existsSync(join(repoRoot, consumer, 'node_modules', dependency, 'package.json')),
        `${consumer} resolves ${dependency}`,
      ).toBe(true);
    }

    const protocol = (await import('@aesfw/protocol')) as { PROTOCOL_PACKAGE_ID: string };
    expect(protocol.PROTOCOL_PACKAGE_ID).toBe('@aesfw/protocol');
  });
});

describe('[TDS-4.2] host-web entry points', () => {
  it('[TDS-4.2] host-web exposes worker and client entry points', () => {
    const manifest = readJson('packages/host-web/package.json');
    const exports = manifest['exports'] as Record<string, Record<string, string>>;

    expect(exports['./worker']?.['types']).toBe('./dist/worker/index.d.ts');
    expect(exports['./client']?.['types']).toBe('./dist/client/index.d.ts');
    expect(existsSync(join(repoRoot, 'packages/host-web/src/worker/index.ts'))).toBe(true);
    expect(existsSync(join(repoRoot, 'packages/host-web/src/client/index.ts'))).toBe(true);
    expect(exports['.'], 'host-web has no root export, only ./worker and ./client').toBeUndefined();
  });
});

describe('[TDS-4.2][TDS-4.3] package dependency declarations', () => {
  it('[TDS-4.2][TDS-4.3] core declares zero runtime dependencies', () => {
    const manifest = readJson('packages/core/package.json');
    const deps = manifest['dependencies'] as Record<string, unknown> | undefined;
    expect(deps === undefined || Object.keys(deps).length === 0).toBe(true);
  });

  it('[TDS-4.2][TDS-4.3] pure packages declare no shell or reference dependencies', () => {
    for (const dir of purePackages) {
      const names = dependenciesOf(readJson(`${dir}/package.json`));
      for (const forbidden of forbiddenForPure) {
        expect(names, `${dir} must not depend on ${forbidden}`).not.toContain(forbidden);
      }
    }
  });

  it('[TDS-4.2][TDS-4.3] reference client declares only permitted framework sources', () => {
    const manifest = readJson('reference/client-web/package.json');
    const frameworkDeps = dependenciesOf(manifest).filter((name) => name.startsWith('@aesfw'));
    expect(frameworkDeps.sort()).toEqual(['@aesfw/host-web', '@aesfw/protocol']);
  });
});

describe('[TDS-25] strict TypeScript configuration', () => {
  const strictFlags = [
    'strict',
    'noUncheckedIndexedAccess',
    'exactOptionalPropertyTypes',
    'noImplicitOverride',
    'noFallthroughCasesInSwitch',
    'verbatimModuleSyntax',
    'isolatedModules',
  ] as const;
  const tsProjects = [...frameworkPackages, 'reference/client-web'];

  it('[TDS-25] every package tsconfig extends the base without reverting strict flags', () => {
    const base = readJson('tsconfig.base.json');
    const baseOptions = base['compilerOptions'] as Record<string, unknown>;
    for (const flag of strictFlags) {
      expect(baseOptions[flag], `tsconfig.base.json ${flag}`).toBe(true);
    }

    for (const dir of tsProjects) {
      const config = readJson(`${dir}/tsconfig.json`);
      expect(config['extends'], dir).toBe('../../tsconfig.base.json');
      const options = (config['compilerOptions'] as Record<string, unknown> | undefined) ?? {};
      for (const flag of strictFlags) {
        expect(options[flag] ?? true, `${dir} reverts ${flag}`).not.toBe(false);
      }
    }
  });

  it('[TDS-25] pure packages compile without DOM, WebWorker, or node typings', () => {
    for (const dir of purePackages) {
      const config = readJson(`${dir}/tsconfig.json`);
      const options = (config['compilerOptions'] as Record<string, unknown> | undefined) ?? {};
      const lib = (options['lib'] as string[] | undefined) ?? [];
      expect(lib, `${dir} lib`).not.toContain('DOM');
      expect(lib, `${dir} lib`).not.toContain('WebWorker');
      const types = (options['types'] as string[] | undefined) ?? [];
      expect(types, `${dir} types`).not.toContain('node');
    }
  });
});

describe('[VER-15.3] test toolchain reach', () => {
  it('[VER-15.3] test command reaches every package project', () => {
    const vitestConfig = readFileSync(join(repoRoot, 'vitest.config.ts'), 'utf8');
    const projectRoots = [
      'packages/core',
      'packages/content',
      'packages/protocol',
      'packages/app',
      'packages/testkit',
      'packages/host-web',
      'packages/host-node',
      'reference/client-web',
    ];
    for (const dir of projectRoots) {
      expect(vitestConfig).toContain(`'${dir}'`);
    }

    const hasTests = (dir: string): boolean => {
      const entries = readdirSync(join(repoRoot, dir, 'src'));
      return entries.some((name) => name.endsWith('.test.ts'));
    };
    const packagesWithTests = projectRoots.filter(
      (dir) => existsSync(join(repoRoot, dir, 'src')) && hasTests(dir),
    );
    expect(packagesWithTests.length).toBeGreaterThanOrEqual(2);
    for (const dir of packagesWithTests) {
      expect(vitestConfig, `${dir} has tests but no Vitest project`).toContain(`'${dir}'`);
    }
  });
});

describe('[TDS-2][VER-15.3] format gate', () => {
  it('[TDS-2][VER-15.3] format check rejects unformatted source', () => {
    const probePath = join(repoRoot, 'packages/core/src/__format_probe__.ts');
    writeFileSync(probePath, 'const badlyFormatted={a:1,   b:2};\n', 'utf8');
    try {
      const result = spawnSync(
        'pnpm',
        ['exec', 'prettier', '--check', 'packages/core/src/__format_probe__.ts'],
        {
          cwd: repoRoot,
          encoding: 'utf8',
        },
      );
      expect(result.status).not.toBe(0);
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
      expect(output).toContain('__format_probe__.ts');
    } finally {
      rmSync(probePath, { force: true });
    }
    expect(existsSync(probePath)).toBe(false);
  });
});

describe('[TDS-2] toolchain pinning', () => {
  it('[TDS-2] corepack activates the pinned pnpm version', (ctx) => {
    const root = readJson('package.json');
    const pinned = root['packageManager'];
    expect(typeof pinned).toBe('string');
    const version = (pinned as string).split('@')[1];

    const result = spawnSync('pnpm', ['--version'], { cwd: repoRoot, encoding: 'utf8' });
    if (result.error !== undefined && (result.error as NodeJS.ErrnoException).code === 'ENOENT') {
      ctx.skip();
      return;
    }
    expect(result.status).toBe(0);
    expect((result.stdout ?? '').trim()).toBe(version);
  });

  it('[TDS-2] engines rejects Node below 22', () => {
    const root = readJson('package.json');
    const engines = root['engines'] as Record<string, string>;
    expect(engines['node']).toBe('>=22');

    const major = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10);
    expect(major, 'executing Node must satisfy the declared range').toBeGreaterThanOrEqual(22);
  });
});
