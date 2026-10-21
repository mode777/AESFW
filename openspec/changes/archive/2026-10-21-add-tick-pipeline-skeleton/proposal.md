# Proposal

## Why

Roadmap 08, M0 item 0.6 (`add-tick-pipeline-skeleton`, capability `kernel/tick-pipeline`, size M). The world state of 0.5 is inert until a fixed, framework-owned tick pipeline runs the 33 phases of 02 §5.2 in order, with the system contract and write-set discipline of TDS-11 and ARCH-5. This row builds the walking skeleton: every later milestone fills in a phase of a structure that is already tested. It retires R-03 (tick-phase semantics are ambiguous; phase interaction bugs surface late) at the structural level. Depends on: `add-world-state-model` (0.5) — archived 2026-10-21.

## What Changes

- Add the phase table of TDS-11.1 to `@aesfw/core` (`packages/core/src/pipeline/` and `packages/core/src/systems/`): 31 system modules (`phase-01-apply-commands.ts` … `phase-31-metrics-hash.ts`), each a registered no-op `SystemDescriptor` with its canonical phase ID, name, and declared reads/writes, in the fixed order of 02 §5.2.
- Add the system contract (TDS-11.2): `SystemDescriptor` (`phase`, `name`, `reads`, `writes`, `run`), `TickContext` (`tick`, `registry`, `world`, `tx`, `events`, `scratch`, `policies`), `EventWriter` with monotonic per-tick sequence, and a per-tick `TickScratch`.
- Add `step(world, registry, input): TickOutput` (TDS-10.1) running every phase in canonical order, advancing `world.tick` to the computed tick, and returning `world`, `tick`, `events`, `outcomes`, `journal`, `hash`, and `metrics`; hashing honours `TickInput.options.hash` and journaling honours `options.journal` without changing state (TDS-10.1, TDS-11.3 rule 5).
- Add `runPhases(world, registry, phases, input)` in `@aesfw/core/testing` (TDS-10.3) running a subset of phases in canonical order inside one tick, plus the `stores(world)` and `phaseTable` test API.
- Add write-set checks in test builds (TDS-11.2, 06 §5.4): stores a system does not declare in `writes` are wrapped read-only for that system's `run`, so an undeclared write fails its own test.
- Add the placeholder seams owned by later rows as registered no-ops or typed "not supported" results: `TransactionWriter.atomic` returns a `not_implemented` diagnostic (1.7), and `PolicySet` is empty (1.8+).
- Add L1/L2 tests: every phase is registered exactly once in canonical order; an empty world steps 10,000 ticks with stable hashes; `runPhases` runs only the requested phases; a system writing an undeclared store fails; journaling/hashing do not change state.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts.

## Capabilities

### New Capabilities

- `kernel/tick-pipeline`: the fixed 33-phase pipeline, the system contract with declared reads and writes, the tick context and event writer, `step` and `runPhases`, and write-set enforcement — the structural skeleton every simulation system plugs into.

### Modified Capabilities

- None. `kernel/world-state` is unchanged.

## Impact

- **Packages:** `@aesfw/core` gains `src/pipeline/**`, `src/systems/**`, and `src/events/**`; `src/testing.ts` gains `runPhases`, `stores`, and `phaseTable`. No runtime dependency is added.
- **Tick phases:** phases 01–31 are registered no-ops; phases 32 (event ordering) and 33 (snapshot publication) remain pipeline/application responsibilities and are not system modules (TDS-11.1). **Store kinds:** no new kinds; every no-op declares empty reads/writes. **Commands/events/error codes:** `DomainEvent` and `EventWriter` are introduced; the command catalogue and outcomes are placeholders until 2.2. **Diagnostic codes:** `not_implemented` (transactions).
- **Out of scope:** the real phase behavior of every system (M1 onward: 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13, and later); the command gateway and outcomes (`add-session-and-command-gateway`, 2.2); the testkit builders and `checkInvariants` (`add-testkit-foundation`, 0.7); policy implementations (`add-abstract-capacity-locations`, 1.8); metrics content (M4+).
- **Verification impact:** the M0 exit criterion "an empty world steps 10,000 ticks with stable hashes" becomes testable in Node; the Chromium comparison is `add-browser-determinism-check` (0.9).
