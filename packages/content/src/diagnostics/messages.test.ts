/**
 * Unit tests for the diagnostic message catalogue and report builder
 * (CONT-15): one test per spec scenario.
 *
 * Source: CONT-15
 */
import { describe, expect, it } from 'vitest';

import { DIAGNOSTIC_CODES } from './catalogue.js';
import { DIAGNOSTIC_MESSAGES, formatReport, messageFor } from './messages.js';

describe('[CONT-15] diagnostic message catalogue', () => {
  it('[CONT-15] every catalogue code has a message', () => {
    for (const entry of DIAGNOSTIC_CODES) {
      const template = DIAGNOSTIC_MESSAGES[entry.code];
      expect(template, `missing message for ${entry.code}`).toBeTruthy();
      expect(template?.length ?? 0).toBeGreaterThan(10);
    }
    expect(Object.keys(DIAGNOSTIC_MESSAGES).length).toBe(DIAGNOSTIC_CODES.length);
  });

  it('[CONT-15] args are interpolated', () => {
    const message = messageFor({
      code: 'unsourceable_resource',
      severity: 'error',
      package: null,
      file: null,
      path: null,
      definition: 'test.recipe.a',
      args: { resource: 'test.resource.a' },
    });
    expect(message).toContain('test.resource.a');
  });

  it('[CONT-15] an unknown code falls back', () => {
    const message = messageFor({
      code: 'not_a_real_code',
      severity: 'warning',
      package: null,
      file: null,
      path: null,
      definition: null,
      args: {},
    });
    expect(message).toContain('not_a_real_code');
  });
});

describe('[CONT-15] validation report formats', () => {
  const error = {
    code: 'unsourceable_resource',
    severity: 'error' as const,
    package: 'test.game',
    file: 'content.yaml',
    path: null,
    definition: 'test.recipe.a',
    args: { resource: 'test.resource.a' },
  };
  const warning = {
    code: 'capability_deficit',
    severity: 'warning' as const,
    package: 'test.game',
    file: 'content.yaml',
    path: null,
    definition: 'test.recipe.b',
    args: { capability: 'test.cap.x' },
  };

  it('[CONT-15] the text report groups and summarises', () => {
    const report = formatReport([warning, error], { format: 'text' });
    const lines = report.split('\n');
    expect(lines[lines.length - 1]).toBe('summary: 1 error(s), 1 warning(s)');
    expect(report.indexOf('unsourceable_resource')).toBeLessThan(
      report.indexOf('capability_deficit'),
    );
    expect(report).toContain('test.resource.a');
  });

  it('[CONT-15] the JSON report carries messages and counts', () => {
    const report = JSON.parse(formatReport([error], { format: 'json' })) as {
      diagnostics: { code: string; message: string; args: Record<string, unknown> }[];
      summary: { errors: number; warnings: number };
    };
    expect(report.diagnostics[0]?.message).toContain('test.resource.a');
    expect(report.summary).toEqual({ errors: 1, warnings: 0 });
  });

  it('[CONT-15] reports do not change results', () => {
    const text = formatReport([warning, error], { format: 'text' });
    const json = formatReport([warning, error], { format: 'json' });
    for (const code of ['unsourceable_resource', 'capability_deficit']) {
      expect(text.includes(code)).toBe(json.includes(code));
    }
  });
});
