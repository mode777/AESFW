import { describe, expect, it } from 'vitest';
import { ERROR_CODES } from './codes.js';

describe('[TDS-16.3] command error-code registry', () => {
  it('[TDS-16.3] declares the revision-mismatch arguments', () => {
    expect(ERROR_CODES.state_revision_mismatch.arguments).toEqual(['expected', 'actual']);
  });

  it('[TDS-16.3] declares the unknown-entity argument', () => {
    expect(ERROR_CODES.unknown_entity.arguments).toEqual(['entity']);
  });

  it('[TDS-16.3] every code declares at least one argument name', () => {
    for (const code of Object.keys(ERROR_CODES)) {
      const spec = ERROR_CODES[code as keyof typeof ERROR_CODES];
      expect(spec.arguments.length).toBeGreaterThan(0);
    }
  });
});
