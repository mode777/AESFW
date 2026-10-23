# Tasks

## 1. Projection

- [x] 1.1 [PIC-9.1] Populate `LocationDto.throughput` from the throughput pool in `project()`. Verify: projection unit test.
- [x] 1.2 [PIC-10.2] Populate `LocationSummaryDto.throughput` in the location summary read model. Verify: read-model unit test.

## 2. Client selectors and view state

- [x] 2.1 [REF-12.2] Add `throughputGauge` and `throughputOverlay` selectors and export them. Verify: selector unit tests.
- [x] 2.2 [REF-13.2] Add `'throughput'` to `GridOverlay` and map `T` in `toggleOverlay`. Verify: view-state unit test.

## 3. Client view

- [x] 3.1 [REF-12.2] Render the gauge and the throttled-entity highlight in the location grid; add the `T` legend text and i18n keys. Verify: view smoke/selector test.

## 4. Reference content

- [x] 4.1 [REF-12.2, GDD-9.7] Add `internal_logistics` to `ref.tier.location.a` and the R1 storage-module entity with capacity, throughput, maintenance, placement, and connectivity. Verify: `ref-tier.test.ts` and strict validation.

## 5. Verification

- [x] 5.1 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
