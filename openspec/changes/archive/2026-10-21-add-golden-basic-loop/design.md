# Design — add-golden-basic-loop

## Context

`add-population-growth` (1.13) and `add-scenario-runner-and-cli` (1.14) are archived: every M1 phase is implemented, the scenario runner and CLI exist, and the default world plan instantiates locations and inventories. The runner does not yet instantiate entity definitions, so a scenario with only a location has nothing to produce. This document records the fixture, the content-to-component resolver, and the golden policy.

## Goals / Non-Goals

**Goals:** the SCN-01 fixture content, entity instantiation, the scenario, the golden hashes, and the update tool.

**Non-Goals:** command application (2.2), metrics and expectations (M2+), the browser client (2.x), other scenarios.

## Decisions

### D1 — Fixture content

`fixtures/content/demo-basic-loop` is theme-free (`demo.` namespace) and mirrors CONT-14: an infinite-rate source of `demo.resource.source`, a batch recipe producing `demo.resource.need` and requiring `demo.capability.tier_1`, a population tier outputting `demo.capability.tier_1` and needing `demo.resource.need`, and a growth policy. The condition is the M1-valid `aggregate_need_fulfillment ≥ 800` (the query table does not yet include `available_population_capacity`).

### D2 — Content entity instantiation

`instantiateContentEntities(world, registry)` runs after `instantiateWorld` in the runner. It uses the first location's first inventory as the shared inventory and maps each `entity_definitions` entry: `resource_source` to a `resourceSource`, `producer` to a `producer` plus a `capabilityConsumer` for its first recipe's capability requirement, and `residence` to a `residence`, `populationGroup`, and `growth`. It resolves recipes, tier outputs, needs, categories, and growth policies from the compiled definitions. The growth policy's condition is mapped to the v1 `GrowthCondition`: increase to `minSatisfaction 800, requireCapacity`, decrease to `maxSatisfaction 250`. This is the same v1 interpretation recorded by 1.13 and keeps the core content-free (TDS-4.3).

### D3 — Scenario and goldens

`fixtures/scenarios/basic_loop.yaml` runs the fixture for 600 ticks with invariants and a hash interval of 1. `fixtures/scenarios/basic_loop.hashes.json` stores `{ algorithm, scenario, checkpoints }`. The host-node test runs the scenario through the CLI and compares every checkpoint. The loop is verified behaviourally: needs are fulfilled and the population grows.

### D4 — Golden update tool

`tools/golden/index.mjs` (`pnpm golden:update`) runs the scenario through the CLI and rewrites the hash file with the `fnv1a64-canonical-json-v1` tag. It is never invoked by CI (VER-9.4).

### D5 — Hash policy

No earlier goldens exist, so this change establishes the first golden. Any later change that alters the hashes must explain why (new phase behaviour, algorithm version bump, or content change) per VER-9.4.

## Amendments and clarifications to 01–07

- None.

## Risks / Trade-offs

- [The growth condition is a fixed v1 mapping] → M1 content uses satisfaction thresholds; 7.2 generalises.
- [The resolver assumes one location and one shared inventory] → the M1 default; 6.1 generalises the world definition.
- [The fixture uses `aggregate_need_fulfillment`] → the `available_population_capacity` query of CONT-14 is not in the M1 query table; the condition keeps the same intent.

## Migration Plan

Additive fixtures, a resolver in the scenario runner, and the golden tool. No production code outside testkit/host-node changes. Rollback is reverting the change.

## Open Questions

None blocking.
