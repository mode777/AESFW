# Design — add-tick-pipeline-skeleton

## Context

0.5 is archived: `World`, component stores, allocators, and the codec exist. There is no pipeline. What the pipeline must contain and how it runs is fixed by TDS-10, TDS-11, and ARCH-5; this document records only the choices TDS leaves open.

## Goals / Non-Goals

**Goals:** every phase of 02 §5.2 is a registered system module in canonical order; the system contract, tick context, and event writer are in place; `step` and `runPhases` run phases deterministically and hash an empty world stably; write-set checks fail undeclared writes; later-row behavior is a registered no-op or a typed not-supported result; `@aesfw/core` stays at zero runtime dependencies.

**Non-Goals:** the real behavior of any system (M1 onward); the command gateway and outcomes (2.2); testkit builders and `checkInvariants` (0.7); transaction and policy implementations (1.7, 1.8+); metrics content; browser-mode determinism (0.9).

## Decisions

### D1 — Module layout

`packages/core/src/pipeline/` holds `types.ts` (the system contract and tick I/O), `phase-table.ts`, `step.ts`, `scratch.ts`, `policies.ts`, `tx.ts`, `write-set.ts`, and `index.ts`. `packages/core/src/events/` holds `event-writer.ts`. `packages/core/src/systems/` holds one module per phase, `phase-01-apply-commands.ts` … `phase-31-metrics-hash.ts`, each exporting a no-op `SystemDescriptor`. `src/testing.ts` re-exports `runPhases`, `stores`, `phaseTable`, and the `runSystem` harness.

### D2 — Phase IDs, descriptors, and the fixed order

`PhaseId` is the numeric union `1..31`. `PHASE_TABLE` is the array of the 31 descriptors in ascending phase order, each with the name from TDS-11.1; `phaseTable` is that array (frozen). Phases 32 and 33 are not system modules: events are already ordered when returned, and snapshot publication happens in `@aesfw/app` after `step` (amendment A2). `runPhases` iterates `PHASE_TABLE` and runs the descriptors whose phase is in the requested set, so canonical order is guaranteed without sorting the caller's list.

### D3 — Write-set guard by scoping `world.stores`

For each system, `runSystem` builds a `TickContext` and temporarily replaces `world.stores` with a guarded `ComponentStores` view whose `get(kind)` returns the real store when `kind` is in the descriptor's `writes`, and a read-only proxy otherwise (its `set`, `markRemoved`, and `compact` throw `InvariantViolation('write_set_violation')`). The original container is restored in a `finally`. Because the context holds the real `world`, mutations to declared stores and to world-level fields persist; the guard covers exactly what TDS-11.2 names. This check runs in all builds for M0 (there is no separate production build yet); the design notes it may be gated behind a build flag once hosts exist.

### D4 — `step` and `runPhases` semantics

Both compute `tick = world.tick + 1`, build one event writer and one scratch for the tick, run the selected phases, set `world.tick = tick`, and return a `TickOutput`. `step` runs all 31 phases; `runPhases` runs the requested subset (TDS-10.3). `world` is returned as the same reference (owned mutation, TDS-5.2). `TickInput.commands` is accepted and ignored in M0 because phase 01 is a no-op; `outcomes` is therefore `[]`. `hash` is `hashWorld(world, registry)` when `options.hash` is true, else `null`; `journal` is `[]` when `options.journal` is true, else `null`; neither option affects state. `metrics` is an empty object until metric recording exists.

### D5 — Event writer

`createEventWriter(tick)` keeps an array and a counter. `emit(event)` appends `{ ...event, tick, seq: counter++ }`; `events` is the accumulated array. The writer is per-tick and never persisted. `DomainEvent` is the shape of TDS-17 with `type: string` and `payload: JsonValue`; the event-type union is finalized when systems emit events.

### D6 — Per-tick scratch

`createTickScratch()` returns a `TickScratch` backed by a `Map<string, unknown>`, reset every tick (a fresh instance per tick), never saved. Typed accessors for phase pairs arrive with the phases that use them (1.9+); M0 systems use none.

### D7 — Placeholder seams

`TickContext.tx` is a `TransactionWriter` whose `atomic` returns `err({ code: 'not_implemented', ... })` until 1.7. `PolicySet` is `Readonly<Record<string, never>>` with an empty default until the policy rows. Both are typed, not thrown, so a no-op pipeline never fails.

### D8 — Testing entry additions

TDS-10.3 lists `runPhases`, `stores`, `phaseTable`, and `deepFreeze`. This change adds `runSystem(descriptor, world, registry, input)` so a test can exercise one descriptor with write-set checks. Recorded as amendment A-05.

## Amendments and clarifications to 01–07

- **A-05 (clarification, additive):** TDS-10.3's test API code block gains `runSystem(descriptor: SystemDescriptor, world: World, registry: Registry, input: TickInput): TickOutput;` with a sentence that it runs a single registered or test descriptor with write-set checks, used by `@aesfw/testkit` from 0.7. No conflict with 01–04 was found.

## Risks / Trade-offs

- [Temporarily swapping `world.stores` could surprise a system that captured the container earlier] → systems receive the context per run and must not retain state between ticks (TDS-11.2); the guard is restored in a `finally`.
- [Write-set checks always on in M0] → negligible for no-ops; gating arrives with the host build flags.
- [Placeholder `CommandOutcome`/`Transaction`/`TickMetrics` types are loose] → they are `JsonValue` aliases refined by 1.7 and 2.2; no save or golden format depends on them yet.
- [Hash computed after phase 31 rather than inside it] → phase 31 is a no-op in M0; moving metric/hash recording into the system is a later change that must keep hashes identical.

## Migration Plan

Additive source and test files inside `@aesfw/core`; no state, save, protocol, or golden artifacts exist. Rollback is reverting the change.

## Open Questions

None blocking.
