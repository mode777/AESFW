# Tasks

## 1. Panel infrastructure

- [x] 1.1 Implement `contextPanel` kind dispatch and the generic row/section panel view in the context-panel slot; verify the [REF-12.3] panel-state scenarios (switching, build-menu fallback).
- [x] 1.2 Share one rate-formatting helper (per-minute at resource scale) across panels; verify its unit test [REF-12.3].

## 2. Panels

- [x] 2.1 Build the residence panel (need bars with contributions, Z and band, advancement checklist with sustained progress, purpose-lock switches, `RequestPopulationTransition`); verify the [REF-12.3] residence scenarios.
- [x] 2.2 Widen `entityInspector` into `producerPanel` (rates per minute, capability request/allocation, maintenance, paused-by-deficit) and render it; verify the [REF-12.3] producer scenarios.
- [x] 2.3 Extend `inventoryRows` (lock state, net rate) and build the hub panel with throughput and `SetInventoryPolicy`; verify the [REF-12.3] hub scenarios.
- [x] 2.4 Build the transport unit panel from the logistics detail selector with assign/unassign; verify the [REF-12.3] transport scenario.
- [x] 2.5 Build the location panel (knowledge gating, region/ownership/slots/suitability, activation commands, explore/establish hand-off); verify the [REF-12.3, PIC-9.3] location scenarios.

## 3. Status markers and removals

- [x] 3.1 Implement floating block-reason markers in the status-marker layer (location level and deeper, culled at world level); verify the [REF-10.3] marker scenarios.
- [x] 3.2 Delete the inspector view and standalone population table; re-point table mode at the shared `inventoryRows`; verify table mode still renders inventory and population tables [REF-15, PIC-17].
- [x] 3.3 Update selector tests for widened signatures and removed views; run smoke flows 2 and 4 against the panels; verify green [VER-13.2].

## 4. Documentation and verification

- [x] 4.1 No 01–07 amendment expected; record any clarification (e.g. marker culling) here.
- [x] 4.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections.
