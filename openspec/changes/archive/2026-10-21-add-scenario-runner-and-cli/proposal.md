# Proposal

## Why

Roadmap 08, M1 item 1.14 (`add-scenario-runner-and-cli`, capability `host/cli`, size M). Every milestone ends with a scenario, and M1's exit criterion is SCN-01. Without a pure scenario runner and a headless CLI, scenarios can only be hand-written Vitest tests, and the golden hashes of 1.15 cannot be produced or checked. This row delivers the scenario format, the pure runner `@aesfw/testkit/scenario`, and the `aesfw validate` and `aesfw run` commands. Depends on: `add-testkit-content-builders` (1.5) — archived 2026-10-21.

## What Changes

- Add the scenario format of VER-9.1 as a pure model with `parseScenario` and `runScenario` in a new `@aesfw/testkit/scenario` entry point.
- `runScenario` creates a world from compiled content, instantiates the default world plan, runs the configured ticks with hash checkpoints, and checks invariants after every tick.
- Add `@aesfw/host-node`'s `aesfw validate` and `aesfw run` commands over a small injected I/O boundary, plus the `aesfw` binary.
- Add unit tests for parsing, the runner, and the CLI.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts (no goldens exist yet).

## Capabilities

### New Capabilities

- `host/cli`: the pure scenario runner and the `aesfw validate` and `aesfw run` commands.

## Impact

- **Packages:** `@aesfw/testkit` gains `src/scenario/**` and a `./scenario` export; `@aesfw/host-node` gains `src/cli.ts` and a `bin` entry, and adds the `yaml` dependency (shell package). No pure-package dependency is added.
- **Tick phases:** none. **Commands:** parsed but not applied (phase 01 is 2.2). **Expectations:** parsed; evaluation of metrics and events is deferred until metrics exist (phase 31, M2+).
- **Out of scope:** command application (2.2), metrics and expectation evaluation (M2+), golden update tooling (`add-golden-basic-loop`, 1.15), benchmarks (`add-benchmark-harness`, 1.16), replay and save-diff (12.2), the browser host (2.6).
- **Verification impact:** `pnpm test` gains scenario-runner and CLI tests.
