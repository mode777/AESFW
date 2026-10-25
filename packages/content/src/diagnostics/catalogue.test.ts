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

const loadFixture = (dir: string): ReturnType<typeof loadContent> => {
  const files: Record<string, string> = {};
  for (const entry of readdirSync(dir)) {
    if (entry.endsWith('.yaml')) {
      files[entry] = readFileSync(join(dir, entry), 'utf8');
    }
  }
  return loadContent([createMemorySource('test.invalid', files)], { strictness: 'strict' });
};

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

      const result = loadFixture(dir);
      for (const finding of expected) {
        expect(
          matches(finding, result.diagnostics as never),
          `${directory}: ${finding.code} not reported`,
        ).toBe(true);
      }
    }
  });

  it('[VER-10.2] each fixture fails the load with its code present', () => {
    for (const directory of fixtureDirectories()) {
      if (directory === 'composition_schema_violation') continue;
      const result = loadFixture(join(fixtureRoot, directory));
      expect(result.content, `${directory} unexpectedly loaded`).toBeNull();
      const codes = result.diagnostics.map((diagnostic) => diagnostic.code);
      expect(codes, `${directory} missing its own code`).toContain(directory);
    }
  });
});
