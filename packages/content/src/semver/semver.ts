/**
 * A dependency-free semantic-version subset (CONT-13.1). `@aesfw/core` has zero
 * runtime dependencies and 05 §27 discourages new ones in pure packages, so the
 * loader implements the comparators and ranges the manifest examples and
 * CONT-13 require. Unsupported range syntax is reported as invalid, never
 * silently mis-evaluated.
 *
 * Source: CONT-3, CONT-13.1
 */

/** A parsed semantic version. */
export interface Version {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease: readonly (string | number)[];
}

interface PartialVersion {
  readonly version: Version;
  /** 1 = major only, 2 = major.minor, 3 = full. */
  readonly precision: 1 | 2 | 3;
}

type ComparatorOp = '=' | '>' | '>=' | '<' | '<=';

interface Comparator {
  readonly op: ComparatorOp;
  readonly version: Version;
}

const VERSION_PATTERN =
  /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

const parsePrerelease = (text: string): readonly (string | number)[] =>
  text.split('.').map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));

const parsePartial = (text: string): PartialVersion | null => {
  const match = VERSION_PATTERN.exec(text.trim());
  if (match === null) return null;
  const major = Number(match[1]);
  const hasMinor = match[2] !== undefined;
  const hasPatch = match[3] !== undefined;
  const minor = hasMinor ? Number(match[2]) : 0;
  const patch = hasPatch ? Number(match[3]) : 0;
  const prerelease = match[4] !== undefined ? parsePrerelease(match[4]) : [];
  const precision: 1 | 2 | 3 = hasPatch ? 3 : hasMinor ? 2 : 1;
  return { version: { major, minor, patch, prerelease }, precision };
};

/**
 * Parses a version, treating missing minor or patch as zero. Returns `null`
 * for text that is not a version.
 *
 * Source: CONT-13.1
 */
export function parseVersion(text: string): Version | null {
  return parsePartial(text)?.version ?? null;
}

const comparePrerelease = (
  left: readonly (string | number)[],
  right: readonly (string | number)[],
): number => {
  if (left.length === 0 && right.length === 0) return 0;
  if (left.length === 0) return 1;
  if (right.length === 0) return -1;
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const a = left[index];
    const b = right[index];
    if (a === b) continue;
    if (typeof a === 'number' && typeof b === 'number') return a < b ? -1 : 1;
    if (typeof a === 'number') return -1;
    if (typeof b === 'number') return 1;
    if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : 1;
    return 0;
  }
  if (left.length === right.length) return 0;
  return left.length < right.length ? -1 : 1;
};

/**
 * Compares two versions: negative when `left < right`, zero when equal,
 * positive when `left > right`. A prerelease sorts below its release.
 *
 * Source: CONT-13.1
 */
export function compareVersions(left: Version, right: Version): number {
  if (left.major !== right.major) return left.major < right.major ? -1 : 1;
  if (left.minor !== right.minor) return left.minor < right.minor ? -1 : 1;
  if (left.patch !== right.patch) return left.patch < right.patch ? -1 : 1;
  return comparePrerelease(left.prerelease, right.prerelease);
}

const version = (major: number, minor: number, patch: number): Version => ({
  major,
  minor,
  patch,
  prerelease: [],
});

const caretUpper = (partial: PartialVersion): Version => {
  const { major, minor, patch } = partial.version;
  if (major > 0) return version(major + 1, 0, 0);
  if (minor > 0) return version(0, minor + 1, 0);
  return version(0, 0, patch + 1);
};

const tildeUpper = (partial: PartialVersion): Version =>
  partial.precision >= 2
    ? version(partial.version.major, partial.version.minor + 1, 0)
    : version(partial.version.major + 1, 0, 0);

const partialUpper = (partial: PartialVersion): Version =>
  partial.precision >= 2
    ? version(partial.version.major, partial.version.minor + 1, 0)
    : version(partial.version.major + 1, 0, 0);

const expandTerm = (term: string): Comparator[] | null => {
  const match = /^(\^|~|>=|<=|>|<|=)?\s*(.+)$/.exec(term);
  if (match === null) return null;
  const op = match[1] ?? '';
  const rest = (match[2] ?? '').trim();
  if (rest === '' || rest === '*' || rest.toLowerCase() === 'x') return [];
  const partial = parsePartial(rest);
  if (partial === null) return null;
  switch (op) {
    case '^':
      return [
        { op: '>=', version: partial.version },
        { op: '<', version: caretUpper(partial) },
      ];
    case '~':
      return [
        { op: '>=', version: partial.version },
        { op: '<', version: tildeUpper(partial) },
      ];
    case '>':
    case '>=':
    case '<':
    case '<=':
      return [{ op, version: partial.version }];
    case '=':
    case '':
      if (partial.precision === 3) return [{ op: '=', version: partial.version }];
      return [
        { op: '>=', version: partial.version },
        { op: '<', version: partialUpper(partial) },
      ];
    default:
      return null;
  }
};

const parseRange = (range: string): Comparator[][] | null => {
  const alternatives = range.split('||');
  const parsed: Comparator[][] = [];
  for (const alternative of alternatives) {
    const terms = alternative.split(/[\s,]+/).filter((term) => term !== '');
    const comparators: Comparator[] = [];
    for (const term of terms) {
      const expanded = expandTerm(term);
      if (expanded === null) return null;
      comparators.push(...expanded);
    }
    parsed.push(comparators);
  }
  return parsed;
};

const matchesComparator = (candidate: Version, comparator: Comparator): boolean => {
  const order = compareVersions(candidate, comparator.version);
  switch (comparator.op) {
    case '=':
      return order === 0;
    case '>':
      return order > 0;
    case '>=':
      return order >= 0;
    case '<':
      return order < 0;
    case '<=':
      return order <= 0;
  }
};

/**
 * True when `range` is syntactically supported by this module.
 *
 * Source: CONT-13.1
 */
export function isValidRange(range: string): boolean {
  return parseRange(range) !== null;
}

/**
 * True when `candidate` satisfies `range`. An unsupported range is `false`.
 *
 * Source: CONT-13.1
 */
export function satisfies(candidate: Version, range: string): boolean {
  const parsed = parseRange(range);
  if (parsed === null) return false;
  return parsed.some((comparators) =>
    comparators.every((comparator) => matchesComparator(candidate, comparator)),
  );
}
