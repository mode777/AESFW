# Design

## Context

1.6 shipped the condition compiler, evaluator, curves, and domain queries with `sustained` deliberately absent (roadmap 1.6, expr.ts comment). The world already declares `timers: SustainedTimerTable` (TDS-5.3, TDS-14.3) and the v1 codec encodes and decodes it; phase 22 is a registered no-op. Conditions are consumed in core only through injected evaluators (`PlacementConditionEvaluator`, design D4 of 1.6) because the `Expr` tree lives in `@aesfw/content`.

## Goals / Non-Goals

- Goals: `sustained` compiles and type-checks; timers are updated in phase 22 with deterministic scope and ordering; timers are deleted for removed subjects in phase 30; timers persist, hash, and clone.
- Non-Goals: satisfaction bands (7.2), transition and unlock scopes (7.3, 7.5), timer progress in projections (7.7), any new command or event.

## Decisions

### D1 — Expression node and slot assignment

`Expr` gains `{ t: 'sustained'; ticks: Int; slot: TimerSlot; inner: Expr }` (TDS-14.1). The compiler accepts the YAML shape `sustained: { ticks, condition }` from CONT-7.2/7.3 (key `condition`, not `inner`). `ticks` must be a safe integer `>= 1`, else the new diagnostic `condition_ticks_invalid`; the inner expression must have type `bool`. The result type is `bool`.

`TimerSlot` is the per-condition pre-order index of the `sustained` node in the compiled tree, assigned by a single counter reset at the root of each condition definition. This is deterministic, independent of map iteration, and stable for a given content package. A helper `sustainedSlots(root): readonly number[]` returns the used slots in pre-order; phase 22 and the evaluator-adjacent tooling use it.

### D2 — Evaluation reads timers

`EvalContext` gains `readonly timer: (slot: number) => number` returning `consecutiveTrueTicks` for the evaluating `(condition, slot, subject)` triple. `sustained` evaluates to `timer(slot) >= ticks` and never touches `inner` (TDS-14.3 "reading `sustained` anywhere"). The context builder closes over the condition handle and subject, so evaluator call sites stay unchanged. Existing and new callers wire `timer` as follows:

- app placement/source evaluator: reads `world.timers` for `(condition, slot, subject)`;
- core's default (`ALWAYS_TRUE_CONDITION` and tests without content): `() => 0`, so `sustained` never holds;
- phase 22's inner evaluation: reads the timer's current value before the update.

### D3 — Phase 22 via an injected updater (extends design D4 of 1.6)

Core cannot interpret `Expr`, so phase 22 calls an injected `SustainedTimerUpdater` carried on `TickInput`/`TickContext`, exactly like `conditionEvaluator`:

```ts
type SustainedTimerUpdater = (ctx: TickContext) => void;
```

`@aesfw/content` provides `buildSustainedTimerUpdater(content: CompiledContent): SustainedTimerUpdater`; `session.advance` passes it next to the condition evaluator. Omitted (core default): a no-op, so pure core tests and existing fixtures are unaffected. The descriptor declares `writes: ['timers']` and the write-set guard covers the injected mutation because it runs inside `runOne`.

### D4 — Subject scopes (v1)

The updater enumerates conditions in ascending handle order via `handlesOf('condition')`, skips conditions without `sustained` nodes, and derives subjects from the usages the registry knows today:

- an entity definition's `resource_source.condition` reference → subjects are the entities carrying that `resourceSource` component (ascended by entity id), regardless of enabled or paused state: the timer tracks continuous truth of the inner expression, which is usually about the world, not the entity's activity;

Scopes owned by later rows (residence-of-source-tier for transitions 7.3, owners for unlocks 7.5) are absent in v1; a condition with only those usages has no phase 22 scope yet and its timers stay empty. Placement-condition usages evaluate against query subjects and intentionally get no timer updates; a `sustained` inside a placement condition therefore never holds in v1 (recorded as a clarification below). Conditions referenced from several usages union their scopes, deduplicated by subject.

### D5 — Update rule and ordering

For each `(condition, slot)` in ascending order, for each subject in ascending entity id: evaluate `inner` with `timer` returning the stored value; write `previous + 1` when it holds, else `0`. Zero-count rows are kept (reset, not delete) so a later `true` resumes from `1` and save/hashing stays a pure table rewrite; phase 30 removes rows of removed subjects. The resulting table is rebuilt in `(condition handle, slot, subject)` order, matching the documented total order of `SustainedTimerTable`.

### D6 — Phase 30 cleanup

`finalizeLifecycle` additionally filters `world.timers` to subjects that still exist. It runs after component-store compaction and uses the same existence check, so no new store enumeration is needed. Declared `writes` gains `'timers'`.

### D7 — Persistence

The v1 codec already encodes/decodes `timers` and the hash covers the table; no format change. A save-continue test asserts hash equality with an uninterrupted run. **No golden changes**: no shipped fixture uses `sustained`, so all existing hashes are unchanged and no versioned algorithm tag is bumped.

## Clarifications recorded (no normative amendment)

- 05 §14.3's scope list ("residences of the transition's source tier, owners for unlocks, …") is open-ended; this change records that v1 scopes are the entity-component usages and that a `sustained` node inside a placement condition has no phase 22 scope and never holds. 7.3 and 7.5 add their scopes in their own changes.

## Risks / Open Questions

- Per-tick cost: phase 22 evaluates inner expressions per (condition, slot, subject); with v1 usages this is bounded by source entities and is comparable to phase 07. Revisited by the M7 benchmark note.
- Slot stability: slots are compile-order-derived; reordering a content YAML changes slot numbering but timers are runtime state, not save-migrated content, so no migration concern in v1 (save compatibility across content changes is a content-mismatch, not a migration).
