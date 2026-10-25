/**
 * Unit tests for presentation-package validation (PIC-19): one test per spec
 * scenario over parsed in-memory files.
 *
 * Source: PIC-19
 */
import { describe, expect, it } from 'vitest';

import { validatePresentationPackage } from './validate.js';
import type { ParsedFile } from '../package/parse.js';

const file = (document: unknown, path = 'presentation.yaml'): readonly ParsedFile[] => [
  { package: 'test.presentation', path, document: document as never },
];

const mapping = (overrides: Record<string, unknown> = {}) => ({
  target_definition: 'test.entity.a',
  localization: { name_key: 'test.entity.a', description_key: 'test.entity.a' },
  visual: { model_key: 'test.model.a', icon_key: 'test.icon.a', fallback_shape: 'box' },
  ...overrides,
});

const base = (overrides: Record<string, unknown> = {}) => ({
  presentation_mapping: [mapping()],
  localization: {
    locale: 'en',
    entries: {
      'test.entity.a': 'Entity A',
      'test.model.a': 'Model A',
      'test.icon.a': 'Icon A',
    },
  },
  fallback: { shape: 'box', locale: 'en' },
  ...overrides,
});

const codes = (diagnostics: readonly { readonly code: string }[]): readonly string[] =>
  diagnostics.map((diagnostic) => diagnostic.code);

describe('[PIC-19] presentation package validation', () => {
  it('[PIC-19] a mapping targeting an absent definition is reported', () => {
    const result = validatePresentationPackage(file(base()), {
      simulationIds: new Map([['entity', new Set(['test.entity.other'])]]),
    });
    expect(codes(result)).toContain('presentation_target_missing');
    expect(result.find((d) => d.code === 'presentation_target_missing')?.severity).toBe('error');
  });

  it('[PIC-19] a simulation definition inside a presentation package is reported', () => {
    const result = validatePresentationPackage(
      file({ ...base(), resources: [{ id: 'test.resource.a' }] }),
    );
    expect(codes(result)).toContain('presentation_modifies_simulation');
  });

  it('[PIC-19] a malformed localization key is reported', () => {
    const result = validatePresentationPackage(
      file({
        ...base(),
        localization: { locale: 'en', entries: { 'not a valid key': 'X' } },
      }),
    );
    expect(codes(result)).toContain('presentation_invalid_key');
  });

  it('[PIC-19] a missing localization key warns', () => {
    const result = validatePresentationPackage(
      file(
        base({
          localization: { locale: 'en', entries: { 'test.entity.a': 'Entity A' } },
        }),
      ),
    );
    const finding = result.find((d) => d.code === 'presentation_key_missing');
    expect(finding?.severity).toBe('warning');
    expect(codes(result)).not.toContain('presentation_target_missing');
  });

  it('[PIC-19] a package without a global fallback warns', () => {
    const document = base();
    delete (document as { fallback?: unknown }).fallback;
    const result = validatePresentationPackage(file(document));
    const finding = result.find((d) => d.code === 'presentation_fallback_missing');
    expect(finding?.severity).toBe('warning');
  });

  it('[PIC-19] an unknown control command is reported', () => {
    const result = validatePresentationPackage(
      file(
        base({
          presentation_mapping: [
            mapping({
              controls: [{ command: 'TeleportEntity' }],
            }),
          ],
        }),
      ),
      { knownCommands: new Set(['SetEntityEnabled']) },
    );
    expect(codes(result)).toContain('presentation_invalid_command');
  });

  it('[PIC-19] a clean package reports no errors', () => {
    const result = validatePresentationPackage(file(base()), {
      simulationIds: new Map([['entity', new Set(['test.entity.a'])]]),
      knownCommands: new Set(['SetEntityEnabled']),
    });
    expect(result.filter((d) => d.severity === 'error')).toEqual([]);
  });
});
