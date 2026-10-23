# Design

## Context

The scenario runner loads a content package, instantiates the default world and content entities, steps the pipeline, records hashes, and runs `checkInvariants`. The existing `demo-basic-loop` and `demo-loss-spiral` fixtures have no `internal_logistics`, so they cannot exercise phase 10. The golden tool (`pnpm golden:update`) writes a `.hashes.json` from a CLI run.

## Goals / Non-Goals

- Goals: a deterministic, theme-free SCN-10 fixture that forces over-capacity requests and observable throttling; a committed golden; a regression test.
- Non-Goals: client visibility (5.4), transport requests (M6), reference content (M11).

## Decisions

### D1 — Fixture shape

`fixtures/content/demo-throughput/content.yaml` defines:

- `demo.location.a`: abstract capacity `100`, one shared inventory, and
  `internal_logistics: { policy: framework.inventory.throughput_limited, base_throughput: 1000 }`.
- `demo.entity.source_a` and `demo.entity.source_b`: infinite sources, each `800` per tick of `demo.resource.source`.
- `demo.entity.refiner`: a batch producer, `10` ticks, `800` input → `800` output.

At tick 1 the two sources request `1600` against capacity `1000`, so both are throttled to `500` permille and deposit `400` each. The refiner starts (full reservation, all-or-nothing) and at its completion tick requests `1600` (input plus output) alongside the sources' `1600`; the pool throttles all three proportionally and the refiner commits and deposits the scaled amounts. This makes both the source path and the producer path visible in the hash and in `ThroughputThrottled` events.

The fixture uses only `demo.*` IDs and no reference codes (theme-free rule).

### D2 — Golden scope

The scenario runs `120` ticks with `hash_interval: 10`, invariants enabled, and a committed `throughput_throttling.hashes.json`. The hash is the standard `fnv1a64-canonical-json-v1`. Because the fixture opts into `internal_logistics`, the two throughput stores are populated and hashed; that is the intended new golden. No existing golden changes.

### D3 — Assertions

The host test asserts:

1. the CLI exits `0` and `findings` is empty;
2. at least one `ThroughputThrottled` event exists;
3. every recorded checkpoint equals the golden and the counts match;
4. a second run produces byte-identical CLI output.

The event assertion is deliberately structural (at least one event) rather than exact-count, so content tuning does not make the test brittle; the golden pins the exact sequence.

## Risks / Trade-offs

- [A small fixture may not exercise the producer throttle path] → the refiner's completion tick adds its request to the same pool as the sources, so the producer path is exercised and its scaled output affects the hash.
- [Golden churn when 5.4 adds reference content] → this fixture is independent of `ref.tier`; only changes to the fixture or throughput algorithm change it, and those require an explained hash change (06 §9.4).

## Migration Plan

New files only. Existing scenarios and goldens are untouched. `pnpm golden:update fixtures/scenarios/throughput_throttling.yaml` generates the committed golden once, reviewed with the explained reason above.

## Open Questions

None.
