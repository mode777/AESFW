/**
 * Catalogue tests (06 §10.2): the diagnostic catalogue covers the pipeline's
 * codes, and every graph-stage code has exactly one invalid fixture under
 * `fixtures/content/invalid/<code>/` whose `expect.yaml` matches the load.
 *
 * Source: VER-10.2, CONT-11
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { parse as parseYaml } from 'yaml';

import { DIAGNOSTIC_CODES, GRAPH_VALIDATION_CODES } from './catalogue.js';
import { composeDefinitions } from '../composition/compose.js';
import { createMemorySource } from '../package/source.js';
import { loadContent } from '../registry/load.js';
import { validateCompositionCompatibility } from '../validation/composition.js';
import { validatePresentationPackage } from '../presentation/validate.js';

const fixtureRoot = fileURLToPath(
  new URL('../../../../fixtures/content/invalid/', import.meta.url),
);

interface Expectation {
  readonly code: string;
  readonly severity: string;
  readonly definition?: string | null;
  readonly path?: string | null;
}

const fixtureDirectories = (): readonly string[] =>
  readdirSync(fixtureRoot).filter((entry) => statSync(join(fixtureRoot, entry)).isDirectory());

const loadFixture = (
  dir: string,
  options: Record<string, unknown> = {},
): ReturnType<typeof loadContent> => {
  const files: Record<string, string> = {};
  for (const entry of readdirSync(dir)) {
    if (entry.endsWith('.yaml')) {
      files[entry] = readFileSync(join(dir, entry), 'utf8');
    }
  }
  return loadContent([createMemorySource('test.invalid', files)], {
    strictness: 'strict',
    ...options,
  });
};

/** Loads a fixture with the loader options its stage requires. */
const loadForCode = (code: string, dir: string): ReturnType<typeof loadContent> => {
  const design = new Set(
    DIAGNOSTIC_CODES.filter((entry) => entry.stage === 'design_intent').map((entry) => entry.code),
  );
  return design.has(code) ? loadFixture(dir, { design_intent: 'warning' }) : loadFixture(dir);
};

/** True when the code belongs to the design-intent stage. */
const isDesignIntent = (code: string): boolean =>
  DIAGNOSTIC_CODES.some((entry) => entry.stage === 'design_intent' && entry.code === code);

/** True when the code belongs to the determinism stage. */
const isDeterminism = (code: string): boolean =>
  DIAGNOSTIC_CODES.some((entry) => entry.stage === 'determinism' && entry.code === code);

/** True when the code belongs to the presentation stage. */
const isPresentation = (code: string): boolean =>
  DIAGNOSTIC_CODES.some((entry) => entry.stage === 'presentation' && entry.code === code);

const matches = (
  finding: Expectation,
  actual: readonly {
    code: string;
    severity: string;
    definition: string | null;
    path: string | null;
  }[],
): boolean =>
  actual.some(
    (diagnostic) =>
      diagnostic.code === finding.code &&
      diagnostic.severity === finding.severity &&
      (finding.definition === undefined ||
        finding.definition === null ||
        diagnostic.definition === finding.definition) &&
      (finding.path === undefined || finding.path === null || diagnostic.path === finding.path),
  );

