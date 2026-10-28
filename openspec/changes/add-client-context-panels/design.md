# Design

## Context

See proposal.md "Why". The inspector selectors (`entityInspector`, `needRows`, `inventoryRows`, `populationRows`), the transition-checklist and purpose-lock selectors, and the logistics unit-detail view already exist and are tested; 11.4a gave the HUD a context-panel slot; 11.4b gives canvas selection and the status-marker layer; 11.4c owns the build-menu half of the slot.

## Goals / Non-Goals

**Goals:**

- One panel per selection kind, per REF-12.3, reusing the existing selectors wherever possible.
- Panels are view models from pure selectors — the unit-tested surface (06 §13.1).

**Non-Goals:**

- Windows (11.4e); hints from block reasons (11.4f); Tab cycling and aria labelling beyond the existing `role="img"` hooks (11.4); new read models or protocol fields.

## Decisions

### D1. One panel registry, kind-dispatched

`contextPanel(selection, mirror, presentation)` dispatches on the selection kind (entity archetype vs hub entity vs transport vs location) and returns the panel view model; the view is one component that renders rows/sections generically (labels, values, bars, buttons) from the model. Panels share no state; each renders from its selector output keyed by revision.

- *Alternative: five view components.* More DOM code for the same model; the row/section renderer is small; rejected.

### D2. Panel content mapping to existing selectors

- Residence: `needRows` (extended with category contribution — the need breakdown DTO already carries the category; a pure projection), transition-eligibility checklist (7.7), purpose-lock switches (7.4 selectors), tier/capacity from the location summary and the residence's population component in entity detail.
- Producer/service: `entityInspector` widened to `producerPanel` (adds per-minute rates via presentation formatting, capability request/allocation, maintenance fields — all in `EntityDetailDto`/PIC-10.1 today).
- Hub: `inventoryRows` (extended with lock state + net rate from the location summary), throughput gauge data.
- Transport: the logistics unit-detail selector, re-rendered as a panel.
- Location: snapshot location fields, activation commands; the explore/establish button delegates to the same prefilled-draft path as the canvas island selection (unchanged until 11.4e).

### D3. Floating status markers

Markers derive from the same `stateEncoding` pass the canvas glyphs use: one marker per entity with non-empty block reasons, positioned above the shape's cell, carrying the first reason's glyph. They live in the status-marker layer (11.4b), mount at location level and deeper, and are plain SVG text on a small plate — no icons (REF-9 principle 4).

### D4. Removing the standalone tables

`populationRows` disappears as a dashboard view; its data source (location summaries) feeds the minimap strip (already 11.4b) and the residence panel. Table mode keeps rendering inventory and population tables (04 §17) from the same selectors, so `inventoryRows` stays shared between the hub panel and table mode.

### D5. Commands per panel

Each panel builds its command payloads through the existing pure payload builders (7.4, 7.9, 6.9); no panel computes mechanics; rejections flow into the notice path (11.4a) and later hints (11.4f).

## Risks / Trade-offs

- [Five panels in one slot risk layout overflow] → the panel scrolls internally; sections collapse to headers when taller than the slot; fixed HUD geometry is untouched.
- [Producer panel rate formatting drifts from the hub panel] → one rate-formatting helper in i18n/formatting used by both; tested once.
- [Panel churn on every delta] → selectors memoize by revision; sections re-render only on changed rows (keyed reconciliation).

## Migration Plan

- The inspector view and standalone tables are deleted with their container tests; selectors are renamed/widened in place with callers updated. Rollback = revert.
