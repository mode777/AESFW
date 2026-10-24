# Proposal

## Why

Roadmap 08, M8 item 8.5 (`add-golden-exploration`). SCN-05 — "exploration and establishment through transported cargo" — is the exit scenario of M8 (06 §9.3, §16): the exploration machinery of 8.2/8.3 has unit and gateway coverage but no committed golden proving the whole arc deterministically headless. This change adds the theme-free scenario fixture, its committed hashes, and the host-node golden test, completing the M8 exit criterion.

## What Changes

- The `demo-exploration` fixture gains a package-producing source entity and a second transport unit, so the scenario can declaratively load the establishment cost at the owner's home before traveling.
- New scenario `fixtures/scenarios/exploration_loop.yaml`: a route order loads 500 of the package resource at home; an explore order discovers the frontier; an establish order carries the cargo there, and phase 18 founds the location. 40 ticks, invariants on, hash interval 5.
- Committed golden `exploration_loop.hashes.json` and the `[VER-9.3][SCN-05]` host-node test (findings empty, discovery and establishment events observed, checkpoints equal, repeat run byte-identical).

## Capabilities

### Modified Capabilities

- `testkit/scenarios`: the SCN-05 fixture, golden, and intent tests.

## Impact

- **Packages:** `fixtures/` (fixture and scenario extensions), `@aesfw/core` (one line: a successful establishment marks the derived caches dirty, closing an INV-20 gap the scenario exposed), `packages/host-node` (golden test).
- **Tick phases:** none. **Store kinds/commands/events/error/diagnostic codes:** none.
- **Protocol/save format:** unchanged. **HASH-CHANGING:** a new golden is committed (explained here per 06 §9.4: it is a new scenario; no existing scenario's hashes change — the cache-dirty flag affects no shipped fixture because none creates entities mid-tick outside construction, which already handled it).
- **Dependencies on archived changes:** 8.3 `add-location-establishment` (archived 2026-10-24).

## Out of Scope

- 8.6 `add-client-fog-and-expansion`: the client flows over this scenario.
- SCN-06 (exchanges) and the scripted-strategy scenario runner of M11a.
