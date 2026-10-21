/**
 * TDS-4.3 dependency rules, enforced in CI as the VER-15.3 dependency stage.
 *
 * Findings name the offending file and the violated rule (foundation/purity).
 * Entry specifiers resolve through the package exports maps to `dist/`, so
 * resolved-path rules anchor on both `src/` and `dist/`. Specifiers that
 * reach into a package beyond its declared exports (`@aesfw/core/src/det/hash`)
 * stay unresolved and appear as modules whose path is the raw specifier; the
 * specifier-based rule 6 halves reject exactly those. Allowed specifier forms
 * are the package root and the declared subpath exports (`@aesfw/core/testing`,
 * `@aesfw/host-web/worker`, `@aesfw/host-web/client`). A package that grows a
 * new subpath export must extend `SUBPATH_ENTRIES` here in the same change.
 */

/** Packages of TDS-4.2 that other packages can import. */
const PACKAGES = ['core', 'content', 'protocol', 'app', 'testkit', 'host-web', 'host-node'];

/** Declared subpath exports per package (besides the package root). */
const SUBPATH_ENTRIES = {
  core: ['testing'],
  testkit: ['scenario'],
  'host-web': ['worker', 'client'],
};

/** Entry file paths per package, relative to the package directory. */
const ENTRY_FILES = {
  core: '(src|dist)/(index|testing)\\.(d\\.)?[cm]?[jt]sx?$',
  testkit: '(src|dist)/(index|scenario/index)\\.(d\\.)?[cm]?[jt]sx?$',
  'host-web': '(src|dist)/(index|worker/index|client/index)\\.(d\\.)?[cm]?[jt]sx?$',
};

const entryFilePattern = (name) => ENTRY_FILES[name] ?? '(src|dist)/index\\.(d\\.)?[cm]?[jt]sx?$';

/** TDS-4.3 rule 6: cross-package imports use package entry points only. */
const entryPointOnlyRules = PACKAGES.flatMap((name) => {
  const subpaths = SUBPATH_ENTRIES[name] ?? [];
  const specifierRule = {
    name: `entry-point-only-${name}`,
    severity: 'error',
    comment: `TDS-4.3 rule 6: only the declared entry points of @aesfw/${name} may be imported across packages.`,
    from: { path: '^(?!fixtures/)' },
    to: {
      path: `^@aesfw/${name}/`,
      ...(subpaths.length > 0 ? { pathNot: subpaths.map((sub) => `^@aesfw/${name}/${sub}$`) } : {}),
    },
  };
  const resolvedRule = {
    name: `entry-point-file-${name}`,
    severity: 'error',
    comment: `TDS-4.3 rule 6: only ${name}'s package entry files may be reached across packages.`,
    from: { path: `^(?!(packages/${name}/|fixtures/))` },
    to: { path: `^packages/${name}/(src|dist)/`, pathNot: entryFilePattern(name) },
  };
  return [specifierRule, resolvedRule];
});

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'packages-no-reference-imports',
      severity: 'error',
      comment: 'TDS-4.3 rule 1: packages/** must not import from reference/**.',
      from: { path: '^packages/' },
      to: { path: '^reference/' },
    },
    {
      name: 'packages-no-fixtures-imports',
      severity: 'error',
      comment: 'TDS-4.3 rule 1: packages/** must not import from fixtures/**.',
      from: { path: '^packages/' },
      to: { path: '^fixtures/' },
    },
    {
      name: 'core-isolation',
      severity: 'error',
      comment: 'TDS-4.3 rule 2: @aesfw/core must not import any other package.',
      from: { path: '^packages/core/' },
      to: { path: '^packages/(?!core/)' },
    },
    {
      name: 'protocol-isolation',
      severity: 'error',
      comment: 'TDS-4.3 rule 3: @aesfw/protocol must not import any other package.',
      from: { path: '^packages/protocol/' },
      to: { path: '^packages/(?!protocol/)' },
    },
    {
      name: 'client-web-visibility',
      severity: 'error',
      comment:
        'TDS-4.3 rule 4: the reference client sees the simulation only through protocol DTOs and @aesfw/host-web/client.',
      from: { path: '^reference/client-web/' },
      to: { path: '^packages/(core|content|app)/' },
    },
    {
      name: 'pure-no-shell-imports',
      severity: 'error',
      comment: 'TDS-4.3 rule 5: pure packages must not import shell packages.',
      from: { path: '^packages/(core|content|protocol|app|testkit)/' },
      to: { path: '^packages/(host-web|host-node)/' },
    },
    ...entryPointOnlyRules,
    {
      name: 'core-testing-testkit-only',
      severity: 'error',
      comment:
        'TDS-4.3 rule 6: the @aesfw/core/testing entry is reserved for @aesfw/testkit (and tests); core itself may use it internally.',
      from: { path: '^(?!(packages/testkit/|packages/core/))' },
      to: {
        path: ['^packages/core/(src|dist)/testing', '^@aesfw/core/testing$'],
      },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      conditionNames: ['node', 'import', 'types', 'default'],
      exportsFields: ['exports'],
    },
  },
};
