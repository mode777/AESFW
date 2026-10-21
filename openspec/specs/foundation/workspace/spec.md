# foundation/workspace Specification

## Purpose

Establishes the AESFW monorepo foundation: the workspace and package layout of TDS-4.2, the strict TypeScript build, the shared toolchain commands, and the CI pipeline skeleton that every later roadmap row builds on.

## Requirements

### Requirement: Workspace package inventory
The workspace SHALL be a pnpm monorepo containing exactly the packages of TDS-4.2 under the layout of TDS-4.1: `@aesfw/core`, `@aesfw/content`, `@aesfw/app`, `@aesfw/protocol`, `@aesfw/testkit`, `@aesfw/host-web`, `@aesfw/host-node` in `packages/`, and `@aesfw-ref/content`, `@aesfw-ref/client-web` in `reference/`, each resolvable by its declared package name.

Source: TDS-4.1, TDS-4.2

#### Scenario: All packages resolve after install
- **WHEN** `pnpm install` completes and each of the nine package names is resolved from a workspace consumer
- **THEN** all nine resolve to their workspace directory without registry access, and no package other than these nine exists under `packages/` or `reference/`

### Requirement: Host-web dual entry points
`@aesfw/host-web` SHALL expose the two entry points of TDS-4.2, `@aesfw/host-web/worker` and `@aesfw/host-web/client`, each resolving to its own TypeScript entry file.

Source: TDS-4.2

#### Scenario: Host-web entry points exist
- **WHEN** the export maps of `@aesfw/host-web` are inspected
- **THEN** both `@aesfw/host-web/worker` and `@aesfw/host-web/client` resolve to their own TypeScript entry files

### Requirement: Core has zero runtime dependencies
`@aesfw/core` SHALL declare no runtime dependencies.

Source: TDS-2, TDS-4.2

#### Scenario: Core has zero runtime dependencies
- **WHEN** the `dependencies` field of `@aesfw/core` is read
- **THEN** it is absent or empty, and no workspace package name or library appears in it

### Requirement: Pure package dependency bounds
The pure packages (`core`, `content`, `app`, `protocol`, `testkit`) SHALL declare only the dependencies their TDS-4.2 rows permit and SHALL NOT depend on any shell or reference package (`host-web`, `host-node`, `@aesfw-ref/content`, `@aesfw-ref/client-web`).

Source: TDS-4.2, TDS-4.3

#### Scenario: Pure packages declare no shell or reference dependencies
- **WHEN** the manifests of `@aesfw/core`, `@aesfw/content`, `@aesfw/app`, `@aesfw/protocol`, and `@aesfw/testkit` are read
- **THEN** none lists `@aesfw/host-web`, `@aesfw/host-node`, `@aesfw-ref/content`, or `@aesfw-ref/client-web` as a dependency

### Requirement: Reference client dependency bounds
`@aesfw-ref/client-web` SHALL declare no framework dependencies other than `@aesfw/protocol` and `@aesfw/host-web/client`.

Source: TDS-4.2, TDS-4.3

#### Scenario: Reference client declares only permitted sources
- **WHEN** the manifest of `@aesfw-ref/client-web` is read
- **THEN** its framework dependencies are limited to `@aesfw/protocol` and `@aesfw/host-web/client`

### Requirement: Whole-workspace project-references build
The workspace SHALL type-check and build with a single `tsc --build` over a project-references graph rooted at the workspace `tsconfig.json`, targeting ES2022 modules.

Source: TDS-2

#### Scenario: Whole-workspace type-check passes on stubs
- **WHEN** `pnpm type-check` (equivalently `tsc --build`) runs on the fresh stub workspace
- **THEN** it exits 0 and emits build info for every package project

### Requirement: Strict compiler flags everywhere
`tsconfig.base.json` SHALL enable the TDS-25 flags (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `isolatedModules`) and forbid `any`, and every package configuration SHALL inherit them without reverting any flag.

Source: TDS-25

#### Scenario: Strict flags are inherited everywhere
- **WHEN** the `tsconfig.json` of each package is inspected
- **THEN** it extends `tsconfig.base.json` and none of the packages reverts a TDS-25 strict flag

### Requirement: Pure package environment isolation
Pure packages SHALL compile without DOM, WebWorker, or Node runtime typings; shell packages MAY include them.

Source: TDS-2, TDS-4.2

#### Scenario: Pure packages compile without ambient runtime typings
- **WHEN** the compiler options of the pure packages are inspected
- **THEN** no pure package adds `DOM`, `WebWorker`, or `node` library/type typings

### Requirement: Workspace toolchain commands
The workspace root SHALL provide the scripts `build`, `type-check`, `format`, `format:check` (Prettier), `lint` (ESLint flat config), `test` (Vitest, Node mode, all packages), and `verify` aggregating format check, lint, type-check, and test; lint and format SHALL cover all package sources and tests.

Source: TDS-2, TDS-25, VER-15.3

#### Scenario: Fresh install to green verify
- **WHEN** a clean checkout runs `corepack enable`, `pnpm install`, then `pnpm verify`
- **THEN** format check, lint, type-check, and tests all exit 0 with no package skipped

### Requirement: Test command reaches every package
Running `pnpm test` SHALL execute Vitest in every package project and exit 0 only when all report success.

Source: TDS-2, VER-15.3

#### Scenario: Test command reaches every package
- **WHEN** `pnpm test` runs
- **THEN** Vitest executes in every package that has a test setup, reporting zero failures

### Requirement: Format check rejects unformatted source
`pnpm format:check` SHALL exit non-zero and name every file that violates the Prettier configuration.

Source: TDS-2, VER-15.3

#### Scenario: Format check rejects unformatted source
- **WHEN** a source file is modified to violate the Prettier configuration and `pnpm format:check` runs
- **THEN** the command exits non-zero and names the offending file

### Requirement: CI pipeline skeleton
The repository SHALL define a CI pipeline following the stage order of VER-15.3 — install (frozen lockfile) → format check → lint → type-check → unit tests — triggered on pushes and pull requests. Stages owned by later changes SHALL be absent or explicitly skipped without failing the pipeline until their owning change lands.

Source: VER-15.3

#### Scenario: CI stages run in specification order
- **WHEN** the CI workflow definition is inspected
- **THEN** install uses a frozen lockfile and the format, lint, type-check, and test stages execute in VER-15.3 order

#### Scenario: Later stages do not fail CI
- **WHEN** CI runs on the stub workspace
- **THEN** the pipeline is green and reports no failure from a stage owned by a later roadmap change

### Requirement: Toolchain version pinning
The workspace SHALL pin Node.js LTS ≥ 22 and pnpm via the `packageManager` field for corepack, so that any conforming machine obtains the same toolchain from the repository alone.

Source: TDS-2

#### Scenario: Corepack activates the pinned pnpm
- **WHEN** a machine with corepack enabled runs `pnpm --version` in the repository
- **THEN** the version reported equals the `packageManager` declaration

#### Scenario: Unsupported Node is rejected
- **WHEN** `pnpm install` runs under a Node version below 22 with engine checks enforced
- **THEN** installation fails with an engine-incompatibility error naming the required range
