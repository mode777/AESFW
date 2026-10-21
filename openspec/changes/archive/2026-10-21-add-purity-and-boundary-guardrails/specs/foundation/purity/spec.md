# foundation/purity — Spec Delta

## Purpose

The automated purity and boundary guardrails of the framework: dependency rules between packages, restricted ambient APIs and syntax in pure packages, theme-freedom of framework source and fixtures, ambient-API traps in pure-package test runs, and the deep-freeze helper used by test builds. They make violations of TDS-4.3 and TDS-5 fail CI instead of surviving review.

## ADDED Requirements

### Requirement: Package boundary enforcement
The repository tooling SHALL run a dependency check on every `pnpm verify` and in the CI dependency stage, the check SHALL fail on every module dependency edge forbidden by TDS-4.3, and each finding SHALL name the offending file and the violated rule. The forbidden edges are enumerated in the scenarios below.

Source: TDS-4.3, TDS-5.5, VER-15.3

#### Scenario: Packages importing reference are rejected
- **WHEN** a module `packages/core/src/demo.ts` contains `import … from '@aesfw-ref/client-web'`
- **THEN** the dependency check exits non-zero and reports that file and the framework/reference boundary rule

#### Scenario: Packages importing fixtures are rejected
- **WHEN** a module `packages/app/src/loader.ts` contains an import whose resolved path is under `fixtures/`
- **THEN** the dependency check exits non-zero and reports that file and the fixture-boundary rule

#### Scenario: Core importing another package is rejected
- **WHEN** `packages/core/src/index.ts` contains `import … from '@aesfw/content'`
- **THEN** the dependency check exits non-zero and reports the core-isolation rule

#### Scenario: Protocol importing another package is rejected
- **WHEN** `packages/protocol/src/index.ts` contains `import … from '@aesfw/core'`
- **THEN** the dependency check exits non-zero and reports the protocol-isolation rule

#### Scenario: Reference client importing framework internals is rejected
- **WHEN** `reference/client-web/src/main.ts` imports `@aesfw/core`, `@aesfw/content`, or `@aesfw/app`
- **THEN** the dependency check exits non-zero and reports the client-visibility rule

#### Scenario: Pure package importing a shell package is rejected
- **WHEN** `packages/testkit/src/index.ts` contains `import … from '@aesfw/host-node'`
- **THEN** the dependency check exits non-zero and reports the purity-direction rule

#### Scenario: Compliant dependency graph passes
- **WHEN** the dependency check runs on the workspace as scaffolded by `setup-workspace` (all imports among the nine packages follow TDS-4.2 "may depend on")
- **THEN** it exits zero with no findings

### Requirement: Entry-point-only cross-package imports
The dependency check SHALL reject any cross-package import that reaches into another package's `src/` tree instead of the package entry point, and SHALL reject imports of `@aesfw/core/testing` from any module except `@aesfw/testkit` sources and test files (TDS-4.3 rule 6).

Source: TDS-4.3, TDS-10.3

#### Scenario: Deep source import is rejected
- **WHEN** `packages/app/src/session.ts` contains `import … from '@aesfw/core/src/det/hash'`
- **THEN** the dependency check exits non-zero and reports the entry-point rule for that file

#### Scenario: Core testing entry is allowed for testkit
- **WHEN** `packages/testkit/src/harness.ts` contains `import … from '@aesfw/core/testing'`
- **THEN** the dependency check exits zero for that file

#### Scenario: Core testing entry is rejected elsewhere
- **WHEN** `packages/app/src/session.ts` contains `import … from '@aesfw/core/testing'`
- **THEN** the dependency check exits non-zero and reports the testing-entry rule for that file

### Requirement: Ambient API restrictions in pure packages
Lint SHALL report an error, failing `pnpm lint`, for any use in the sources of the pure packages (`core`, `content`, `protocol`, `app`, `testkit`) of the TDS-5.3 forbidden APIs: `Math.random`, `crypto` randomness, `Date`, `performance`, timers, `queueMicrotask`, `requestAnimationFrame`, `console`, `Intl`, `toLocaleString`, `localeCompare`, `globalThis`, `window`, `self`, `process`, `fetch`, and dynamic `import()` with computed specifiers.

Source: TDS-5.3, TDS-5.5

#### Scenario: Clock and randomness APIs are rejected
- **WHEN** `packages/core/src/demo.ts` calls `Math.random()` or `Date.now()`
- **THEN** `pnpm lint` exits non-zero and reports a restricted-global or restricted-property error for each call

