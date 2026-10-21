import { describe, expect, it } from 'vitest';

import { compareVersions, isValidRange, parseVersion, satisfies } from './semver.js';

const version = (text: string) => {
  const parsed = parseVersion(text);
  if (parsed === null) throw new Error(`unexpected invalid version: ${text}`);
  return parsed;
};

describe('[CONT-13.1] semantic versions', () => {
  it('[CONT-13.1] versions compare by major, minor, then patch', () => {
    expect(compareVersions(version('1.2.3'), version('1.2.4'))).toBeLessThan(0);
    expect(compareVersions(version('1.3.0'), version('1.2.9'))).toBeGreaterThan(0);
    expect(compareVersions(version('2.0.0'), version('1.9.9'))).toBeGreaterThan(0);
    expect(compareVersions(version('1.2.3'), version('1.2.3'))).toBe(0);
  });

  it('[CONT-13.1] a prerelease sorts below its release', () => {
    expect(compareVersions(version('1.0.0-alpha'), version('1.0.0'))).toBeLessThan(0);
    expect(compareVersions(version('1.0.0-alpha.1'), version('1.0.0-alpha.2'))).toBeLessThan(0);
  });

  it('[CONT-13.1] conjunction ranges are satisfied only when all comparators match', () => {
    expect(satisfies(version('1.4.0'), '>=1.0.0 <2.0.0')).toBe(true);
    expect(satisfies(version('2.0.0'), '>=1.0.0 <2.0.0')).toBe(false);
  });

  it('[CONT-13.1] caret, tilde, exact, wildcard, and alternative ranges are supported', () => {
    expect(satisfies(version('1.9.0'), '^1.2.3')).toBe(true);
    expect(satisfies(version('2.0.0'), '^1.2.3')).toBe(false);
    expect(satisfies(version('1.2.9'), '~1.2.3')).toBe(true);
    expect(satisfies(version('1.3.0'), '~1.2.3')).toBe(false);
    expect(satisfies(version('1.2.3'), '=1.2.3')).toBe(true);
    expect(satisfies(version('1.2.4'), '=1.2.3')).toBe(false);
    expect(satisfies(version('0.0.1'), '*')).toBe(true);
    expect(satisfies(version('3.0.0'), '^1.0.0 || ^3.0.0')).toBe(true);
    expect(satisfies(version('2.0.0'), '^1.0.0 || ^3.0.0')).toBe(false);
  });

  it('[CONT-13.1] unsupported ranges are reported as invalid, never satisfied', () => {
    expect(isValidRange('not-a-range')).toBe(false);
    expect(satisfies(version('1.0.0'), 'not-a-range')).toBe(false);
  });
});
