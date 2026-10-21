# Proposal

## Why

Roadmap 08, M1 item 1.15 (`add-golden-basic-loop`, capability `testkit/scenarios`, size S). M1's exit criterion is SCN-01: the closed loop of 01 §23.1 and the 03 §14 example runs headlessly from YAML content with invariants after every tick and a golden hash. This row adds the `demo-basic-loop` fixture, the SCN-01 scenario, the golden hashes, and the `golden:update` tool. Depends on: `add-population-growth` (1.13) and `add-scenario-runner-and-cli` (1.14) — archived 2026-10-21.

## What Changes

- Add the theme-free fixture content package `fixtures/content/demo-basic-loop` from CONT-14: a source, a producer, and a residence at one abstract-capacity location.
- Add the SCN-01 scenario `fixtures/scenarios/basic_loop.yaml` (600 ticks, hash interval 1, invariants on) and its golden hashes.
- Instantiate content entity definitions in the scenario runner through a content-to-component resolver so the fixture's loop runs.
- Add the `pnpm golden:update <scenario>` tool of VER-9.4 (never run by CI).
- Add the SCN-01 golden test.
- No **BREAKING** changes. **HASH-CHANGING**: the scenario runner now instantiates content entities; this only affects scenario runs (no earlier goldens exist).

## Capabilities

### New Capabilities

- `testkit/scenarios`: the SCN-01 fixture content, the basic-loop scenario and its golden hashes, and the golden update tool.

## Impact

- **Packages:** `fixtures/content/demo-basic-loop` and `fixtures/scenarios/**` are new; `@aesfw/testkit/scenario` gains the content entity resolver; `tools/golden` and the root `golden:update` script are new; `@aesfw/host-node` gains the SCN-01 golden test. No pure-package dependency is added.
- **Tick phases:** all M1 phases run together for the first time. **Commands:** none (SCN-01 needs none). **Golden policy:** the golden file records the `fnv1a64-canonical-json-v1` algorithm tag; it changes only on purpose (VER-9.4).
- **Out of scope:** command application (2.2), metrics and expectations (M2+), the browser client (2.x), the other scenarios (SCN-02 to SCN-18).
- **Verification impact:** `pnpm test` gains the SCN-01 golden test.