#### Scenario: Diagnostics and environment globals are rejected
- **WHEN** `packages/content/src/demo.ts` references `console`, `process`, `globalThis`, or `window`
- **THEN** `pnpm lint` exits non-zero and reports a restricted-global error for each reference

#### Scenario: Locale-dependent APIs are rejected
- **WHEN** `packages/protocol/src/demo.ts` uses `Intl.NumberFormat`, `value.toLocaleString()`, or `a.localeCompare(b)`
- **THEN** `pnpm lint` exits non-zero and reports a restricted-global or restricted-property error for each use

#### Scenario: Kernel asynchrony is rejected
- **WHEN** `packages/core/src/demo.ts` declares an `async` function, uses `await`, or constructs a `Promise`
- **THEN** `pnpm lint` exits non-zero and reports a restricted-syntax error for each construct

#### Scenario: Comparator-less sort and for-in are rejected
- **WHEN** `packages/app/src/demo.ts` evaluates `items.sort()` or iterates `for (const key in mapLike)`
- **THEN** `pnpm lint` exits non-zero and reports a restricted-syntax error for each construct

#### Scenario: Compliant pure-package source passes
- **WHEN** a pure-package source file sorts only with an explicit total-order comparator callback and uses none of the restricted APIs
- **THEN** `pnpm lint` reports no finding for that file

### Requirement: Theme-free framework source and fixtures
Lint SHALL fail when any file under `packages/**` or `fixtures/**` contains a reference-package identifier (`ref.`), a reference code literal (`P1`, `AK1`, `S1`), or reference setting terminology, and SHALL accept identifiers in the `test.*` and `demo.*` namespaces; files under `reference/**` are exempt.

Source: TDS-4.3 rule 7, TDS-5.5

#### Scenario: Reference identifier literal in fixtures is rejected
- **WHEN** `fixtures/content/demo-basic-loop/package.yaml` declares an id `ref.wheat`
- **THEN** `pnpm lint` exits non-zero and reports the theme-free rule for that file

#### Scenario: Reference code literal in framework source is rejected
- **WHEN** `packages/core/src/demo.ts` contains the string literal `"P1"` or `"AK1"`
- **THEN** `pnpm lint` exits non-zero and reports the theme-free rule for that file

#### Scenario: Theme-free fixture namespaces pass
- **WHEN** a fixture declares ids `test.wheat` and `demo.basic-loop` and a framework source comment names `demo.*`
- **THEN** `pnpm lint` reports no theme-free finding for those files

#### Scenario: Reference packages are exempt
- **WHEN** `reference/content/src/ref.tier/package.yaml` contains `ref.` identifiers and reference codes
- **THEN** `pnpm lint` reports no theme-free finding for that file

### Requirement: Ambient-API traps in pure-package test runs
The pure packages' test projects SHALL run with trap replacements installed so that `Math.random`, `Date.now`, `performance.now`, and `crypto.getRandomValues` throw instead of returning values, making hidden ambient reads fail loudly inside tests.

Source: TDS-5.5

#### Scenario: Math.random throws in a core test
- **WHEN** a `packages/core` test calls `Math.random()`
- **THEN** the call throws instead of returning a number

#### Scenario: Date.now throws in a content test
- **WHEN** a `packages/content` test calls `Date.now()`
- **THEN** the call throws instead of returning a timestamp

#### Scenario: performance.now throws in an app test
- **WHEN** a `packages/app` test calls `performance.now()`
- **THEN** the call throws instead of returning a duration

#### Scenario: crypto.getRandomValues throws in a protocol test
- **WHEN** a `packages/protocol` test calls `crypto.getRandomValues(…)`
- **THEN** the call throws instead of filling the buffer

### Requirement: Deep-freeze helper for test builds
`@aesfw/core` SHALL export a deep-freeze helper that recursively freezes an object graph so that every nested object is frozen, with zero runtime dependencies added to `@aesfw/core`; test builds use it to freeze registries and other definition data against mutation (TDS-5.2, TDS-5.5).

Source: TDS-5.2, TDS-5.5

#### Scenario: Deep freeze covers nested levels
- **WHEN** a three-level test object `{ a: { b: { c: 1 } } }` is passed to the helper
- **THEN** the root object and the objects at `a` and `a.b` all report frozen

#### Scenario: Mutating a frozen nested property throws
- **WHEN** code assigns to a nested property of an object returned by the helper
- **THEN** the assignment throws a `TypeError` and the property keeps its previous value
