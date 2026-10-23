# Design

## Context

The scenario runner executes content without commands, so SCN-04 must be self-playing: the fixture's economics alone must enter deficit and recover. The deficit policy (4.3) pauses maintenance payers while the balance is negative and resumes them when it recovers; income accrues from population even while producers are paused, which is the recovery engine.

## Decisions

### D1 — Deficit-prone fixture economics

`demo-loss-spiral` mirrors `demo-economy`'s shape (credits with `allow_negative`, capability, source → producer → need, residence with a satisfaction-curved income) but with maintenance priced above income: income is `10` credits per population per tick (population 2 → `20`/tick at full satisfaction) while the producer's maintenance is `500` per `10` ticks (`50`/tick). The first interval charge forces a deficit; the deficit policy pauses the producer; starving the need drags satisfaction and income down; the paused world still earns population income, which recovers the balance until automatic resume — and the cycle repeats. Population growth shortens the cycle over the run.

### D2 — Assertions

The host-node test checks three properties: findings empty (invariants every tick), at least one pause and one resume event (recovery, not stagnation), and golden equality. The golden is created by this change — creation, not modification, so no existing hash changes and no `pnpm golden:update` touches other scenarios.

## Risks / Trade-offs

- [The cycle depends on tuned economics] → the assertions do not depend on cycle timing, only that pause and resume both occur within 600 ticks; the golden pins the exact trajectory.

## Migration Plan

New fixture, scenario, and golden only. No existing scenario or golden changes.

## Open Questions

None.
