# Design

## Context

The scenario runner (6.7) applies scenario commands through the real gateway, so a trade order can be created, assigned, and executed declaratively. The `demo-exchanges` package (9.1, extended in 9.2) has one exchange with one good (buy base `1000`, sell base `800`, step `100` quantity, `100` permille steps, recovery `200` permille per `5`… scaled fixture values) and one connected outpost.

## Goals / Non-Goals

- Goals: the self-playing SCN-06 fixture, its golden, and the consumer test.
- Non-Goals: client rendering (9.5), reference content (M11), new mechanics.

## Decisions

### D1 — Buy phase funds and demonstrates the buy direction

The unit starts empty, so the scenario first buys `400` (four handled steps of `100` at the `100` per tick rate) with owner starting credits from the world definition's `initial_resources`. This demonstrates buys raising the purchase price (`12000 → 13200 → 14400 → 15600`) and funds the sale phase — no fixture-only cargo seeding mechanism is added.

### D2 — Recovery is observed through a second sale

The report exposes events and hashes only, so recovery is demonstrated observably: after the sell phase (`8000 → 7200 → 6400`), the scenario idles through the recovery intervals (fixture: `200` permille of base per `5` ticks, so the first interval after the sell phase raises `6400` back to `8000`) and a final sell of `100` executes at the recovered `8000`. The `Traded` price sequence in the report is therefore the SCN-06 assertion: `12000, 13200, 14400, 15600, 8000, 7200, 6400, 8000`.

### D3 — Fixture scaling

The fixture uses the documented example's base prices (`12000` buy / `8000` sell) with a `100`-quantity step and a fast `200`-permille-per-`5`-ticks recovery so the whole scenario fits in 25 ticks. Hash checkpoints every `5` ticks; invariants after every tick.

## Clarifications recorded (no normative amendment)

- The scenario format needs no new fields; commands at fixed ticks suffice (D1/D2).
- The golden is new-file only; no shipped golden changes (06 §9.4).

## Risks / Open Questions

- None known; the runner, gateway, and mechanics are archived work.
