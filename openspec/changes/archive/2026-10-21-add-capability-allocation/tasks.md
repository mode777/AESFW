# Tasks

## 1. Types and supply (design D1–D3)

- [x] 1.1 Create `packages/core/src/sim/capabilities/types.ts` with the provider, consumer, allocation, scope, and model types.
- [x] 1.2 Create `packages/core/src/sim/capabilities/supply.ts` with `buildCapabilitySupply`.
- [x] 1.3 Create `packages/core/src/sim/capabilities/index.ts` and export from `packages/core/src/index.ts`.

## 2. Allocation models (design D5)

- [x] 2.1 Create `packages/core/src/sim/capabilities/models.ts` with binary, proportional, priority, and weighted allocation over an ascending request list.

## 3. Allocation and phases (design D4, D6)

- [x] 3.1 Create `packages/core/src/sim/capabilities/allocate.ts` with `allocateCapabilities` (grouping, substitutes, allocation publishing, shortage events).
- [x] 3.2 Implement `phase-05-rebuild-capability-supply.ts` and `phase-06-allocate-capabilities.ts` and register their reads/writes.

## 4. Tests — models (design D5)

- [x] 4.1 Add `packages/core/src/sim/capabilities/models.test.ts` with one test per model scenario. [GDD-14.2, TDS-6.3]

## 5. Tests — phases (design D3, D4, D6)

- [x] 5.1 Add `packages/core/src/sim/capabilities/capabilities.test.ts` with `runPhases([5, 6])` covering supply aggregation, scope separation, exact matching, substitutes, ordering, zero-request exclusion, shortage events, and INV-05. [GDD-14.1, GDD-14.2, GDD-4.7, ARCH-13, INV-05]

## 6. Invariants (design D7)

- [x] 6.1 Extend `packages/testkit/src/harness/invariants.ts` with INV-05 and add its tests. [VER-6, INV-05]

## 7. Documentation and verification

- [x] 7.1 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive).
- [x] 7.2 Confirm no amendment to 01–07 is required.
- [x] 7.3 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. [GDD-14, GDD-4.7, ARCH-13, TDS-6.3, INV-05]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 1.9 with "✓ archived <date>" in `docs/08`.
