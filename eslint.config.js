import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

/**
 * TDS-5.3 forbidden ambient APIs for pure packages (design D2). Each entry
 * carries the TDS citation so lint findings identify the violated rule.
 */
const restrictedGlobal = (name) => ({
  name,
  message: `TDS-5.3: '${name}' is forbidden in pure packages.`,
});

const purePackageGlobals = [
  'Date',
  'performance',
  'setTimeout',
  'setInterval',
  'queueMicrotask',
  'requestAnimationFrame',
  'console',
  'Intl',
  'globalThis',
  'window',
  'self',
  'process',
  'fetch',
  'crypto',
  'Promise',
].map(restrictedGlobal);

const restrictedProperty = (object, property) => ({
  object,
  property,
  message: `TDS-5.3: '${object}.${property}' is forbidden in pure packages.`,
});

/** Restricts a property on every receiver. */
const restrictedPropertyEverywhere = (property) => ({
  property,
  message: `TDS-5.3: '${property}' is forbidden in pure packages.`,
});

const purePackageProperties = [
  restrictedProperty('Math', 'random'),
  restrictedProperty('Date', 'now'),
  restrictedProperty('Date', 'parse'),
  restrictedProperty('crypto', 'getRandomValues'),
  restrictedPropertyEverywhere('toLocaleString'),
  restrictedPropertyEverywhere('localeCompare'),
];

const restrictedSyntax = (selector) => ({
  selector,
  message: `TDS-5.3: '${selector}' is forbidden in pure packages.`,
});

const purePackageSyntax = [
  restrictedSyntax('AwaitExpression'),
  restrictedSyntax('FunctionDeclaration[async=true]'),
  restrictedSyntax('FunctionExpression[async=true]'),
  restrictedSyntax('ArrowFunctionExpression[async=true]'),
  restrictedSyntax('ForInStatement'),
  restrictedSyntax('NewExpression[callee.name="Promise"]'),
  restrictedSyntax('CallExpression[callee.property.name="sort"][arguments.length=0]'),
  restrictedSyntax('CallExpression[callee.name="sort"][arguments.length=0]'),
  restrictedSyntax('ImportExpression[source.type!="Literal"]'),
  restrictedSyntax('Program > VariableDeclaration[kind="let"]'),
  restrictedSyntax('Program > ExportNamedDeclaration > VariableDeclaration[kind="let"]'),
];

/** TDS-4.3 rules 5 and 6 as an ESLint belt around dependency-cruiser. */
const purePackageImports = {
  patterns: [
    {
      group: ['@aesfw/*/src', '@aesfw/*/src/**'],
      message: 'TDS-4.3 rule 6: import package entry points only, never another package src tree.',
    },
    {
      group: ['@aesfw/host-web', '@aesfw/host-web/*'],
      message: 'TDS-4.3 rule 5: pure packages must not import shell packages.',
    },
    {
      group: ['@aesfw/host-node', '@aesfw/host-node/*'],
      message: 'TDS-4.3 rule 5: pure packages must not import shell packages.',
    },
    {
      group: ['@aesfw-ref/**'],
      message: 'TDS-4.3 rule 1: packages must not import the reference implementation.',
    },
  ],
};

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      'vitest.config.ts',
      'vitest.browser.config.ts',
      'playwright.config.ts',
      '**/vite.config.ts',
      '**/e2e/**',
      'tools/**',
    ],
  },
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Purity restrictions for pure-package sources (TDS-5.3). Test files are
    // exempt: they must be able to reference trapped APIs to assert that they
    // throw, and the runtime net for tests is the purity setup file.
    files: ['packages/{core,content,protocol,app,testkit}/src/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-globals': ['error', ...purePackageGlobals],
      'no-restricted-properties': ['error', ...purePackageProperties],
      'no-restricted-syntax': ['error', ...purePackageSyntax],
      'no-restricted-imports': ['error', purePackageImports],
    },
  },
  { files: ['**/*.ts'], extends: [prettier] },
);
