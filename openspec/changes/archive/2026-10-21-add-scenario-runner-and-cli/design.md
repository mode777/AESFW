# Design — add-scenario-runner-and-cli

## Context

`add-testkit-content-builders` (1.5) is archived: `@aesfw/testkit` compiles content through the real pipeline and exposes the harness. `@aesfw/host-node` is a stub with a `bin`-less entry. `add-abstract-capacity-locations` (1.8) provides `defaultWorldPlan`/`instantiateWorld`, and the harness provides `checkInvariants`. This document records the scenario model, the runner, and the CLI boundary.

## Goals / Non-Goals

**Goals:** the scenario format, the pure runner, and `aesfw validate`/`aesfw run`.

**Non-Goals:** command application (2.2), metric and expectation evaluation (M2+), golden update tooling (1.15), benchmarks (1.16), replay/save-diff (12.2), the browser host (2.6).

## Decisions

### D1 — Module layout

`packages/testkit/src/scenario/` holds `types.ts`, `parse.ts`, `runner.ts`, and `index.ts`, exported as `@aesfw/testkit/scenario`. `packages/host-node/src/cli.ts` holds `runCli` and the binary entry.

### D2 — Scenario model

`Scenario` mirrors VER-9.1: `id`, `requirements`, `content.packages`, `setup` (`seed`, `tickDurationMs`, `world`), `commands`, `run` (`ticks`, `hashInterval`, `invariants`), `golden`, and `expect`. `parseScenario(value: unknown)` validates the shape and returns `{ scenario, errors }`; it never throws for malformed input (TDS-23).

### D3 — Runner

`runScenario(scenario, content)` is pure: it builds a world with `createWorld(content.registry, setup)`, applies `defaultWorldPlan` with `instantiateWorld`, then for each tick clones the world, calls `step`, checks invariants on the clone/output pair, collects events, and records a checkpoint every `hashInterval` ticks. Commands and expectations are parsed but not applied or evaluated in this row (phases 01 and 31 are later rows); the report is the checkpoints, events, and findings.

### D4 — CLI boundary

`runCli(args, io)` takes an injected `CliIo` (`readPackage(dir): PackageSource`, `readFile(path): string | null`) so the command logic is testable without the file system; `main` wires the Node implementation. `validate` loads packages through `loadContent` and prints diagnostics as text or JSON. `run` parses the scenario YAML with `yaml`, loads the packages named by the scenario, calls `runScenario`, and prints the report; `--ticks` and `--hash-interval` override the scenario. The exit code is non-zero on a load error, a parse error, or any invariant finding.

### D5 — Purity

The runner lives in the pure `@aesfw/testkit`; it performs no I/O and uses no clock. The `yaml` dependency is added only to the shell package `@aesfw/host-node`, so no pure package gains a dependency (05 §27).

## Amendments and clarifications to 01–07

- None.

## Risks / Trade-offs

- [Commands and expectations are not applied] → 2.2 and M2+ own them; the runner's report is still the basis for 1.15 goldens.
- [Content packages are read from directories] → the host builds a `PackageSource`; the pure runner receives compiled content.

## Migration Plan

Additive testkit module, a `./scenario` export, and the host-node CLI. No goldens or saves exist. Rollback is reverting the change.

## Open Questions

None blocking.