describe('[VER-10.2] diagnostic catalogue', () => {
  it('[VER-10.2] codes are unique, sorted, and carry stage and description', () => {
    const codes = DIAGNOSTIC_CODES.map((entry) => entry.code);
    expect([...codes].sort()).toEqual(codes);
    expect(new Set(codes).size).toBe(codes.length);
    for (const entry of DIAGNOSTIC_CODES) {
      expect(entry.stage).toBeTruthy();
      expect(entry.description.length).toBeGreaterThan(10);
    }
  });

  it('[VER-10.2] every graph-stage code has exactly one invalid fixture', () => {
    const directories = new Set(fixtureDirectories());
    for (const code of GRAPH_VALIDATION_CODES) {
      expect(directories.has(code), `missing fixture for ${code}`).toBe(true);
    }
    const graphCodes = new Set(GRAPH_VALIDATION_CODES);
    for (const directory of directories) {
      expect(graphCodes.has(directory), `unexpected fixture ${directory}`).toBe(true);
    }
  });

  it('[VER-10.2] every fixture reports its expected diagnostics', () => {
    for (const directory of fixtureDirectories()) {
      const dir = join(fixtureRoot, directory);
      const expected = (
        parseYaml(readFileSync(join(dir, 'expect.yaml'), 'utf8')) as {
          expect: Expectation[];
        }
      ).expect;
      expect(expected.length).toBeGreaterThan(0);

      if (directory === 'composition_schema_violation') {
        // Merge directives cannot pass raw schema validation, so this code is
        // only reachable through the composition stage; the fixture exercises
        // compose + the compatibility check directly (design D8).
        const raw: unknown = parseYaml(readFileSync(join(dir, 'content.yaml'), 'utf8'));
        const composed = composeDefinitions(raw as never).definitions;
        const diagnostics = validateCompositionCompatibility(composed);
        for (const finding of expected) {
          expect(
            matches(finding, diagnostics as never),
            `${directory}: ${finding.code} not reported`,
          ).toBe(true);
        }
        continue;
      }

      if (isPresentation(directory)) {
        // Presentation packages are not definition documents; the fixture
        // exercises the presentation validator directly (design D4).
        const files = readdirSync(dir)
          .filter((entry) => entry.endsWith('.yaml') && entry !== 'expect.yaml')
          .map((entry) => ({
            package: `test.invalid.${directory}`,
            path: entry,
            document: parseYaml(readFileSync(join(dir, entry), 'utf8')) as never,
          }));
        const simulationIds = new Map([['entity', new Set(['test.entity.a'])]]);
        const knownCommands = new Set(['SetEntityEnabled']);
        const diagnostics = validatePresentationPackage(files, {
          simulationIds,
          knownCommands,
        });
        for (const finding of expected) {
          expect(
            matches(finding, diagnostics as never),
            `${directory}: ${finding.code} not reported`,
          ).toBe(true);
        }
        continue;
      }

      const result = loadForCode(directory, dir);
      for (const finding of expected) {
        expect(
          matches(finding, result.diagnostics as never),
          `${directory}: ${finding.code} not reported`,
        ).toBe(true);
      }
    }
  });

  it('[VER-10.2] graph fixtures fail the load, economic fixtures load with warnings', () => {
    const economic = new Set(
      DIAGNOSTIC_CODES.filter((entry) => entry.stage === 'economic').map((entry) => entry.code),
    );
    for (const directory of fixtureDirectories()) {
      if (directory === 'composition_schema_violation' || isPresentation(directory)) continue;
      const result = loadForCode(directory, join(fixtureRoot, directory));
      const codes = result.diagnostics.map((diagnostic) => diagnostic.code);
      expect(codes, `${directory} missing its own code`).toContain(directory);
      if (isDeterminism(directory)) {
        const finding = result.diagnostics.find((diagnostic) => diagnostic.code === directory);
        expect(finding?.severity, `${directory} should be an error`).toBe('error');
      } else if (economic.has(directory) || isDesignIntent(directory)) {
        expect(result.content, `${directory} should still load`).not.toBeNull();
        const finding = result.diagnostics.find((diagnostic) => diagnostic.code === directory);
        expect(finding?.severity, `${directory} should be a warning`).toBe('warning');
      } else {
        expect(result.content, `${directory} unexpectedly loaded`).toBeNull();
      }
    }
  });

  it('[VER-10.2] the design-intent valid fixture activates every idea', () => {
    const validDir = fileURLToPath(
      new URL('../../../../fixtures/content/valid/design-intent/', import.meta.url),
    );
    const result = loadFixture(validDir, { design_intent: 'warning' });
    const findings = result.diagnostics.filter((diagnostic) => isDesignIntent(diagnostic.code));
    expect(findings).toEqual([]);
    expect(result.content).not.toBeNull();
  });

  it('[CONT-11.6] shipped fixture packages report no economic findings', () => {
    const demoRoot = fileURLToPath(new URL('../../../../fixtures/content/', import.meta.url));
    const demos = readdirSync(demoRoot)
      .filter((entry) => entry.startsWith('demo-'))
      .sort();
    expect(demos.length).toBeGreaterThan(5);
    for (const demo of demos) {
      const dir = join(demoRoot, demo);
      if (!statSync(dir).isDirectory()) continue;
      const result = loadFixture(dir);
      const economic = result.diagnostics.filter((diagnostic) =>
        DIAGNOSTIC_CODES.some(
          (entry) => entry.stage === 'economic' && entry.code === diagnostic.code,
        ),
      );
      expect(economic, `${demo} has economic findings`).toEqual([]);
    }
  });
});
